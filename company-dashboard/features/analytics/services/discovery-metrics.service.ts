import { createServerClient } from "@supabase/ssr";

export interface DiscoveryMetrics {
  totalSearches: number;
  searchCtr: number;
  recommendationImpressions: number;
  recommendationCtr: number;
}

export class DiscoveryMetricsService {
  /**
   * Calculates discovery and search metrics for the platform or a specific tenant.
   * Tracks Click-Through Rates (CTR) based on interaction events.
   */
  public async getDiscoveryMetrics(tenantId?: string, hours: number = 24): Promise<DiscoveryMetrics> {
    const supabase = this.getClient();
    const cutoffDate = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Base query for interactions
    let query = supabase
      .from("user_interactions")
      .select("action, source")
      .gte("created_at", cutoffDate);

    // If tenant-scoped, we would ideally filter by company_id
    // Assuming interactions table has company_id or we join listings
    if (tenantId) {
      // Mocking filter for simplicity
      query = query.eq("company_id", tenantId);
    }

    const { data: interactions, error } = await query;

    if (error || !interactions) {
      console.error("[DiscoveryMetrics] Failed to fetch interactions", error);
      return { totalSearches: 0, searchCtr: 0, recommendationImpressions: 0, recommendationCtr: 0 };
    }

    let searchImpressions = 0;
    let searchClicks = 0;
    let recImpressions = 0;
    let recClicks = 0;

    for (const interaction of interactions) {
      if (interaction.source === "search") {
        if (interaction.action === "view") searchImpressions++;
        if (interaction.action === "click") searchClicks++;
      } else if (interaction.source === "feed" || interaction.source === "recommendation") {
        if (interaction.action === "view") recImpressions++;
        if (interaction.action === "click") recClicks++;
      }
    }

    return {
      totalSearches: searchImpressions, // Approximating search queries by view impressions
      searchCtr: searchImpressions > 0 ? searchClicks / searchImpressions : 0,
      recommendationImpressions: recImpressions,
      recommendationCtr: recImpressions > 0 ? recClicks / recImpressions : 0
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

export const discoveryMetricsService = new DiscoveryMetricsService();
