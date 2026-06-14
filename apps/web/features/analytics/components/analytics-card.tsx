"use client";

import * as React from "react";
import { TrendIndicator } from "./trend-indicator";

interface AnalyticsCardProps {
  label: string;
  value: string | number;
  delta?: number; // percentage change
  icon: React.ReactNode;
  isLoading?: boolean;
  description?: string;
}

export function AnalyticsCard({
  label,
  value,
  delta,
  icon,
  isLoading,
  description,
}: AnalyticsCardProps) {
  if (isLoading) {
    return (
      <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 space-y-3 animate-pulse">
        <div className="h-4 w-24 rounded bg-[var(--color-surface-alt)]" />
        <div className="h-8 w-32 rounded bg-[var(--color-surface-alt)]" />
        <div className="h-3 w-16 rounded bg-[var(--color-surface-alt)]" />
      </div>
    );
  }

  return (
    <div className="group relative rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-all duration-200 hover:border-[var(--color-accent)]/40 hover:shadow-lg hover:shadow-black/10 overflow-hidden">
      {/* Subtle gradient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

      <div className="relative space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
            {label}
          </span>
          <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-xs)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
            {icon}
          </span>
        </div>

        <div className="flex items-end gap-3">
          <span className="text-3xl font-bold tracking-tight text-[var(--color-text)]">
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {delta !== undefined && <TrendIndicator delta={delta} />}
        </div>

        {description && (
          <p className="text-xs text-[var(--color-text-muted)]">{description}</p>
        )}
      </div>
    </div>
  );
}
