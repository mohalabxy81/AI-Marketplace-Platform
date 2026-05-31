import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Auth Context Edge Function — Tenant JWT Injector
 *
 * Intercepts post-authentication hooks and enriches the user's JWT
 * app_metadata with active tenant context (tenant_id, role, plan_tier).
 *
 * Spec Reference: Spec 36, Section 3 / Spec 31, Section 4
 * Architecture Reference: PLANNER.md §1 — Zero-Trust Multi-Tenancy
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  try {
    // Parse the incoming payload from Supabase Auth webhook
    const payload = await req.json()
    const userId: string = payload?.user_id ?? payload?.record?.id

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing user_id in payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Initialize Supabase Admin client — service role bypasses RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // 1. Query the tenant_config schema for the user's active memberships
    //    Returns the most recently active membership with highest role privilege
    const { data: memberships, error: membershipError } = await supabaseAdmin
      .from('tenant_config.tenant_members')
      .select(`
        tenant_id,
        role,
        status,
        tenant_config.tenants!inner (
          id,
          plan_tier,
          status
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(10)

    if (membershipError) {
      console.error('[auth-context] Membership query error:', membershipError.message)
      // Non-fatal: user may not have a tenant yet (first-time login)
    }

    // 2. Build the enriched app_metadata object
    const activeMembership = memberships?.[0] ?? null
    const appMetadata: Record<string, unknown> = {
      tenant_id: activeMembership?.tenant_id ?? null,
      role: activeMembership?.role ?? 'viewer',
      plan_tier: (activeMembership as Record<string, unknown>)?.['tenant_config.tenants']?.['plan_tier'] ?? 'free',
      tenant_status: (activeMembership as Record<string, unknown>)?.['tenant_config.tenants']?.['status'] ?? null,
      // Include all tenant IDs for multi-workspace users
      tenant_ids: memberships?.map((m) => m.tenant_id) ?? [],
      context_injected_at: new Date().toISOString(),
    }

    // 3. Inject enriched claims into the user's JWT via admin API
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
      app_metadata: appMetadata,
    })

    if (updateError) {
      console.error('[auth-context] Failed to update user metadata:', updateError.message)
      return new Response(
        JSON.stringify({
          error: 'Failed to inject tenant context',
          detail: updateError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // 4. Log the context injection event to governance audit_logs
    await supabaseAdmin.from('governance.audit_logs').insert({
      action: 'auth.context_injected',
      actor_id: userId,
      resource_type: 'user',
      resource_id: userId,
      metadata: {
        tenant_id: appMetadata.tenant_id,
        role: appMetadata.role,
        plan_tier: appMetadata.plan_tier,
      },
    }).then(() => {
      // Fire-and-forget — don't block the response
    })

    // 5. Return success with injected context summary
    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        context: {
          tenant_id: appMetadata.tenant_id,
          role: appMetadata.role,
          plan_tier: appMetadata.plan_tier,
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  } catch (err) {
    const error = err as Error
    console.error('[auth-context] Unexpected error:', error.message)
    return new Response(
      JSON.stringify({ error: 'Internal server error', detail: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
