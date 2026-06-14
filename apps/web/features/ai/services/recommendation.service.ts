/* eslint-disable @typescript-eslint/no-unused-vars */
import { createServerClient } from "@supabase/ssr";
import { TenantContext } from "@/types/contracts/tenant.context";
import { aiConfigService } from "./ai-config.service";

export interface CandidateListing {
  id: string;
  source: "trending" | "category" | "similar" | "recent" | "random";
}

export interface ScoredRecommendation {
  id: string;
  source: string;
  score: number;
  signals: {
    relevance: number;
    freshness: number;
    engagement: number;
    quality: number;
  };
}

export class RecommendationService {
  /**
   * Multi-signal scoring pipeline for feed generation.
   * Evaluates candidates across multiple dimensions.
   */
  public async scoreCandidates(
    context: TenantContext,
    candidates: CandidateListing[],
    userContext: { recentInteractions: string[] }
  ): Promise<ScoredRecommendation[]> {
    const supabase = this.getClient();
    
    // 1. Fetch metadata for candidates
    const candidateIds = candidates.map(c => c.id);
    const { data: listings } = await supabase
      .from("listings")
      .select("id, created_at, price")
      .in("id", candidateIds);

    const { data: engagement } = await supabase
      .from("user_interactions")
      .select("listing_id, count")
      .in("listing_id", candidateIds);

    // Create lookup maps
    const listingMap = new Map(listings?.map(l => [l.id, l]) || []);
    const engMap = new Map(engagement?.map(e => [e.listing_id, e.count]) || []);

    // 2. Score candidates
    const scored: ScoredRecommendation[] = candidates.map(candidate => {
      const listing = listingMap.get(candidate.id);
      const engCount = Number(engMap.get(candidate.id)) || 0;

      // Signals
      const relevance = candidate.source === "similar" ? 0.9 : 0.5; // Mock relevance
      const freshness = this.calculateFreshness(listing?.created_at);
      const engagementScore = Math.min(engCount / 100, 1.0); // Normalize to 0-1
      const quality = 0.8; // Mock quality score from listing completeness

      // Multi-signal weighted sum
      // Weights could come from aiConfigService
      const finalScore = 
        (relevance * 0.35) + 
        (freshness * 0.25) + 
        (engagementScore * 0.20) + 
        (quality * 0.20);

      return {
        id: candidate.id,
        source: candidate.source,
        score: finalScore,
        signals: {
          relevance,
          freshness,
          engagement: engagementScore,
          quality
        }
      };
    });

    // 3. Business Rule Reranking
    return this.applyBusinessRules(scored, userContext);
  }

  /**
   * Applies business rules to rerank the feed (Exploration vs Exploitation)
   */
  private applyBusinessRules(
    scored: ScoredRecommendation[],
    userContext: { recentInteractions: string[] }
  ): ScoredRecommendation[] {
    let results = [...scored];

    // Sort by base score
    results.sort((a, b) => b.score - a.score);

    // Rule 1: Diversity (No source dominates too much)
    // Rule 2: Suppress already seen
    const seen = new Set(userContext.recentInteractions);
    results = results.map(item => {
      let score = item.score;
      if (seen.has(item.id)) {
        score *= 0.5; // Heavily penalize seen items to encourage exploration
      }
      return { ...item, score };
    });

    // Re-sort
    results.sort((a, b) => b.score - a.score);
    return results;
  }

  /**
   * Freshness exponential decay
   */
  private calculateFreshness(createdAt?: string): number {
    if (!createdAt) return 0.5;
    const hoursSince = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    const lambda = 0.01;
    return Math.exp(-lambda * hoursSince);
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

export const recommendationService = new RecommendationService();
