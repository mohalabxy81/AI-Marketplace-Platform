// features/moderation/services/scoring.service.ts
import { supabase } from "@/lib/supabase/client";
import { type FraudScore } from "@/types/super-admin/trust";
import { logAdminAction } from "@/features/platform-core/services/platform-audit.service";

export const scoringService = {
  /**
   * Fetch fraud scores, optionally filtering by minimum score threshold.
   */
  async getFraudScores(minScore: number = 0): Promise<FraudScore[]> {
    const { data, error } = await supabase
      .from("fraud_scores")
      .select("*")
      .gte("score", minScore)
      .order("score", { ascending: false });

    if (error) throw new Error(`scoringService.getFraudScores: ${error.message}`);
    return (data as FraudScore[]) ?? [];
  },

  /**
   * Clear a user's fraud score (reset to 0) and log the action.
   */
  async clearFraudScore(userId: string, justification: string): Promise<void> {
    const { data: previous, error: fetchErr } = await supabase
      .from("fraud_scores")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (fetchErr && fetchErr.code !== "PGRST116") { // Ignore 'not found'
      throw new Error(`scoringService.clearFraudScore (fetch): ${fetchErr.message}`);
    }

    const { error: updateErr } = await supabase
      .from("fraud_scores")
      .update({ score: 0, flags: [] })
      .eq("user_id", userId);

    if (updateErr) {
      throw new Error(`scoringService.clearFraudScore (update): ${updateErr.message}`);
    }

    await logAdminAction(
      "fraud_score.cleared",
      "user",
      userId,
      previous ?? { score: 0, flags: [] },
      { score: 0, flags: [], justification }
    );
  },
};
