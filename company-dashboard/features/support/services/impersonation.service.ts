// features/support/services/impersonation.service.ts
import { supabase } from "@/lib/supabase/client";
import { type ImpersonationSession } from "@/types/super-admin/support";
import { logAdminAction } from "@/features/platform-core";

export const impersonationService = {
  async createSession(adminId: string, targetUserId: string, targetCompanyId: string, justification: string): Promise<ImpersonationSession> {
    const { data, error } = await supabase
      .from("impersonation_sessions")
      .insert({
        admin_id: adminId,
        target_user_id: targetUserId,
        target_company_id: targetCompanyId,
        justification,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw new Error(`impersonationService.createSession: ${error.message}`);

    await logAdminAction(
      "impersonation.started",
      "user",
      targetUserId,
      null,
      { justification, session_id: data.id }
    );

    return data as ImpersonationSession;
  },

  /**
   * End an active impersonation session early.
   */
  async endSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from("impersonation_sessions")
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
      })
      .eq("id", sessionId);

    if (error) throw new Error(`impersonationService.endSession: ${error.message}`);

    await logAdminAction(
      "impersonation.ended",
      "impersonation_session",
      sessionId,
      { is_active: true },
      { is_active: false }
    );
  },

  /**
   * Get active sessions for an admin.
   */
  async getActiveSessions(adminId: string): Promise<ImpersonationSession[]> {
    const { data, error } = await supabase
      .from("impersonation_sessions")
      .select("*")
      .eq("admin_id", adminId)
      .eq("is_active", true)
      .gt("expires_at", new Date().toISOString());

    if (error) throw new Error(`impersonationService.getActiveSessions: ${error.message}`);
    return (data as ImpersonationSession[]) ?? [];
  },
};
