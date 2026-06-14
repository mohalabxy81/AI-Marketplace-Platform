"use client";

import Link from "next/link";
import { Plus, Activity, ArrowUpRight, TrendingUp, Eye, Layers, Star } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  PageContainer,
  PageHeader,
  PageTitle,
  PageDescription,
  PageContent,
} from "@/components/layout/page-container";
import { Button } from "@/components/ui/button";
import { useListings } from "@/hooks/use-listings";
import { useAnalyticsOverview, useAiInsights, useInteractionTrend } from "@/hooks/use-analytics";
import dynamic from "next/dynamic";

const InteractionLineChart = dynamic(
  () => import("@/features/analytics/charts/line-chart").then((m) => m.InteractionLineChart),
  { ssr: false }
);

// ── Stat Card ─────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  trend,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; label: string };
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="skeleton h-28 rounded-[var(--radius-sm)] border border-[var(--color-border)]" />
    );
  }
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">
          {label}
        </span>
        <span className="text-[var(--color-text-muted)]">{icon}</span>
      </div>
      <p className="text-3xl font-bold tracking-tight text-[var(--color-text)]">
        {value}
      </p>
      {trend && (
        <p
          className={`text-xs flex items-center gap-1 ${
            trend.value >= 0
              ? "text-[var(--color-success)]"
              : "text-[var(--color-error)]"
          }`}
        >
          <TrendingUp className="h-3 w-3" />
          {trend.value >= 0 ? "+" : ""}
          {trend.value}% {trend.label}
        </p>
      )}
    </div>
  );
}

// ── Recent Listings Row ────────────────────────────────────────

