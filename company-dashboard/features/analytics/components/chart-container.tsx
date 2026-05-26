"use client";

import * as React from "react";
import { BarChart2 } from "lucide-react";

interface ChartContainerProps {
  title: string;
  description?: string;
  isLoading?: boolean;
  isEmpty?: boolean;
  error?: Error | null;
  height?: number;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function ChartContainer({
  title,
  description,
  isLoading,
  isEmpty,
  error,
  height = 280,
  children,
  action,
}: ChartContainerProps) {
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 px-5 py-4 border-b border-[var(--color-border)]">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">{title}</h3>
          {description && (
            <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{description}</p>
          )}
        </div>
        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      {/* Body */}
      <div className="p-5">
        {isLoading ? (
          <ChartSkeleton height={height} />
        ) : error ? (
          <ChartError height={height} message={error.message} />
        ) : isEmpty ? (
          <ChartEmpty height={height} />
        ) : (
          <div style={{ height }}>{children}</div>
        )}
      </div>
    </div>
  );
}

// Stable heights to avoid calling Math.random() during render (impure)
const SKELETON_HEIGHTS = [35, 72, 55, 88, 43, 60, 78, 30, 91, 48, 65, 50];

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div
      className="animate-pulse rounded-lg bg-[var(--color-surface-alt)] flex flex-col justify-end gap-1 px-4 py-2"
      style={{ height }}
    >
      <div className="flex items-end gap-2 h-3/4">
        {SKELETON_HEIGHTS.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-sm bg-[var(--color-border)]"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="h-3 w-1/2 rounded bg-[var(--color-border)]" />
    </div>
  );
}

function ChartEmpty({ height }: { height: number }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-[var(--color-border)]"
      style={{ height }}
    >
      <BarChart2 className="h-10 w-10 text-[var(--color-text-muted)]/30" />
      <div className="text-center">
        <p className="text-sm font-medium text-[var(--color-text-muted)]">No data yet</p>
        <p className="text-xs text-[var(--color-text-muted)]/60 mt-1">
          Data will appear here once there&apos;s activity
        </p>
      </div>
    </div>
  );
}

function ChartError({ height, message }: { height: number; message: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5"
      style={{ height }}
    >
      <p className="text-sm text-red-400">Failed to load chart data</p>
      <p className="text-xs text-[var(--color-text-muted)]">{message}</p>
    </div>
  );
}
