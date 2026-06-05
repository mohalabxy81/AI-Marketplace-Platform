"use client";

import { useListingPerformance, useCategoryBreakdown } from "@/hooks/use-analytics";
import { ChartContainer } from "@/features/analytics";
import dynamic from "next/dynamic";
import { AnalyticsTable } from "@/features/analytics";

const CategoryBarChart = dynamic(
  () => import("@/features/analytics/charts/bar-chart").then((mod) => mod.CategoryBarChart),
  { ssr: false, loading: () => <div className="h-full w-full flex items-center justify-center animate-pulse bg-[var(--color-surface-alt)] rounded-md" /> }
);

export default function AnalyticsListingsPage() {
  // We can fetch more listings here, e.g., limit 50
  const { data: listingData, isLoading: loadingListings } = useListingPerformance(50);
  const { data: categoryData, isLoading: loadingCategory } = useCategoryBreakdown();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">Listing Performance</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Deep dive into how individual listings and categories are performing.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Full Table */}
        <div className="lg:col-span-3 space-y-4">
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">All Published Listings</h3>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Ranked by total views.</p>
            </div>
            <AnalyticsTable data={listingData ?? []} isLoading={loadingListings} />
          </div>
        </div>

        {/* Categories Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          <ChartContainer
            title="Performance by Category"
            description="Total interactions per category."
            isLoading={loadingCategory}
            isEmpty={!categoryData || categoryData.length === 0}
            height={400}
          >
            <CategoryBarChart data={categoryData ?? []} />
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
