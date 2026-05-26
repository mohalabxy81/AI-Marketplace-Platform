import { createServerClient } from "@supabase/ssr";
import { TenantContext } from "@/types/contracts/tenant.context";
import { aiConfigService } from "./ai-config.service";

export interface SearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  location?: string;
}

export interface ScoredListing {
  id: string;
  title: string;
  score: number;
  semantic_score: number;
  keyword_score: number;
}

export class HybridSearchService {
  /**
   * Orchestrates the Reciprocal Rank Fusion (RRF) search across keyword and semantic indices.
   */
  public async search(
    context: TenantContext,
    query: string,
    filters: SearchFilters,
    limit: number = 20
  ): Promise<ScoredListing[]> {
    const supabase = this.getClient();
    
    // 1. Fetch live AI weights
    const aiConfig = await aiConfigService.getActiveConfig();
    if (!aiConfig) throw new Error("AI configuration not found");
    
    // 2. Mock semantic embedding generation for the query
    // In production: const queryVector = await openai.embeddings.create(query);
    const queryVector = Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
    const vectorString = `[${queryVector.join(",")}]`;

    // 3. Execute Postgres RPC for Hybrid Search (RRF)
    // The RPC 'hybrid_search' should combine tsvector BM25 and pgvector cosine distance
    const { data, error } = await supabase.rpc("hybrid_search", {
      query_text: query,
      query_embedding: vectorString,
      match_count: limit,
      company_id_filter: context.tenantId, // Tenant isolation boundary
      semantic_weight: aiConfig.semantic_weight,
      keyword_weight: aiConfig.keyword_weight,
      // Pass structured filters
      filter_category: filters.category || null,
      filter_min_price: filters.minPrice || null,
      filter_max_price: filters.maxPrice || null
    });

    if (error) {
      console.error("[HybridSearch] RPC failed:", error);
      // Fallback: degrade gracefully to standard keyword search if pgvector fails
      return this.fallbackKeywordSearch(context, query, filters, limit);
    }

    return (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      title: row.title as string,
      score: row.rrf_score as number,
      semantic_score: row.semantic_score as number,
      keyword_score: row.keyword_score as number
    }));
  }

  /**
   * Graceful degradation fallback if the vector DB or embedding API fails.
   */
  private async fallbackKeywordSearch(
    context: TenantContext,
    query: string,
    filters: SearchFilters,
    limit: number
  ): Promise<ScoredListing[]> {
    const supabase = this.getClient();
    
    let queryBuilder = supabase
      .from("listings")
      .select("id, title")
      .eq("company_id", context.tenantId)
      .eq("status", "published")
      .textSearch("title_description_fts", query)
      .limit(limit);

    if (filters.category) queryBuilder = queryBuilder.eq("category", filters.category);
    if (filters.minPrice) queryBuilder = queryBuilder.gte("price", filters.minPrice);
    if (filters.maxPrice) queryBuilder = queryBuilder.lte("price", filters.maxPrice);

    const { data } = await queryBuilder;
    
    return (data || []).map((listing: Record<string, unknown>) => ({
      id: listing.id as string,
      title: listing.title as string,
      score: 1.0, // Fallback score
      semantic_score: 0.0,
      keyword_score: 1.0
    }));
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

export const hybridSearchService = new HybridSearchService();
