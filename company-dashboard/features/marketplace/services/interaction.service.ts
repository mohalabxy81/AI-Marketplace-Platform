import { createServerClient } from "@supabase/ssr";
import { TenantContext } from "@/types/contracts/tenant.context";
import { eventBus } from "@/features/platform-core/services/event-bus.service";
import { randomUUID } from "crypto";

export class InteractionService {
  /**
   * Records user interaction signals for the AI Pipeline and Analytics.
   * This operates synchronously for fast client response, while offloading
   * heavy processing to the event bus.
   */
  public async recordInteraction(
    context: TenantContext,
    listingId: string,
    action: "view" | "click" | "save" | "share" | "contact" | "purchase",
    durationSeconds?: number
  ): Promise<void> {
    const supabase = this.getClient();

    // 1. Persist directly to DB for historical aggregation
    // Assumes a user_interactions table exists
    const { error } = await supabase
      .from("user_interactions")
      .insert([
        {
          user_id: context.userId,
          company_id: context.tenantId,
          listing_id: listingId,
          action,
          duration_seconds: durationSeconds,
          created_at: new Date().toISOString(),
        }
      ]);

    if (error) {
      console.warn(`[InteractionService] Failed to record interaction to DB: ${error.message}`);
      // Non-fatal error; continue to emit event for real-time systems
    }

    // 2. Emit Domain Event for AI & Realtime Pipelines
    await eventBus.publish({
      eventId: randomUUID(),
      eventType: "listing.interaction",
      schemaVersion: 1,
      producerDomain: "marketplace",
      tenantId: context.tenantId,
      actorId: context.userId,
      timestamp: new Date().toISOString(),
      correlationId: randomUUID(),
      payload: {
        listingId,
        userId: context.userId,
        action,
        durationSeconds
      },
      metadata: { source: "api", environment: "production" }
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

export const interactionService = new InteractionService();
