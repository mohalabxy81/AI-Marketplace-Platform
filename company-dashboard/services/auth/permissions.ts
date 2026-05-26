"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function requireCompanyAuth() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) throw new Error("No company associated with user");

  return { supabase, user, companyId: profile.company_id };
}

export async function authorizeAction(permission: string) {
  const { supabase, user, companyId } = await requireCompanyAuth();

  // First get the user's role
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile?.role) throw new Error("User role not found");

  // Owners have all permissions implicitly, or we can check the db
  if (profile.role === 'OWNER') {
    return { supabase, user, companyId };
  }

  // Check the roles_permissions table
  const { data: permRecord } = await supabase
    .from("roles_permissions")
    .select("allowed")
    .eq("company_id", companyId)
    .eq("role", profile.role)
    .eq("permission", permission)
    .single();

  if (!permRecord?.allowed) {
    throw new Error(`Forbidden: missing permission ${permission}`);
  }

  return { supabase, user, companyId };
}
