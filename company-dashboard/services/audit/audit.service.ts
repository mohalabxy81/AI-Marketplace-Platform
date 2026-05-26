"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export type AuditEventParams = {
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
};

/**
 * Logs an audit event to the database.
 * This is used for compliance, tracking user actions, and activity feeds.
 */
export async function logAuditEvent({
  action,
  entityType,
  entityId,
  metadata,
}: AuditEventParams) {
  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.warn("Attempted to log audit event without an authenticated user:", { action, entityType });
      return;
    }

    const { data: userProfile } = await supabase
      .from("users")
      .select("company_id")
      .eq("id", user.id)
      .single();

    if (!userProfile?.company_id) {
      console.warn("User has no company_id, skipping audit log:", { userId: user.id });
      return;
    }

    const { error } = await supabase.from("audit_logs").insert({
      company_id: userProfile.company_id,
      actor_id: user.id,
      action,
      entity_type: entityType,
      entity_id: entityId ?? null,
      metadata: metadata ?? {},
    });

    if (error) {
      console.error("Failed to insert audit log:", error);
    }
  } catch (error) {
    console.error("Unexpected error in logAuditEvent:", error);
  }
}
