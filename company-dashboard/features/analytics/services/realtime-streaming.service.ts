import { createServerClient } from "@supabase/ssr";
import { eventBus } from "@/features/platform-core";
import { ListingInteractionEvent } from "@/types/contracts/events/marketplace.events";

export class RealtimeStreamingService {
  private activeUsers = new Map<string, number>(); // tenantId -> count

  constructor() {
    // Listen to real-time interaction events
    eventBus.subscribe<ListingInteractionEvent["payload"]>("listing.interaction", (event) => {
      this.handleInteraction(event.payload, event.tenantId);
    });
  }

  /**
   * Processes a live interaction and broadcasts it to the tenant's realtime dashboard channel.
   */
  private handleInteraction(payload: ListingInteractionEvent["payload"], tenantId: string | null) {
    if (!tenantId) return;

    // 1. Maintain in-memory metrics (e.g. active users)
    // Note: In a multi-instance edge deployment, this state is localized. 
    // For global accurate live counts, Redis or Supabase Realtime Presence should be used.
    
    // 2. Broadcast live metric tick
    const supabase = this.getClient();
    supabase.channel(`admin:analytics:${tenantId}`).send({
      type: "broadcast",
      event: "live_interaction",
      payload: {
        action: payload.action,
        listingId: payload.listingId,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Broadcasts a system-wide metric update to super admins.
   */
  public broadcastSystemMetric(metricName: string, value: unknown) {
    const supabase = this.getClient();
    supabase.channel("admin:analytics:system").send({
      type: "broadcast",
      event: "system_metric_tick",
      payload: {
        metric: metricName,
        value,
        timestamp: new Date().toISOString()
      }
    });
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

export const realtimeStreamingService = new RealtimeStreamingService();
