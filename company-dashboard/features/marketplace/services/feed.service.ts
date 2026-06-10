/* eslint-disable @typescript-eslint/no-unused-vars */
import { createServerClient } from "@supabase/ssr";
import { TenantContext } from "@/types/contracts/tenant.context";
import { recommendationService, CandidateListing, ScoredRecommendation } from "@/features/ai";
import { cacheService } from "@/features/platform-core";
import { profilerService } from "@/features/platform-core";

export class FeedService {
  /**
   * Generates a personalized feed for a user.
   */
  public async generateFeed(
    context: TenantContext,
    options: { limit: number; offset: number }
  ): Promise<ScoredRecommendation[]> {
    const cacheKey = `feed:${context.tenantId}:${context.userId}:${options.limit}:${options.offset}`;
    
    return profilerService.profile("generateFeed", { tenantId: context.tenantId }, async () => {
      return cacheService.fetchOrCache(cacheKey, async () => {
        const supabase = this.getClient();

    // 1. Fetch user context (recent interactions for engagement learning loop)
    const { data: interactions } = await supabase
      .from("user_interactions")
      .select("listing_id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(20);

    const recentInteractions = interactions?.map(i => i.listing_id) || [];

    // 2. Candidate Generation (Parallel sources)
    const candidates = await this.generateCandidates(context, recentInteractions);

    // 3. Deduplication
    const uniqueCandidates = Array.from(
      new Map(candidates.map(c => [c.id, c])).values()
    );

    // 4. Multi-signal Scoring Pipeline
    const scoredFeed = await recommendationService.scoreCandidates(
      context,
      uniqueCandidates,
      { recentInteractions }
    );

        // 5. Pagination
        return scoredFeed.slice(options.offset, options.offset + options.limit);
      }, 300); // 5 min TTL
    });
  }

  /**
   * Assembles candidates from multiple sources.
   * Broad recall strategy.
   */
  private async generateCandidates(
    context: TenantContext,
    _recentInteractions: string[]
  ): Promise<CandidateListing[]> {
    const supabase = this.getClient();
    const candidates: CandidateListing[] = [];

    // Source A: Trending (Most interacted recently)
    // In production, this would be a materialized view or redis cache
    const { data: trending } = await supabase
      .from("listings")
      .select("id")
      .eq("company_id", context.tenantId)
      .eq("status", "published")
      .order("created_at", { ascending: false }) // Mocking trending with recent for now
      .limit(50);
    
    trending?.forEach(t => candidates.push({ id: t.id, source: "trending" }));

    // Source B: Random (Exploration)
    // Helps with cold-start items and diversity
    const { data: random } = await supabase
      .from("listings")
      .select("id")
      .eq("company_id", context.tenantId)
      .eq("status", "published")
      .limit(20);
      
    random?.forEach(r => candidates.push({ id: r.id, source: "random" }));

    // Source C: Category affinity (Mocked)
    // In production, we'd find the user's top categories and pull top items
    
    // Source D: Similar (Collaborative filtering)
    // Handled by AI vector similarities in a real pgvector query

    return candidates;
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

export const feedService = new FeedService();
