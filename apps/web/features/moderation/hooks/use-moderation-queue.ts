// features/moderation/hooks/use-moderation-queue.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { moderationService, type ModerationQueueFilters } from "../services/moderation.service";
import { scoringService } from "../services/scoring.service";
import { type ModerationActionTaken, type ModerationPriority } from "@/types/super-admin/trust";
import { toast } from "sonner";

export function useModerationQueueQuery(filters?: ModerationQueueFilters) {
  return useQuery({
    queryKey: ["super-admin", "moderation-queue", filters],
    queryFn: () => moderationService.getModerationQueue(filters),
    staleTime: 30 * 1000
  });
}

export function useFraudScoresQuery(minScore: number = 0) {
  return useQuery({
    queryKey: ["super-admin", "fraud-scores", minScore],
    queryFn: () => scoringService.getFraudScores(minScore),
    staleTime: 60 * 1000
  });
}

export function useActOnModerationMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      queueId,
      actorId,
      action,
      justification
    }: {
      queueId: string;
      actorId: string;
      action: ModerationActionTaken;
      justification: string;
    }) => {
      await moderationService.actOnQueue(queueId, actorId, action, justification);
      return { queueId, action };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "moderation-queue"] });
      toast.success(`Action '${data.action}' successfully applied to item.`);
    },
    onError: (err) => {
      toast.error(`Moderation action failed: ${err.message}`);
    }
  });
}

export function useAssignQueueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ queueId, adminId }: { queueId: string; adminId: string }) => {
      await moderationService.assignQueue(queueId, adminId);
      return { queueId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "moderation-queue"] });
      toast.success("Item successfully assigned.");
    },
    onError: (err) => {
      toast.error(`Assignment failed: ${err.message}`);
    }
  });
}

export function useEscalateQueueMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ queueId, priority }: { queueId: string; priority: ModerationPriority }) => {
      await moderationService.escalateQueue(queueId, priority);
      return { queueId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "moderation-queue"] });
      toast.success("Item successfully escalated.");
    },
    onError: (err) => {
      toast.error(`Escalation failed: ${err.message}`);
    }
  });
}

export function useClearFraudScoreMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, justification }: { userId: string; justification: string }) => {
      await scoringService.clearFraudScore(userId, justification);
      return { userId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["super-admin", "fraud-scores"] });
      toast.success("Fraud score successfully cleared.");
    },
    onError: (err) => {
      toast.error(`Clearing fraud score failed: ${err.message}`);
    }
  });
}
