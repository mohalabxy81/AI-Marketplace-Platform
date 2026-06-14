// features/platform-core/hooks/use-admin-auth.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { type AdminRole, type AdminCapability } from "@/types/super-admin/admin";
import { ADMIN_ROLE_CAPABILITIES } from "@/lib/supabase/admin-permissions";

export interface AdminProfile {
  id: string;
  user_id: string;
  role: AdminRole;
  is_active: boolean;
  email?: string;
  full_name?: string;
}

export function useAdminAuth() {
  const { data: admin, isLoading, error } = useQuery<AdminProfile | null>({
    queryKey: ["admin", "profile"],
    queryFn: async () => {
      // 1. Get current authenticated user session
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // 2. Get admin record from platform_admins table
      const { data: adminRecord, error: adminErr } = await supabase
        .from("platform_admins")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (adminErr || !adminRecord || !adminRecord.is_active) {
        return null;
      }

      // 3. Resolve profile details from metadata
      return {
        id: adminRecord.id,
        user_id: adminRecord.user_id,
        role: adminRecord.role as AdminRole,
        is_active: adminRecord.is_active,
        email: user.email,
        full_name: user.user_metadata?.full_name || "Platform Admin",
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false
  });

  const hasCapability = (capability: AdminCapability): boolean => {
    if (!admin) return false;
    return ADMIN_ROLE_CAPABILITIES[admin.role]?.includes(capability) ?? false;
  };

  return {
    admin,
    isLoading,
    isAuthenticated: !!admin,
    error,
    hasCapability
  };
}