function ListingRow({
  title,
  category,
  status,
  price,
  id,
}: {
  title: string;
  category: string;
  status: string;
  price: number;
  id: string;
}) {
  const statusColors: Record<string, string> = {
    published: "text-green-400 bg-green-400/10",
    active:    "text-green-400 bg-green-400/10",
    draft:     "text-yellow-400 bg-yellow-400/10",
    archived:  "text-[var(--color-text-muted)] bg-[var(--color-surface-alt)]",
    rejected:  "text-red-400 bg-red-400/10",
    pending_review: "text-blue-400 bg-blue-400/10",
  };
  const color = statusColors[status] ?? statusColors.draft;

  return (
    <Link
      href={`/listings/${id}`}
      className="flex items-center justify-between py-3 border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-alt)] -mx-1 px-1 rounded-[var(--radius-xs)] transition-colors group"
    >
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-[var(--color-text)] truncate group-hover:text-[var(--color-accent)] transition-colors">
          {title}
        </span>
        <span className="text-xs text-[var(--color-text-muted)] capitalize">{category}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0 ml-3">
        <span className={`text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${color}`}>
          {status.replace("_", " ")}
        </span>
        <span className="text-sm font-mono text-[var(--color-text)]">
          ${price?.toLocaleString()}
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 text-[var(--color-text-muted)] group-hover:text-[var(--color-accent)] transition-colors" />
      </div>
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function OverviewPage() {
  const { user, company } = useAuth();
  const { data: listings, isLoading: listingsLoading } = useListings();
  const { data: overview, isLoading: overviewLoading } = useAnalyticsOverview();
  const { data: insights } = useAiInsights();
  const { data: trendData, isLoading: trendLoading } = useInteractionTrend(14);

  const recentListings = listings?.slice(0, 5) ?? [];
  const activeCount  = listings?.filter((l) => l.status === "published").length ?? 0;
  const draftCount   = listings?.filter((l) => l.status === "draft").length ?? 0;
  const unreadInsights = insights?.filter((i) => !i.is_read).length ?? 0;

  return (
    <PageContainer>
      <PageHeader>
        <div>
          <PageTitle>Welcome back, {user?.full_name || "User"}</PageTitle>
          <PageDescription>
            Here is what is happening in <strong>{company?.name || "your workspace"}</strong> today.
          </PageDescription>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/analytics">
            <Button variant="outline" leftIcon={<Activity className="h-4 w-4" />}>
              Analytics
            </Button>
          </Link>
          <Link href="/listings/create">
            <Button leftIcon={<Plus className="h-4 w-4" />}>New Listing</Button>
          </Link>
        </div>
      </PageHeader>

      <PageContent className="space-y-8">
        {/* KPI Stat Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Listings"
            value={listings?.length ?? 0}
            icon={<Layers className="h-4 w-4" />}
            loading={listingsLoading}
          />
          <StatCard
            label="Active Listings"
            value={activeCount}
            icon={<Star className="h-4 w-4" />}
            loading={listingsLoading}
          />
          <StatCard
            label="Total Views (30d)"
            value={overview?.totalViews?.toLocaleString() ?? "0"}
            icon={<Eye className="h-4 w-4" />}
            loading={overviewLoading}
            trend={overview?.totalViews ? { value: 12.5, label: "vs last month" } : undefined}
          />
          <StatCard
            label="Engagement Rate"
            value={`${overview?.engagementRate ?? 0}%`}
            icon={<TrendingUp className="h-4 w-4" />}
            loading={overviewLoading}
          />
        </div>

        {/* Main Content — 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Trend Chart */}
          <div className="lg:col-span-2 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">
                Interaction Trend <span className="text-[var(--color-text-muted)] font-normal">(14 days)</span>
              </h3>
            </div>
            {trendLoading ? (
              <div className="h-48 skeleton rounded-[var(--radius-xs)]" />
            ) : (
              <div className="h-48">
                <InteractionLineChart data={trendData ?? []} />
              </div>
            )}
          </div>

          {/* Right: Quick Stats + AI Insight */}
          <div className="space-y-4">
            <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-4">
              <h3 className="text-sm font-semibold text-[var(--color-text)]">Listing Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: "Active / Published", value: activeCount, color: "bg-green-400" },
                  { label: "Drafts", value: draftCount, color: "bg-yellow-400" },
                  {
                    label: "Total",
                    value: listings?.length ?? 0,
                    color: "bg-[var(--color-accent)]",
                  },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`h-2 w-2 rounded-full ${item.color}`} />
                      <span className="text-xs text-[var(--color-text-muted)]">{item.label}</span>
                    </div>
                    <span className="text-sm font-semibold text-[var(--color-text)]">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {unreadInsights > 0 && (
              <Link href="/analytics" className="block rounded-[var(--radius-sm)] border border-[var(--color-accent)]/40 bg-[var(--color-accent-dim)] p-4 hover:border-[var(--color-accent)] transition-colors">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-[var(--color-accent)]">
                    {unreadInsights} New AI Insight{unreadInsights !== 1 ? "s" : ""}
                  </p>
                  <ArrowUpRight className="h-3.5 w-3.5 text-[var(--color-accent)]" />
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  View recommendations on your analytics page
                </p>
              </Link>
            )}
          </div>
        </div>

        {/* Recent Listings */}
        <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Recent Listings</h3>
            <Link href="/listings" className="text-xs text-[var(--color-accent)] hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {listingsLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="skeleton h-10 rounded-[var(--radius-xs)]" />
              ))}
            </div>
          ) : recentListings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 border border-dashed border-[var(--color-border)] rounded-[var(--radius-xs)]">
              <Layers className="h-8 w-8 text-[var(--color-text-subtle)] mb-2" />
              <p className="text-sm text-[var(--color-text-muted)]">No listings yet</p>
              <Link href="/listings/create" className="mt-3">
                <Button size="sm" leftIcon={<Plus className="h-3.5 w-3.5" />}>
                  Create your first listing
                </Button>
              </Link>
            </div>
          ) : (
            <div>
              {recentListings.map((l) => (
                <ListingRow
                  key={l.id}
                  id={l.id}
                  title={l.title}
                  category={l.category}
                  status={l.status}
                  price={l.price}
                />
              ))}
            </div>
          )}
        </div>
      </PageContent>
    </PageContainer>
  );
}
