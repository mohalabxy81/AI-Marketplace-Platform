"use client";

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase/client";
import { useAuthStore } from "@/store/auth.store";
import type { DbCompany } from "@/types/database";

export function useCompany() {
  const { companyId } = useAuthStore();

  return useQuery<DbCompany | null>({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();
      if (error) return null;
      return data as DbCompany;
    },
    enabled: !!companyId,
    staleTime: 10 * 60 * 1000, // 10 minutes — company data rarely changes
  });
}
