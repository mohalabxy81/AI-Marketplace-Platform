// features/moderation/services/moderation.service.ts
import { supabase } from "@/lib/supabase/client";
import {
  type ModerationQueue,
  type ModerationAction,
  type ModerationActionTaken,
  type ModerationPriority,
  type ModerationStatus,
} from "@/types/super-admin/trust";

export interface ModerationQueueFilters {
  status?: ModerationStatus;
  priority?: ModerationPriority;
  targetType?: string;
  assignedTo?: string;
}

export const moderationService = {
  /**
   * Fetch moderation queue items with optional filters.
   * Ordered by priority DESC, then creation time ASC (oldest first per priority).
   */
  async getModerationQueue(filters?: ModerationQueueFilters): Promise<ModerationQueue[]> {
    let query = supabase
      .from("moderation_queues")
      .select("*")
      .order("created_at", { ascending: true });

    if (filters?.status) query = query.eq("status", filters.status);
    if (filters?.priority) query = query.eq("priority", filters.priority);
    if (filters?.targetType) query = query.eq("target_type", filters.targetType);
    if (filters?.assignedTo) query = query.eq("assigned_to", filters.assignedTo);

    const { data, error } = await query;
    if (error) throw new Error(`moderationService.getModerationQueue: ${error.message}`);
    return (data as ModerationQueue[]) ?? [];
  },

  /**
   * Fetch moderation actions for a specific queue item.
   */
  async getModerationActions(queueId: string): Promise<ModerationAction[]> {
    const { data, error } = await supabase
      .from("moderation_actions")
      .select("*")
      .eq("queue_item_id", queueId)
      .order("created_at", { ascending: false });

    if (error) throw new Error(`moderationService.getModerationActions: ${error.message}`);
    return (data as ModerationAction[]) ?? [];
  },

  /**
   * Submit a moderation action (ban, warning, approve, escalate, clear).
   * Simultaneously updates queue status and inserts an action record.
   */
  async actOnQueue(
    queueId: string,
    actorId: string,
    action: ModerationActionTaken,
    justification: string
  ): Promise<void> {
    const statusMap: Record<ModerationActionTaken, ModerationStatus> = {
      ban: "REJECTED",
      suspend: "REJECTED",
      warning: "APPROVED",
      clear: "APPROVED",
    };

    // Insert the action record
    const { error: actionErr } = await supabase.from("moderation_actions").insert({
      queue_item_id: queueId,
      action_taken: action,
      actor_id: actorId,
      justification,
    });
    if (actionErr) throw new Error(`moderationService.actOnQueue (insert): ${actionErr.message}`);

    // Update queue item status
    const nextStatus = statusMap[action] ?? "APPROVED";
    const { error: updateErr } = await supabase
      .from("moderation_queues")
      .update({ status: nextStatus, updated_at: new Date().toISOString() })
      .eq("id", queueId);

    if (updateErr)
      throw new Error(`moderationService.actOnQueue (update): ${updateErr.message}`);
  },

  /**
   * Assign a queue item to a specific admin operator.
   */
  async assignQueue(queueId: string, adminId: string): Promise<void> {
    const { error } = await supabase
      .from("moderation_queues")
      .update({ assigned_to: adminId, status: "ESCALATED", updated_at: new Date().toISOString() })
      .eq("id", queueId);

    if (error) throw new Error(`moderationService.assignQueue: ${error.message}`);
  },

  /**
   * Escalate a queue item to a higher priority.
   */
  async escalateQueue(queueId: string, priority: ModerationPriority): Promise<void> {
    const { error } = await supabase
      .from("moderation_queues")
      .update({ priority, status: "ESCALATED", updated_at: new Date().toISOString() })
      .eq("id", queueId);

    if (error) throw new Error(`moderationService.escalateQueue: ${error.message}`);
  },
};
