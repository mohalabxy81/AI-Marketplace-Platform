// features/platform-core/services/platform-audit.service.ts
import { supabase } from "@/lib/supabase/client";
import { type PlatformAuditLog } from "@/types/super-admin/admin";

export interface AuditFilters {
  adminId?: string;
  action?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Appends a record to the tamper-proof platform_audit_logs table.
 * Gated by a DB trigger preventing any updates or deletions.
 */
export async function logAdminAction(
  action: string,
  targetType: string,
  targetId?: string | null,
  beforeState?: Record<string, unknown> | null,
  afterState?: Record<string, unknown> | null
) {
  try {
    // 1. Get current authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn("Audit logging skipped: No active session found.");
      return;
    }

    // 2. Resolve admin profile primary key
    const { data: adminRecord, error: adminErr } = await supabase
      .from("platform_admins")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (adminErr || !adminRecord) {
      console.error("Audit logging failed: Current user is not registered in platform_admins.", adminErr);
      return;
    }

    // 3. Resolve metadata
    const userAgent = typeof window !== "undefined" ? window.navigator.userAgent : "Node-Server";
    const ipAddress = "127.0.0.1"; // Fallback as browser client cannot easily read public IP directly without sidecar APIs

    // 4. Perform append-only insert
    const { error: insertErr } = await supabase.from("platform_audit_logs").insert({
      admin_id: adminRecord.id,
      action,
      target_type: targetType,
      target_id: targetId || null,
      before_state: beforeState || null,
      after_state: afterState || null,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    if (insertErr) {
      console.error("Tamper-proof audit logger database insert error:", insertErr);
    }
  } catch (err) {
    console.error("Fatal error inside audit logging service:", err);
  }
}

/**
 * Fetch audit logs with optional filtering and pagination.
 */
export async function getAuditLogs(
  filters?: AuditFilters,
  limit: number = 50,
  offset: number = 0
): Promise<{ logs: PlatformAuditLog[]; count: number }> {
  let query = supabase
    .from("platform_audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (filters?.adminId) query = query.eq("admin_id", filters.adminId);
  if (filters?.action) query = query.eq("action", filters.action);
  if (filters?.targetType) query = query.eq("target_type", filters.targetType);
  if (filters?.startDate) query = query.gte("created_at", filters.startDate);
  if (filters?.endDate) query = query.lte("created_at", filters.endDate);

  const { data, error, count } = await query;
  if (error) throw new Error(`getAuditLogs: ${error.message}`);

  return {
    logs: (data as PlatformAuditLog[]) ?? [],
    count: count ?? 0,
  };
}

/**
 * Fetch audit logs specific to a target (e.g. a specific user or company).
 */
export async function getAuditLogsByTarget(
  targetType: string,
  targetId: string
): Promise<PlatformAuditLog[]> {
  const { data, error } = await supabase
    .from("platform_audit_logs")
    .select("*")
    .eq("target_type", targetType)
    .eq("target_id", targetId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`getAuditLogsByTarget: ${error.message}`);
  return (data as PlatformAuditLog[]) ?? [];
}
