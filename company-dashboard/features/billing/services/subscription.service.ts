import { createServerClient } from "@supabase/ssr";
import { eventBus } from "@/features/platform-core";
import { randomUUID } from "crypto";
import { PLATFORM_PRICING_PLANS } from "@/types/super-admin/billing";

export class SubscriptionService {
  /**
   * Handles Stripe subscription creation or update.
   */
  public async handleSubscriptionUpsert(
    stripeCustomerId: string,
    stripeSubscriptionId: string,
    planId: string,
    status: string,
    currentPeriodEnd: Date
  ): Promise<void> {
    const supabase = this.getClient();

    // 1. Resolve company by Stripe Customer ID
    const { data: company, error: companyError } = await supabase
      .from("companies")
      .select("id")
      .eq("stripe_customer_id", stripeCustomerId)
      .single();

    if (companyError || !company) {
      console.error(`[SubscriptionService] Unmapped Stripe Customer: ${stripeCustomerId}`);
      return;
    }

    const companyId = company.id;

    // 2. Fetch old subscription to determine upgrade/downgrade
    const { data: oldSub } = await supabase
      .from("tenant_subscriptions")
      .select("plan_id, status")
      .eq("company_id", companyId)
      .single();

    // 3. Upsert Subscription Record
    const { error: upsertError } = await supabase
      .from("tenant_subscriptions")
      .upsert({
        company_id: companyId,
        stripe_subscription_id: stripeSubscriptionId,
        plan_id: planId,
        status: status,
        current_period_end: currentPeriodEnd.toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: "company_id" });

    if (upsertError) throw new Error("Failed to upsert subscription");

    // 4. Update Entitlements (Refresh cached quotas based on new plan)
    await this.refreshTenantEntitlements(companyId, planId);

    // 5. Emit Domain Events
    if (!oldSub) {
      await eventBus.publish({
        eventId: randomUUID(),
        eventType: "subscription.created",
        schemaVersion: 1,
        producerDomain: "billing",
        tenantId: companyId,
        actorId: "system",
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        payload: { companyId, planId, status },
        metadata: { source: "webhook", environment: "production" }
      });
    } else if (oldSub.plan_id !== planId) {
      await eventBus.publish({
        eventId: randomUUID(),
        eventType: "subscription.updated",
        schemaVersion: 1,
        producerDomain: "billing",
        tenantId: companyId,
        actorId: "system",
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        payload: { 
          companyId, 
          oldPlanId: oldSub.plan_id, 
          newPlanId: planId,
          effectiveDate: new Date().toISOString()
        },
        metadata: { source: "webhook", environment: "production" }
      });
    }
  }

  private async refreshTenantEntitlements(companyId: string, planId: string): Promise<void> {
    const supabase = this.getClient();
    const plan = PLATFORM_PRICING_PLANS.find(p => p.id === planId);
    if (!plan) return;

    // Clear old explicit entitlements and recreate base limits. 
    // In a mature system, add-ons are preserved.
    await supabase.from("tenant_entitlements").delete().eq("company_id", companyId);
    
    // Explicit overrides can be inserted here if needed.
  }

  private getClient() {
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      }
    );
  }
}

export const subscriptionService = new SubscriptionService();
