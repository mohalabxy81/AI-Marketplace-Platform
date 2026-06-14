"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { DbAiInsight } from "@/types/database";

// ── Auth guard ────────────────────────────────────────────────
async function requireCompanyAuth() {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("users")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id) throw new Error("No company associated with user");
  return { supabase, user, companyId: profile.company_id };
}

// ── Overview metrics (30-day window) ─────────────────────────

export interface AnalyticsOverview {
  totalViews: number;
  totalClicks: number;
  totalSaves: number;
  totalShares: number;
  engagementRate: number;
  activeListings: number;
  totalInteractions: number;
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  const { supabase, companyId } = await requireCompanyAuth();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [interactionsResult, listingsResult] = await Promise.all([
    supabase
      .from("user_interactions")
      .select("action")
      .eq("company_id", companyId)
      .gte("created_at", thirtyDaysAgo.toISOString()),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "published"),
  ]);

  if (interactionsResult.error) throw interactionsResult.error;
  if (listingsResult.error) throw listingsResult.error;

  const interactions = interactionsResult.data ?? [];
  const views = interactions.filter((i) => i.action === "view").length;
  const clicks = interactions.filter((i) => i.action === "click").length;
  const saves = interactions.filter((i) => i.action === "save").length;
  const shares = interactions.filter((i) => i.action === "share").length;
  const total = interactions.length;
  const engagementRate = total > 0 ? Math.round((clicks / views || 0) * 100 * 100) / 100 : 0;

  return {
    totalViews: views,
    totalClicks: clicks,
    totalSaves: saves,
    totalShares: shares,
    engagementRate,
    activeListings: listingsResult.count ?? 0,
    totalInteractions: total,
  };
}

// ── Daily interaction trend (for line chart) ─────────────────

export interface DailyTrendPoint {
  date: string; // "MMM dd" formatted
  views: number;
  clicks: number;
  saves: number;
}

export async function getInteractionTrend(days = 30): Promise<DailyTrendPoint[]> {
  const { supabase, companyId } = await requireCompanyAuth();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("user_interactions")
    .select("action, created_at")
    .eq("company_id", companyId)
    .gte("created_at", startDate.toISOString())
    .order("created_at", { ascending: true });

  if (error) throw error;

  // Build a day-keyed map
  const dayMap: Record<string, DailyTrendPoint> = {};

  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dayMap[key] = { date: label, views: 0, clicks: 0, saves: 0 };
  }

  for (const row of data ?? []) {
    const key = row.created_at.split("T")[0];
    if (!dayMap[key]) continue;
    if (row.action === "view") dayMap[key].views++;
    if (row.action === "click") dayMap[key].clicks++;
    if (row.action === "save") dayMap[key].saves++;
  }

  return Object.values(dayMap);
}

// ── Category breakdown (for bar chart) ───────────────────────

export interface CategoryBreakdown {
  category: string;
  interactions: number;
}

export async function getCategoryBreakdown(): Promise<CategoryBreakdown[]> {
  const { supabase, companyId } = await requireCompanyAuth();

  // Join user_interactions → listings to get category
  const { data, error } = await supabase
    .from("user_interactions")
    .select("listings!inner(category)")
    .eq("company_id", companyId);

  if (error) throw error;

  const countMap: Record<string, number> = {};
  for (const row of data ?? []) {
    const cat = (row as { listings?: { category?: string } }).listings?.category ?? "Unknown";
    countMap[cat] = (countMap[cat] ?? 0) + 1;
  }

  return Object.entries(countMap)
    .map(([category, interactions]) => ({ category, interactions }))
    .sort((a, b) => b.interactions - a.interactions)
    .slice(0, 8);
}

// ── Action breakdown (for donut chart) ───────────────────────

export interface ActionBreakdown {
  action: string;
  count: number;
}

export async function getActionBreakdown(): Promise<ActionBreakdown[]> {
  const { supabase, companyId } = await requireCompanyAuth();

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data, error } = await supabase
    .from("user_interactions")
    .select("action")
    .eq("company_id", companyId)
    .gte("created_at", thirtyDaysAgo.toISOString());

  if (error) throw error;

  const countMap: Record<string, number> = { view: 0, click: 0, save: 0, share: 0 };
  for (const row of data ?? []) {
    countMap[row.action] = (countMap[row.action] ?? 0) + 1;
  }

  return Object.entries(countMap).map(([action, count]) => ({ action, count }));
}

// ── Peak hours (for bar chart) ────────────────────────────────

export interface PeakHourPoint {
  hour: string; // "2 AM", "3 PM"
  interactions: number;
}

export async function getPeakHours(): Promise<PeakHourPoint[]> {
  const { supabase, companyId } = await requireCompanyAuth();

  const { data, error } = await supabase
    .from("user_interactions")
    .select("created_at")
    .eq("company_id", companyId);

  if (error) throw error;

  const hourMap: Record<number, number> = {};
  for (let h = 0; h < 24; h++) hourMap[h] = 0;

  for (const row of data ?? []) {
    const hour = new Date(row.created_at).getHours();
    hourMap[hour]++;
  }

  return Object.entries(hourMap).map(([h, interactions]) => {
    const num = parseInt(h);
    const label = num === 0 ? "12 AM" : num < 12 ? `${num} AM` : num === 12 ? "12 PM" : `${num - 12} PM`;
    return { hour: label, interactions };
  });
}

// ── Top performing listings ───────────────────────────────────

export interface ListingPerformance {
  id: string;
  title: string;
  category: string;
  type: string;
  views: number;
  clicks: number;
  saves: number;
  ctr: number; // click-through-rate %
}

export async function getListingPerformance(limit = 10): Promise<ListingPerformance[]> {
  const { supabase, companyId } = await requireCompanyAuth();

  const [listingsResult, interactionsResult] = await Promise.all([
    supabase
      .from("listings")
      .select("id, title, category, type")
      .eq("company_id", companyId)
      .eq("status", "published"),
    supabase
      .from("user_interactions")
      .select("listing_id, action")
      .eq("company_id", companyId),
  ]);

  if (listingsResult.error) throw listingsResult.error;
  if (interactionsResult.error) throw interactionsResult.error;

  const listings = listingsResult.data ?? [];
  const interactions = interactionsResult.data ?? [];

  return listings
    .map((listing) => {
      const listingInteractions = interactions.filter((i) => i.listing_id === listing.id);
      const views = listingInteractions.filter((i) => i.action === "view").length;
      const clicks = listingInteractions.filter((i) => i.action === "click").length;
      const saves = listingInteractions.filter((i) => i.action === "save").length;
      const ctr = views > 0 ? Math.round((clicks / views) * 100 * 10) / 10 : 0;
      return { ...listing, views, clicks, saves, ctr };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, limit);
}

// ── AI Insights ───────────────────────────────────────────────

export async function getAiInsights(): Promise<DbAiInsight[]> {
  const { supabase, companyId } = await requireCompanyAuth();

  const { data, error } = await supabase
    .from("ai_insights")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data ?? []) as DbAiInsight[];
}

export async function markInsightRead(id: string): Promise<void> {
  const { supabase, companyId } = await requireCompanyAuth();
  await supabase
    .from("ai_insights")
    .update({ is_read: true })
    .eq("id", id)
    .eq("company_id", companyId);
}
