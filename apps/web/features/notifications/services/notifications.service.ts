"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DbNotification } from "@/types/database";

export async function getNotifications() {
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as DbNotification[];
}

export async function markNotificationAsRead(id: string) {
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function clearAllNotifications() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { error } = await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("user_id", user.id);

  if (error) {
    throw new Error(error.message);
  }
}
