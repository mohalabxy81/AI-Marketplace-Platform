import { cn } from "@/lib/utils";

// ── Skeleton ──────────────────────────────────────────────────

interface SkeletonProps {
  className?: string;
  count?: number;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "skeleton rounded-[var(--radius-xs)]",
        className
      )}
    />
  );
}

// ── Skeleton Card ─────────────────────────────────────────────

export function SkeletonCard() {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xs)] p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-px w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-3/4" />
    </div>
  );
}

// ── Skeleton Row ──────────────────────────────────────────────

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-3 border-b border-[var(--color-border)]">
      <Skeleton className="h-8 w-8 shrink-0" />
      <Skeleton className="h-3 flex-1" />
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-5 w-16" />
    </div>
  );
}

// ── Skeleton Stat Card ────────────────────────────────────────

export function SkeletonStatCard() {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-xs)] p-5 space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-8 w-8" />
      </div>
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}
