import { createClient } from "@supabase/supabase-js";

export interface AuditRecord {
  actor_id: string;             // User ID performing the action
  company_id?: string;          // Tenant context (if applicable)
  action: string;               // e.g. "subscription.upgrade", "listing.delete", "user.suspend"
  resource_type: string;        // e.g. "listing", "user", "subscription"
  resource_id: string;          // ID of the target resource
  old_state?: Record<string, unknown>;
  new_state?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

// Isomorphic singleton client — safe in both Server Components and Client Components.
// RLS policies on platform_audit_logs guard write access at the DB level.
function getAuditClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export class AuditService {
  /**
   * Records an audit log entry securely into platform_audit_logs.
   * Uses an isomorphic Supabase client — safe to call from Server or Client context.
   */
  public async record(entry: AuditRecord): Promise<void> {
    const supabase = getAuditClient();

    const { error } = await supabase
      .from("platform_audit_logs")
      .insert([
        {
          actor_id: entry.actor_id,
          company_id: entry.company_id || null,
          action: entry.action,
          resource_type: entry.resource_type,
          resource_id: entry.resource_id,
          old_state: entry.old_state || null,
          new_state: entry.new_state || null,
          ip_address: entry.ip_address || null,
          user_agent: entry.user_agent || null,
          created_at: new Date().toISOString(),
        }
      ]);

    if (error) {
      console.error("[AuditService] Failed to write audit log:", error);
      // Fallback: send to stdout/stderr so logging platforms (Datadog/CloudWatch) can pick it up.
      console.error(JSON.stringify({ type: "AUDIT_FALLBACK", ...entry }));
    }
  }
}

export const auditService = new AuditService();
