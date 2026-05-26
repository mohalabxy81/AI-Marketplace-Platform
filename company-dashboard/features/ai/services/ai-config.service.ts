// features/ai/services/ai-config.service.ts
import { supabase } from "@/lib/supabase/client";
import { type AIConfiguration, type AIExperiment, type SemanticEmbedding } from "@/types/super-admin/ai";

export const aiConfigService = {
  /**
   * Get the currently active AI configuration.
   */
  async getActiveConfig(): Promise<AIConfiguration | null> {
    const { data, error } = await supabase
      .from("ai_configurations")
      .select("*")
      .order("version", { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      throw new Error(`aiConfigService.getActiveConfig: ${error.message}`);
    }
    return (data as AIConfiguration) ?? null;
  },

  /**
   * Update weights for search. Inserts a new configuration version.
   */
  async updateWeights(
    adminId: string,
    weights: { semanticWeight: number; keywordWeight: number; bm25Weight: number }
  ): Promise<void> {
    const sum = weights.semanticWeight + weights.keywordWeight + weights.bm25Weight;
    if (Math.abs(sum - 1.0) > 0.01) {
      throw new Error("Weights must sum to 1.0");
    }

    const current = await this.getActiveConfig();
    const nextVersion = current ? (current as any).version + 1 : 1;

    const { error } = await supabase.from("ai_configurations").insert({
      active_model_name: current?.active_model_name ?? "default-model",
      semantic_weight: weights.semanticWeight,
      keyword_weight: weights.keywordWeight,
      bm25_weight: weights.bm25Weight,
      updated_by: adminId,
      version: nextVersion,
    });

    if (error) throw new Error(`aiConfigService.updateWeights: ${error.message}`);
  },

  /**
   * Trigger a vector re-indexing for a specific listing or all stale embeddings.
   * NOTE: This would typically call an Edge Function. Here we update status to INDEXING.
   */
  async triggerReindex(listingId?: string): Promise<void> {
    let query = supabase
      .from("semantic_embeddings")
      .update({ embedding_status: "INDEXING" });

    if (listingId) {
      query = query.eq("listing_id", listingId);
    } else {
      query = query.eq("embedding_status", "STALE");
    }

    const { error } = await query;
    if (error) throw new Error(`aiConfigService.triggerReindex: ${error.message}`);
  },

  /**
   * Get A/B experiments.
   */
  async getExperiments(): Promise<AIExperiment[]> {
    const { data, error } = await supabase
      .from("ai_experiments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw new Error(`aiConfigService.getExperiments: ${error.message}`);
    return (data as AIExperiment[]) ?? [];
  },
};
