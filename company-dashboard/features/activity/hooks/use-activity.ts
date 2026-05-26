"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getActivityLogs } from "../services/activity.service";

export function useActivity() {
  const queryClient = useQueryClient();

  const { data: activities, isLoading, error } = useQuery({
    queryKey: ["activities"],
    queryFn: getActivityLogs,
  });

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let channel: any = null;

    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userProfile } = await supabase
        .from("users")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!userProfile?.company_id) return;

      channel = supabase
        .channel("realtime-activities")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "audit_logs",
            filter: `company_id=eq.${userProfile.company_id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["activities"] });
          }
        )
        .subscribe();
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  return {
    activities: activities ?? [],
    isLoading,
    error,
  };
}
