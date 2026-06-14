"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendIndicatorProps {
  delta: number; // positive = up, negative = down, 0 = flat
  size?: "sm" | "md";
}

export function TrendIndicator({ delta, size = "sm" }: TrendIndicatorProps) {
  const isUp = delta > 0;
  const isDown = delta < 0;
  const isFlat = delta === 0;

  const textClass = isUp
    ? "text-emerald-400"
    : isDown
    ? "text-red-400"
    : "text-[var(--color-text-muted)]";

  const bgClass = isUp
    ? "bg-emerald-500/10"
    : isDown
    ? "bg-red-500/10"
    : "bg-[var(--color-surface-alt)]";

  const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus;
  const label = isFlat ? "0%" : `${isUp ? "+" : ""}${delta.toFixed(1)}%`;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${textClass} ${bgClass}`}
      aria-label={`Trend: ${label}`}
    >
      <Icon className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
      {label}
    </span>
  );
}
