import { createServerClient } from "@supabase/ssr";
import { eventBus } from "./event-bus.service";

export class RealtimeService {
  constructor() {
    // 1. Subscribe to notification events
    eventBus.subscribe("notification.created", this.handleNotification.bind(this));
    
    // 2. Subscribe to general platform alerts
    eventBus.subscribe("platform.alert", this.handlePlatformAlert.bind(this));
  }

  /**
   * Broadcasts a notification to a specific tenant's channel.
   * Clients subscribed to `tenant:{tenantId}:notifications` will receive it.
   */
  private async handleNotification(event: unknown) {
    const typedEvent = event as { tenantId?: string; payload?: unknown };
    if (!typedEvent.tenantId || !typedEvent.payload) return;

    const supabase = this.getClient();
    await supabase.channel(`tenant:${typedEvent.tenantId}:notifications`).send({
      type: "broadcast",
      event: "new_notification",
      payload: typedEvent.payload
    });
  }

  /**
   * Broadcasts a global platform alert (e.g. system maintenance).
   */
  private async handlePlatformAlert(event: unknown) {
    const typedEvent = event as { payload?: unknown };
    const supabase = this.getClient();
    await supabase.channel("platform:global").send({
      type: "broadcast",
      event: "alert",
      payload: typedEvent.payload
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

export const realtimeService = new RealtimeService();
