import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14'

/**
 * Stripe Webhook Controller — Tenant Subscription Sync
 *
 * Handles Stripe webhook events for subscription lifecycle management.
 * Validates webhook signatures, maps events to tenant plans, and
 * updates billing.subscriptions + quota_usage accordingly.
 *
 * Spec Reference: Spec 36, Section 11 — Billing Prompt Pack
 *                 Spec 30, Section 6 — Integration Contracts
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, stripe-signature',
}

// Map Stripe price IDs to plan keys
const STRIPE_PRICE_TO_PLAN: Record<string, string> = {
  [Deno.env.get('STRIPE_PRICE_PRO_MONTHLY') ?? '']:       'pro',
  [Deno.env.get('STRIPE_PRICE_BUSINESS_MONTHLY') ?? '']:  'business',
  [Deno.env.get('STRIPE_PRICE_ENTERPRISE_MONTHLY') ?? '']: 'enterprise',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
  const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!stripeSecretKey || !stripeWebhookSecret) {
    console.error('[stripe-webhook] Missing Stripe configuration')
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), { status: 500 })
  }

  const stripe = new Stripe(stripeSecretKey, { apiVersion: '2024-04-10' })

  // 1. Validate Stripe webhook signature
  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing stripe-signature header' }), {
      status: 400,
      headers: corsHeaders,
    })
  }

  let event: Stripe.Event
  try {
    const body = await req.text()
    event = await stripe.webhooks.constructEventAsync(body, signature, stripeWebhookSecret)
  } catch (err) {
    const error = err as Error
    console.error('[stripe-webhook] Signature validation failed:', error.message)
    return new Response(JSON.stringify({ error: `Webhook signature invalid: ${error.message}` }), {
      status: 400,
      headers: corsHeaders,
    })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // 2. Route to event handlers
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionChange(supabaseAdmin, event.data.object as Stripe.Subscription)
        break

      case 'customer.subscription.deleted':
        await handleSubscriptionCanceled(supabaseAdmin, event.data.object as Stripe.Subscription)
        break

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(supabaseAdmin, event.data.object as Stripe.Invoice)
        break

      case 'invoice.payment_failed':
        await handlePaymentFailed(supabaseAdmin, event.data.object as Stripe.Invoice)
        break

      default:
        console.log(`[stripe-webhook] Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const error = err as Error
    console.error('[stripe-webhook] Handler error:', error.message)
    return new Response(JSON.stringify({ error: 'Webhook processing failed' }), {
      status: 500,
      headers: corsHeaders,
    })
  }
})

async function handleSubscriptionChange(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
): Promise<void> {
  const customerId = subscription.customer as string
  const priceId = subscription.items.data[0]?.price?.id
  const planKey = STRIPE_PRICE_TO_PLAN[priceId ?? ''] ?? 'free'

  // Look up tenant by Stripe customer ID
  const { data: tenantSub } = await supabase
    .from('billing.subscriptions')
    .select('tenant_id')
    .eq('stripe_customer_id', customerId)
    .single()

  if (!tenantSub?.tenant_id) {
    console.warn('[stripe-webhook] No tenant found for customer:', customerId)
    return
  }

  const { tenant_id } = tenantSub

  // Get plan details
  const { data: plan } = await supabase
    .from('billing.plans')
    .select('id, max_listings, max_users, max_ai_tokens')
    .eq('plan_key', planKey)
    .single()

  if (!plan) {
    console.error('[stripe-webhook] Plan not found:', planKey)
    return
  }

  // Upsert subscription record
  await supabase
    .from('billing.subscriptions')
    .upsert({
      tenant_id,
      plan_id: plan.id,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id' })

  // Update tenant plan_tier
  await supabase
    .from('tenant_config.tenants')
    .update({ plan_tier: planKey })
    .eq('id', tenant_id)

  // Reset quota usage for new billing cycle
  await resetQuotaUsage(supabase, tenant_id, plan)

  console.log(`[stripe-webhook] Subscription updated: tenant=${tenant_id} plan=${planKey}`)
}

async function handleSubscriptionCanceled(
  supabase: ReturnType<typeof createClient>,
  subscription: Stripe.Subscription
): Promise<void> {
  await supabase
    .from('billing.subscriptions')
    .update({ status: 'canceled', updated_at: new Date().toISOString() })
    .eq('stripe_subscription_id', subscription.id)

  console.log(`[stripe-webhook] Subscription canceled: ${subscription.id}`)
}

async function handlePaymentSucceeded(
  supabase: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice
): Promise<void> {
  console.log(`[stripe-webhook] Payment succeeded for invoice: ${invoice.id}`)
  // Future: record in billing.usage_events for revenue analytics
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createClient>,
  invoice: Stripe.Invoice
): Promise<void> {
  const customerId = invoice.customer as string

  await supabase
    .from('billing.subscriptions')
    .update({ status: 'past_due', updated_at: new Date().toISOString() })
    .eq('stripe_customer_id', customerId)

  console.log(`[stripe-webhook] Payment failed for customer: ${customerId}`)
}

async function resetQuotaUsage(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  plan: { max_listings: number; max_users: number; max_ai_tokens: number }
): Promise<void> {
  const now = new Date()
  const cycleEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const quotas = [
    { resource_type: 'listings', limit_amount: plan.max_listings },
    { resource_type: 'users', limit_amount: plan.max_users },
    { resource_type: 'ai_tokens', limit_amount: plan.max_ai_tokens },
  ].filter(q => q.limit_amount !== -1) // -1 means unlimited

  for (const quota of quotas) {
    await supabase
      .from('billing.quota_usage')
      .upsert({
        tenant_id: tenantId,
        resource_type: quota.resource_type,
        current_usage: 0,
        limit_amount: quota.limit_amount,
        cycle_start: now.toISOString(),
        cycle_end: cycleEnd.toISOString(),
        last_updated_at: now.toISOString(),
      }, { onConflict: 'tenant_id,resource_type,cycle_start' })
  }
}
