/* eslint-disable @typescript-eslint/no-unused-vars */
// features/ai/hooks/use-ai-config.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { aiConfigService } from "../services/ai-config.service";
import { toast } from "sonner";

export function useAIConfigQuery() {
  return useQuery({
    queryKey: ["super-admin", "ai-config", "active"],
    queryFn: () => aiConfigService.getActiveConfig(),
    staleTime: 5 * 60 * 1000
  });
}

export function useAIExperimentsQuery() {
  return useQuery({
    queryKey: ["super-admin", "ai-experiments"],
    queryFn: () => aiConfigService.getExperiments(),
    staleTime: 60 * 1000
  });
}

export function useUpdateWeightsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      adminId,
      semanticWeight,
      keywordWeight,
      bm25Weight
    }: {
      adminId: string;
      semanticWeight: number;
      keywordWeight: number;
      bm25Weight: number;
    }) => {
      await aiConfigService.updateWeights(adminId, { semanticWeight, keywordWeight, bm25Weight });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "ai-config"] });
      toast.success("AI search weights successfully updated and new version deployed.");
    },
    onError: (err) => {
      toast.error(`Weight update failed: ${err.message}`);
    }
  });
}

export function useTriggerReindexMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId }: { listingId?: string } = {}) => {
      await aiConfigService.triggerReindex(listingId);
    },
    onSuccess: () => {
      // Typically invalidate embedding statuses or related queries here
      toast.success("Vector re-indexing job successfully triggered.");
    },
    onError: (err) => {
      toast.error(`Re-index trigger failed: ${err.message}`);
    }
  });
}

export function useAIInferenceLogsQuery() {
  return useQuery({
    queryKey: ["super-admin", "ai-inference-logs"],
    queryFn: () => {
      // Mock data for now since we haven't built the telemetry service
      return [
        { id: "log-1", model_name: "gemini-pro-1.5", latency_ms: 120, tokens_used: 1042, status_code: 200 },
        { id: "log-2", model_name: "gemini-pro-1.5", latency_ms: 450, tokens_used: 350, status_code: 200 }
      ];
    },
    staleTime: 60 * 1000
  });
}
