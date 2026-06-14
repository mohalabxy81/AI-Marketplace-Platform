"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth.store";
import type { DbUser, DbCompany, UserRole } from "@/types/database";

// ── Platform admin check ──────────────────────────────────────

async function fetchPlatformAdmin(userId: string) {
  const { data, error } = await supabase
    .from("platform_admins")
    .select("role, is_active")
    .eq("user_id", userId)
    .single();
  if (error || !data?.is_active) return null;
  return data;
}

// ── Fetch helpers (client-side) ───────────────────────────────

async function fetchUserProfile(userId: string): Promise<DbUser | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data as DbUser;
}

async function fetchCompany(companyId: string): Promise<DbCompany | null> {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", companyId)
    .single();
  if (error) return null;
  return data as DbCompany;
}

// ── Hook ──────────────────────────────────────────────────────

export function useAuth() {
  const { setAuth, clearAuth, setLoading, ...state } = useAuthStore();

  // Listen for Supabase auth state changes
  useEffect(() => {
    setLoading(true);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: import("@supabase/supabase-js").AuthChangeEvent, session: import("@supabase/supabase-js").Session | null) => {
      if (event === "SIGNED_OUT" || !session?.user) {
        clearAuth();
        return;
      }

      const profile = await fetchUserProfile(session.user.id);

      if (!profile) {
        // Not a tenant user — check if this is a platform admin
        const adminRecord = await fetchPlatformAdmin(session.user.id);
        if (!adminRecord) {
          clearAuth();
          return;
        }
        // Platform admins don't have a users-table profile — synthesise one
        // so the auth store marks them as authenticated.
        setAuth({
          user: {
            id: session.user.id,
            email: session.user.email ?? "",
            role: adminRecord.role as UserRole,
            company_id: null,
          } as unknown as DbUser,
          company: null,
          role: adminRecord.role as UserRole,
        });
        return;
      }

      const company = profile.company_id
        ? await fetchCompany(profile.company_id)
        : null;

      setAuth({
        user: profile,
        company,
        role: profile.role as UserRole,
      });
    });

    return () => subscription.unsubscribe();
  }, [setAuth, clearAuth, setLoading]);

  return state;
}

// ── React Query hook for current user profile ─────────────────

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      return fetchUserProfile(user.id);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true,
  });
}
