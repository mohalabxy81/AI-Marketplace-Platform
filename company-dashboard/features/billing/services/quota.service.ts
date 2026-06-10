/* eslint-disable @typescript-eslint/no-unused-vars */
import { createServerClient } from "@supabase/ssr";
import { eventBus } from "@/features/platform-core";
import { randomUUID } from "crypto";
import { PLATFORM_PRICING_PLANS, type QuotaUsage } from "@/types/super-admin/billing";

export class QuotaService {
  /**
   * Fetch all quota usage records for a given company.
   */
  public async getQuotaUsage(companyId: string): Promise<QuotaUsage[]> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("quota_usage")
      .select("*")
      .eq("company_id", companyId)
      .order("resource_name", { ascending: true });

    if (error) throw new Error(`quotaService.getQuotaUsage: ${error.message}`);
    return (data as QuotaUsage[]) ?? [];
  }

  /**
   * Assert a resource quota is not exceeded (returns boolean, no throw).
   * Used for pre-flight checks before provisioning resources.
   */
  public async checkQuota(
    companyId: string,
    resourceName: string
  ): Promise<{ allowed: boolean; current: number; limit: number }> {
    const supabase = this.getClient();
    const { data, error } = await supabase
      .from("quota_usage")
      .select("current_usage, limit_amount")
      .eq("company_id", companyId)
      .eq("resource_name", resourceName)
      .single();

    if (error || !data) return { allowed: true, current: 0, limit: Infinity };

    return {
      allowed: data.current_usage < data.limit_amount,
      current: data.current_usage,
      limit: data.limit_amount,
    };
  }

  /**
   * Increment quota usage by 1 for a given resource.
   */
  public async incrementUsage(companyId: string, resourceName: string): Promise<void> {
    const supabase = this.getClient();
    const { error } = await supabase.rpc("increment_quota_usage", {
      p_company_id: companyId,
      p_resource_name: resourceName,
    });
    if (error) throw new Error(`quotaService.incrementUsage: ${error.message}`);
    
    // Evaluate thresholds after incrementing
    await this.evaluateThresholds(companyId, resourceName);
  }

  /**
   * Evaluates if a company's usage for a resource has crossed alerting thresholds.
   * Emits quota.warning or quota.exceeded events.
   */
  public async evaluateThresholds(companyId: string, resource: string): Promise<void> {
    const supabase = this.getClient();

    const { data: usage } = await supabase
      .from("quota_usage")
      .select("current_usage, limit_amount")
      .eq("company_id", companyId)
      .eq("resource_name", resource)
      .single();

    if (!usage) return;

    const currentUsage = usage.current_usage || 0;
    const limit = usage.limit_amount || 0;

    if (limit === -1) return; // Unlimited

    const percentUsed = (currentUsage / limit) * 100;

    if (currentUsage >= limit) {
      await eventBus.publish({
        eventId: randomUUID(),
        eventType: "quota.exceeded",
        schemaVersion: 1,
        producerDomain: "billing",
        tenantId: companyId,
        actorId: "system",
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        payload: { companyId, resource, limit, current: currentUsage },
        metadata: { source: "system", environment: "production" }
      });
    } else if (percentUsed >= 90) {
      await eventBus.publish({
        eventId: randomUUID(),
        eventType: "quota.warning",
        schemaVersion: 1,
        producerDomain: "billing",
        tenantId: companyId,
        actorId: "system",
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        payload: { companyId, resource, percentUsed },
        metadata: { source: "system", environment: "production" }
      });
    }
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

export const quotaService = new QuotaService();
