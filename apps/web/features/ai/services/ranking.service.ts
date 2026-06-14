import { ScoredListing } from "./hybrid-search.service";
import { TenantContext } from "@/types/contracts/tenant.context";

export class RankingService {
  /**
   * Applies business rules to re-rank results after the AI pipeline scores them.
   */
  public rerank(
    _context: TenantContext, 
    candidates: ScoredListing[], 
    userContext: { recentViews: string[] }
  ): ScoredListing[] {
    
    return candidates.map(candidate => {
      let finalScore = candidate.score;

      // 1. Freshness Bonus (Mocked, assuming freshness logic)
      // finalScore *= calculateFreshnessMultiplier(candidate.created_at);

      // 2. Diversity Penalty
      // Reduce score slightly if we have too many listings from the same seller
      
      // 3. User Context Personalization
      // If the user recently viewed this, slightly boost or suppress depending on strategy
      if (userContext.recentViews.includes(candidate.id)) {
        finalScore *= 0.95; // Suppress already-seen (Exploration strategy)
      }

      // 4. Promoted Listings (Monetization Engine)
      // if (candidate.is_promoted) {
      //   finalScore *= 1.5; 
      // }

      return {
        ...candidate,
        score: finalScore
      };
    }).sort((a, b) => b.score - a.score); // Re-sort by final score
  }
}

export const rankingService = new RankingService();
