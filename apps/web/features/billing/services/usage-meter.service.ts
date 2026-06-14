import { createServerClient } from "@supabase/ssr";
import { eventBus } from "@/features/platform-core";
import { quotaService } from "./quota.service";
import { ListingStatusChangedEvent } from "@/types/contracts/events/marketplace.events";
import { EmbeddingGeneratedEvent } from "@/types/contracts/events/ai.events";

export class UsageMeterService {
  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    // 1. Meter Listings Publish
    eventBus.subscribe<ListingStatusChangedEvent["payload"]>("listing.status_changed", async (event) => {
      if (event.payload.newStatus === "published" && event.payload.oldStatus !== "published") {
        await this.incrementUsage(event.tenantId!, "listings_published", 1);
      }
    });

    // 2. Meter AI Tokens
    eventBus.subscribe<EmbeddingGeneratedEvent["payload"]>("embedding.generated", async (event) => {
      if (event.tenantId) {
        // Assume rough token calculation for architecture demo
        const estimatedTokens = 1500;
        await this.incrementUsage(event.tenantId, "ai_tokens", estimatedTokens);
      }
    });
  }

  /**
   * Increments the usage counter for a specific resource for the current billing period.
   */
  public async incrementUsage(companyId: string, resource: string, amount: number): Promise<void> {
    const supabase = this.getClient();

    // In a production system, this would be an atomic RPC or Redis counter.
    // For architecture implementation, we simulate an upsert with RPC.
    const { error } = await supabase.rpc("increment_quota_usage", {
      p_company_id: companyId,
      p_resource: resource,
      p_amount: amount
    });

    if (error) {
      console.error(`[UsageMeter] Failed to increment ${resource} for ${companyId}:`, error);
      return;
    }

    // Evaluate quota thresholds after increment
    await quotaService.evaluateThresholds(companyId, resource);
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

export const usageMeterService = new UsageMeterService();
