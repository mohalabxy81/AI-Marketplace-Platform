import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

export class AuditService {
  /**
   * Records an audit log entry securely into platform_audit_logs.
   */
  public async record(entry: AuditRecord): Promise<void> {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(_cookiesToSet) {
            // Handled safely in read-only environments
          },
        },
      }
    );

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
