// features/analytics/services/aggregation.service.ts
import { supabase } from "@/lib/supabase/client";

export interface AnalyticsSnapshot {
  id: string;
  total_mrr: number;
  total_tenants: number;
  active_tenants: number;
  open_tickets: number;
  moderation_queue_depth: number;
  snapshot_date: string;
  created_at: string;
  churn_rate?: number;
  new_tenants_30d?: number;
  avg_revenue_per_tenant?: number;
}

export const aggregationService = {
  /**
   * Fetch daily analytics snapshots.
   */
  async getSnapshots(days: number = 30): Promise<AnalyticsSnapshot[]> {
    const { data, error } = await supabase
      .from("analytics_snapshots")
      .select("*")
      .order("snapshot_date", { ascending: false })
      .limit(days);

    if (error) throw new Error(`aggregationService.getSnapshots: ${error.message}`);
    // Return chronologically for charts
    return (data as AnalyticsSnapshot[]).reverse() ?? [];
  },

  /**
   * Calculate plan distribution counts directly from subscriptions table.
   */
  async getPlanDistribution(): Promise<Record<string, number>> {
    const { data, error } = await supabase
      .from("tenant_subscriptions")
      .select("plan_id");

    if (error) throw new Error(`aggregationService.getPlanDistribution: ${error.message}`);

    return data.reduce((acc: Record<string, number>, sub: { plan_id: string }) => {
      acc[sub.plan_id] = (acc[sub.plan_id] || 0) + 1;
      return acc;
    }, {});
  },
};
