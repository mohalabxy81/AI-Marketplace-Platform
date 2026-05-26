"use client";

import { Eye, MousePointerClick, Bookmark, Percent } from "lucide-react";
import { useAnalyticsOverview, useInteractionTrend, useCategoryBreakdown, useActionBreakdown, useListingPerformance, useAiInsights, useMarkInsightRead } from "@/hooks/use-analytics";
import { AnalyticsCard } from "@/features/analytics/components/analytics-card";
import { ChartContainer } from "@/features/analytics/components/chart-container";
import { AIRecommendationCard, AIInsightPlaceholder } from "@/features/analytics/components/ai-recommendation-card";
import dynamic from "next/dynamic";
import { AnalyticsTable } from "@/features/analytics/components/analytics-table";

const InteractionLineChart = dynamic(
  () => import("@/features/analytics/charts/line-chart").then((mod) => mod.InteractionLineChart),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center animate-pulse bg-[var(--color-surface-alt)] rounded-md" /> }
);

const CategoryBarChart = dynamic(
  () => import("@/features/analytics/charts/bar-chart").then((mod) => mod.CategoryBarChart),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center animate-pulse bg-[var(--color-surface-alt)] rounded-md" /> }
);

const ActionDonutChart = dynamic(
  () => import("@/features/analytics/charts/donut-chart").then((mod) => mod.ActionDonutChart),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center animate-pulse bg-[var(--color-surface-alt)] rounded-md" /> }
);
import { usePermissions } from "@/hooks/use-permissions";

export default function AnalyticsOverviewPage() {
  const { can } = usePermissions();
  const isViewer = !can("manage_listings");

  const { data: overview, isLoading: loadingOverview } = useAnalyticsOverview();
  const { data: trendData, isLoading: loadingTrend } = useInteractionTrend(30);
  const { data: categoryData, isLoading: loadingCategory } = useCategoryBreakdown();
  const { data: actionData, isLoading: loadingAction } = useActionBreakdown();
  const { data: listingData, isLoading: loadingListings } = useListingPerformance(5);
  const { data: insightsData, isLoading: loadingInsights } = useAiInsights();
  const { mutate: markRead } = useMarkInsightRead();

  const unreadInsights = insightsData?.filter((i) => !i.is_read) ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">Analytics Overview</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Monitor performance, user behavior, and AI-driven insights across your company.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <AnalyticsCard
          label="Total Views"
          value={overview?.totalViews ?? 0}
          delta={overview?.totalViews && overview.totalViews > 0 ? 12.5 : 0} // Placeholder delta until we track historical snapshots
          icon={<Eye className="h-4 w-4" />}
          isLoading={loadingOverview}
        />
        <AnalyticsCard
          label="Total Clicks"
          value={overview?.totalClicks ?? 0}
          delta={overview?.totalClicks && overview.totalClicks > 0 ? 8.2 : 0}
          icon={<MousePointerClick className="h-4 w-4" />}
          isLoading={loadingOverview}
        />
        <AnalyticsCard
          label="Saves & Shares"
          value={(overview?.totalSaves ?? 0) + (overview?.totalShares ?? 0)}
          delta={overview?.totalSaves && overview.totalSaves > 0 ? 3.1 : 0}
          icon={<Bookmark className="h-4 w-4" />}
          isLoading={loadingOverview}
        />
        <AnalyticsCard
          label="Engagement Rate"
          value={`${overview?.engagementRate ?? 0}%`}
          delta={overview?.engagementRate && overview.engagementRate > 0 ? -1.2 : 0}
          icon={<Percent className="h-4 w-4" />}
          isLoading={loadingOverview}
        />
      </div>

      {/* Main Charts */}
      {!isViewer && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ChartContainer
              title="Interaction Trend (30 Days)"
              description="Views and clicks over the last month."
              isLoading={loadingTrend}
              isEmpty={!trendData || trendData.every((d) => d.views === 0)}
              height={300}
            >
              <InteractionLineChart data={trendData ?? []} />
            </ChartContainer>
          </div>
          <div className="lg:col-span-1">
            <ChartContainer
              title="Action Breakdown"
              description="Types of interactions recorded."
              isLoading={loadingAction}
              isEmpty={!actionData || actionData.length === 0}
              height={300}
            >
              <ActionDonutChart data={actionData ?? []} />
            </ChartContainer>
          </div>
        </div>
      )}

      {/* Lower Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Top Listings */}
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">Top Performing Listings</h3>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Highest views and engagement this month.</p>
            </div>
            <AnalyticsTable data={listingData ?? []} isLoading={loadingListings} />
          </div>
        </div>

        {/* AI Insights & Categories */}
        <div className="lg:col-span-1 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">AI Insights</h3>
              {unreadInsights.length > 0 && (
                <span className="flex h-5 items-center justify-center rounded-full bg-blue-500/10 px-2 text-[10px] font-bold text-blue-500">
                  {unreadInsights.length} NEW
                </span>
              )}
            </div>
            {loadingInsights ? (
              <div className="space-y-3 animate-pulse">
                <div className="h-24 rounded-lg bg-[var(--color-surface-alt)]" />
                <div className="h-24 rounded-lg bg-[var(--color-surface-alt)]" />
              </div>
            ) : insightsData && insightsData.length > 0 ? (
              <div className="space-y-3">
                {insightsData.slice(0, 3).map((insight) => (
                  <AIRecommendationCard
                    key={insight.id}
                    insight={insight}
                    onDismiss={() => markRead(insight.id)}
                  />
                ))}
              </div>
            ) : (
              <AIInsightPlaceholder />
            )}
          </div>

          {!isViewer && (
            <ChartContainer
              title="Top Categories"
              description="Most active listing categories."
              isLoading={loadingCategory}
              isEmpty={!categoryData || categoryData.length === 0}
              height={220}
            >
              <CategoryBarChart data={categoryData ?? []} />
            </ChartContainer>
          )}
        </div>
      </div>
    </div>
  );
}
