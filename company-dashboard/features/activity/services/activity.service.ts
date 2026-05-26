"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DbAuditLog } from "@/types/database";

export async function getActivityLogs() {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select(`
      *,
      actor:users(id, email, full_name, role)
    `)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data as (DbAuditLog & { actor: any })[];
}

export async function logActivity(
  action: string,
  entityType: string,
  entityId?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>
) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return;

  const { data: userProfile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!userProfile?.company_id) return;

  await supabase.from("audit_logs").insert({
    company_id: userProfile.company_id,
    actor_id: user.id,
    action,
    entity_type: entityType,
    entity_id: entityId ?? null,
    metadata: metadata ?? {},
  });
}
