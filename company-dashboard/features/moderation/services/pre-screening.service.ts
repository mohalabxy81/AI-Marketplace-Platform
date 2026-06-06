import { createServerClient } from "@supabase/ssr";
import { eventBus } from "@/features/platform-core";
import { randomUUID } from "crypto";
import { ListingCreatedEvent, ListingUpdatedEvent } from "@/types/platform-contracts";
import { ModerationPriority, ModerationStatus } from "@/types/super-admin/trust";

export class PreScreeningService {
  constructor() {
    // Subscribe to listing events for automated screening
    eventBus.subscribe<ListingCreatedEvent["payload"]>("listing.created", async (event) => {
      await this.screenListing(event.payload.listingId, event.tenantId, "created");
    });

    eventBus.subscribe<ListingUpdatedEvent["payload"]>("listing.updated", async (event) => {
      await this.screenListing(event.payload.listingId, event.tenantId, "updated");
    });
  }

  /**
   * Evaluates a listing for risk and routes it according to the moderation matrix.
   */
  public async screenListing(listingId: string, tenantId: string | null, source: "created" | "updated"): Promise<void> {
    if (!tenantId) return; // Need a tenant context to queue

    const supabase = this.getClient();

    // 1. Fetch listing details to analyze
    const { data: listing, error: fetchError } = await supabase
      .from("listings")
      .select("title, description, price")
      .eq("id", listingId)
      .single();

    if (fetchError || !listing) {
      console.error(`[PreScreeningService] Failed to fetch listing ${listingId}`, fetchError);
      return;
    }

    // 2. Risk Scoring Engine (Mocked AI text/image/price analysis)
    const { riskScore, flags } = this.calculateRiskScore(listing);

    // 3. Routing Decision Matrix
    let priority: ModerationPriority = "LOW";
    let status: ModerationStatus = "PENDING";
    let autoAction: string | null = null;

    if (riskScore < 30) {
      status = "APPROVED";
      autoAction = "clear";
    } else if (riskScore < 70) {
      priority = "MEDIUM";
      status = "PENDING";
    } else if (riskScore < 90) {
      priority = "HIGH";
      status = "ESCALATED";
    } else {
      priority = "CRITICAL";
      status = "REJECTED";
      autoAction = "ban";
    }

    // 4. Create Queue Item
    const queueId = randomUUID();
    const { error: insertError } = await supabase.from("moderation_queues").insert({
      id: queueId,
      company_id: tenantId,
      target_type: "listing",
      target_id: listingId,
      priority,
      status,
      risk_score: riskScore,
      reports_count: 0,
      details: { source, flags },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });

    if (insertError) {
      console.error(`[PreScreeningService] Failed to queue item ${listingId}`, insertError);
      return;
    }

    // Emit queued event
    await eventBus.publish({
      eventId: randomUUID(),
      eventType: "moderation.item_queued",
      schemaVersion: 1,
      producerDomain: "moderation",
      tenantId,
      actorId: null,
      timestamp: new Date().toISOString(),
      correlationId: randomUUID(),
      payload: {
        itemId: queueId,
        targetType: "listing",
        priority,
        riskScore
      },
      metadata: { source: "system", environment: "production" }
    });

    // 5. Execute Auto-Actions if applicable
    if (autoAction) {
      // Create action record
      await supabase.from("moderation_actions").insert({
        queue_item_id: queueId,
        action_taken: autoAction,
        actor_id: "00000000-0000-0000-0000-000000000000", // System UUID
        justification: `Auto-action applied. Risk score: ${riskScore.toFixed(2)}`,
      });

      // Emit action taken event (which marketplace will listen to for enforcing status)
      await eventBus.publish({
        eventId: randomUUID(),
        eventType: "moderation.action_taken",
        schemaVersion: 1,
        producerDomain: "moderation",
        tenantId,
        actorId: "00000000-0000-0000-0000-000000000000",
        timestamp: new Date().toISOString(),
        correlationId: randomUUID(),
        payload: {
          itemId: queueId,
          targetType: "listing",
          action: autoAction as any,
          actorId: "system",
          justification: `Auto-action applied. Risk score: ${riskScore.toFixed(2)}`
        },
        metadata: { source: "system", environment: "production" }
      });
    }
  }

  /**
   * Risk Scoring Engine.
   * Analyzes listing content to generate a risk score (0-100).
   */
  private calculateRiskScore(listing: unknown): { riskScore: number; flags: string[] } {
    let score = 10; // Base score
    const flags: string[] = [];

    const content = `${listing.title} ${listing.description}`.toLowerCase();

    // Mock profanity/spam detection
    if (content.includes("free money") || content.includes("scam")) {
      score += 60;
      flags.push("spam_keywords_detected");
    }

    if (content.includes("casino") || content.includes("crypto")) {
      score += 40;
      flags.push("high_risk_category_keywords");
    }

    // Mock price outlier detection
    if (listing.price && (listing.price < 0 || listing.price > 100000000)) {
      score += 30;
      flags.push("price_outlier");
    }

    return {
      riskScore: Math.min(score, 100),
      flags
    };
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

export const preScreeningService = new PreScreeningService();
