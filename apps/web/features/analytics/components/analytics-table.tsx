"use client";

import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { ListingPerformance } from "@/services/analytics/analytics.service";

interface AnalyticsTableProps {
  data: ListingPerformance[];
  isLoading?: boolean;
}

export function AnalyticsTable({ data, isLoading }: AnalyticsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-[var(--color-surface-alt)]" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-sm text-[var(--color-text-muted)]">No published listings yet</p>
        <p className="text-xs text-[var(--color-text-muted)]/60 mt-1">
          Publish listings to see their performance data
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)]">
            <th className="pb-3 pl-0 pr-4 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              #
            </th>
            <th className="pb-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              Listing
            </th>
            <th className="pb-3 px-4 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              Views
            </th>
            <th className="pb-3 px-4 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              Clicks
            </th>
            <th className="pb-3 px-4 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              Saves
            </th>
            <th className="pb-3 pl-4 pr-0 text-right text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              CTR
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-border)]">
          {data.map((listing, idx) => (
            <tr
              key={listing.id}
              className="group transition-colors hover:bg-[var(--color-surface-alt)]"
            >
              <td className="py-3 pl-0 pr-4 text-[var(--color-text-muted)] font-mono text-xs">
                {idx + 1}
              </td>
              <td className="py-3 px-4">
                <div>
                  <p className="font-medium text-[var(--color-text)] truncate max-w-[220px]">
                    {listing.title}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] capitalize mt-0.5">
                    {listing.category} · {listing.type.replace("_", " ")}
                  </p>
                </div>
              </td>
              <td className="py-3 px-4 text-right font-mono text-[var(--color-text)]">
                {listing.views.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-right font-mono text-[var(--color-text)]">
                {listing.clicks.toLocaleString()}
              </td>
              <td className="py-3 px-4 text-right font-mono text-[var(--color-text)]">
                {listing.saves.toLocaleString()}
              </td>
              <td className="py-3 pl-4 pr-0 text-right">
                <CTRBadge ctr={listing.ctr} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CTRBadge({ ctr }: { ctr: number }) {
  const isGood = ctr >= 5;
  const isOk = ctr >= 2 && ctr < 5;

  const colorClass = isGood
    ? "text-emerald-400"
    : isOk
    ? "text-amber-400"
    : "text-[var(--color-text-muted)]";

  const Icon = isGood ? ArrowUpRight : isOk ? Minus : ArrowDownRight;

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-mono font-medium ${colorClass}`}>
      <Icon className="h-3 w-3" />
      {ctr}%
    </span>
  );
}
