import { createServerClient } from "@supabase/ssr";
import { eventBus } from "@/features/platform-core/services/event-bus.service";
import { randomUUID } from "crypto";

export class AggregationCronService {
  /**
   * Generates a daily platform-wide snapshot of core metrics.
   * Typically triggered by a cron job at 00:00 UTC.
   */
  public async generateDailyPlatformSnapshot(dateStr: string): Promise<void> {
    const supabase = this.getClient();

    // 1. Gather total MRR
    const { data: subs } = await supabase
      .from("tenant_subscriptions")
      .select("mrr")
      .eq("status", "active");
      
    const totalMrr = subs?.reduce((sum, s) => sum + (Number(s.mrr) || 0), 0) ?? 0;

    // 2. Gather active tenants
    const { count: activeTenants } = await supabase
      .from("tenant_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("status", "active");

    const { count: totalTenants } = await supabase
      .from("companies")
      .select("*", { count: "exact", head: true });

    // 3. Gather queue depths
    const { count: moderationQueueDepth } = await supabase
      .from("moderation_queues")
      .select("*", { count: "exact", head: true })
      .in("status", ["PENDING", "ESCALATED"]);

    const { count: openTickets } = await supabase
      .from("support_tickets")
      .select("*", { count: "exact", head: true })
      .in("status", ["open", "pending"]);

    // 4. Construct snapshot
    const snapshotId = randomUUID();
    const snapshot = {
      id: snapshotId,
      total_mrr: totalMrr,
      total_tenants: totalTenants ?? 0,
      active_tenants: activeTenants ?? 0,
      open_tickets: openTickets ?? 0,
      moderation_queue_depth: moderationQueueDepth ?? 0,
      snapshot_date: dateStr,
      created_at: new Date().toISOString()
    };

    // 5. Insert into analytics_snapshots table
    const { error } = await supabase.from("analytics_snapshots").insert(snapshot);
    if (error) {
      console.error(`[AggregationCronService] Failed to save platform snapshot for ${dateStr}`, error);
      return;
    }

    // 6. Emit event
    await eventBus.publish({
      eventId: randomUUID(),
      eventType: "analytics.snapshot_generated",
      schemaVersion: 1,
      producerDomain: "analytics",
      tenantId: null,
      actorId: "system",
      timestamp: new Date().toISOString(),
      correlationId: randomUUID(),
      payload: { snapshotId, dateStr },
      metadata: { source: "system", environment: "production" }
    });
  }

  /**
   * Generates daily rollup analytics for a specific tenant.
   */
  public async generateTenantRollup(tenantId: string, dateStr: string): Promise<void> {
    const supabase = this.getClient();

    const { data: listings } = await supabase
      .from("listings")
      .select("id")
      .eq("company_id", tenantId);
    
    const listingIds = listings?.map(l => l.id) || [];
    
    if (listingIds.length > 0) {
      const { data: interactions } = await supabase
        .from("user_interactions")
        .select("action, count")
        .in("listing_id", listingIds);

      const rollup = {
        tenant_id: tenantId,
        date: dateStr,
        total_views: interactions?.filter(i => i.action === "view").reduce((sum, i) => sum + i.count, 0) || 0,
        total_clicks: interactions?.filter(i => i.action === "click").reduce((sum, i) => sum + i.count, 0) || 0,
        total_saves: interactions?.filter(i => i.action === "save").reduce((sum, i) => sum + i.count, 0) || 0,
        created_at: new Date().toISOString()
      };

      await supabase.from("tenant_analytics_rollups").upsert(rollup);
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

export const aggregationCronService = new AggregationCronService();
