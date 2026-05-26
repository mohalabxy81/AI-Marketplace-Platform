// features/analytics/hooks/use-analytics-data.ts
import { useQuery } from "@tanstack/react-query";
import { aggregationService } from "../services/aggregation.service";

export function useAnalyticsSnapshotsQuery(days: number = 30) {
  return useQuery({
    queryKey: ["super-admin", "analytics-snapshots", days],
    queryFn: () => aggregationService.getSnapshots(days),
    staleTime: 5 * 60 * 1000
  });
}

export function usePlanDistributionQuery() {
  return useQuery({
    queryKey: ["super-admin", "analytics-plan-distribution"],
    queryFn: () => aggregationService.getPlanDistribution(),
    staleTime: 5 * 60 * 1000
  });
}

export function useMRRHistoryQuery(days: number = 30) {
  return useQuery({
    queryKey: ["super-admin", "analytics-mrr-history", days],
    queryFn: async () => {
      const snapshots = await aggregationService.getSnapshots(days);
      return snapshots.map(s => ({
        date: s.snapshot_date,
        mrr: s.total_mrr
      }));
    },
    staleTime: 5 * 60 * 1000
  });
}
