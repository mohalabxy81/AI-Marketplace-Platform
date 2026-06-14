"use client";

import { MapPin } from "lucide-react";
import { usePeakHours, useActionBreakdown } from "@/hooks/use-analytics";
import { ChartContainer } from "@/features/analytics";
import dynamic from "next/dynamic";

const PeakHoursChart = dynamic(
  () => import("@/features/analytics/charts/peak-hours-chart").then((mod) => mod.PeakHoursChart),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center animate-pulse bg-[var(--color-surface-alt)] rounded-md" /> }
);

const ActionDonutChart = dynamic(
  () => import("@/features/analytics/charts/donut-chart").then((mod) => mod.ActionDonutChart),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center animate-pulse bg-[var(--color-surface-alt)] rounded-md" /> }
);

export default function BehaviorAnalyticsPage() {
  const { data: peakData, isLoading: loadingPeak } = usePeakHours();
  const { data: actionData, isLoading: loadingAction } = useActionBreakdown();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">User Behavior</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Understand when and how users are interacting with your listings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Peak Hours */}
        <ChartContainer
          title="Peak Activity Hours"
          description="Total interactions by time of day (local time)."
          isLoading={loadingPeak}
          isEmpty={!peakData || peakData.every((d) => d.interactions === 0)}
          height={300}
        >
          <PeakHoursChart data={peakData ?? []} />
        </ChartContainer>

        {/* Action Types */}
        <ChartContainer
          title="Interaction Types"
          description="Breakdown of actions taken by users."
          isLoading={loadingAction}
          isEmpty={!actionData || actionData.length === 0}
          height={300}
        >
          <ActionDonutChart data={actionData ?? []} />
        </ChartContainer>
      </div>

      {/* Placeholders for future features */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] p-8 text-center space-y-3">
          <MapPin className="h-8 w-8 text-[var(--color-text-muted)]/30 mx-auto" />
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">Location Analytics</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Coming soon: Heatmap of where your views and clicks are originating from.
            </p>
          </div>
        </div>
        <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] p-8 text-center space-y-3">
          <div className="flex justify-center gap-2 text-[var(--color-text-muted)]/30">
            <div className="h-8 w-6 border-2 border-current rounded-sm" />
            <div className="h-8 w-10 border-2 border-current rounded-sm" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">Device Breakdown</p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Coming soon: Mobile vs Desktop engagement metrics.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
