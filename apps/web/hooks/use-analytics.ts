"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAnalyticsOverview,
  getInteractionTrend,
  getCategoryBreakdown,
  getActionBreakdown,
  getPeakHours,
  getListingPerformance,
  getAiInsights,
  markInsightRead,
} from "@/services/analytics/analytics.service";

// Analytics data is relatively slow-changing — 5 min stale time
const ANALYTICS_STALE_TIME = 5 * 60 * 1000;

export function useAnalyticsOverview() {
  return useQuery({
    queryKey: ["analytics", "overview"],
    queryFn: getAnalyticsOverview,
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function useInteractionTrend(days = 30) {
  return useQuery({
    queryKey: ["analytics", "trend", days],
    queryFn: () => getInteractionTrend(days),
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function useCategoryBreakdown() {
  return useQuery({
    queryKey: ["analytics", "categories"],
    queryFn: getCategoryBreakdown,
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function useActionBreakdown() {
  return useQuery({
    queryKey: ["analytics", "actions"],
    queryFn: getActionBreakdown,
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function usePeakHours() {
  return useQuery({
    queryKey: ["analytics", "peak-hours"],
    queryFn: getPeakHours,
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function useListingPerformance(limit = 10) {
  return useQuery({
    queryKey: ["analytics", "listing-performance", limit],
    queryFn: () => getListingPerformance(limit),
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function useAiInsights() {
  return useQuery({
    queryKey: ["analytics", "ai-insights"],
    queryFn: getAiInsights,
    staleTime: ANALYTICS_STALE_TIME,
  });
}

export function useMarkInsightRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markInsightRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["analytics", "ai-insights"] });
    },
  });
}
