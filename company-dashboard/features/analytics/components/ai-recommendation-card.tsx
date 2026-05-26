"use client";

import { Sparkles, TrendingUp, AlertTriangle, Lightbulb, X } from "lucide-react";
import type { DbAiInsight, InsightType } from "@/types/database";

const INSIGHT_CONFIG: Record<
  InsightType,
  { icon: React.FC<{ className?: string }>; color: string; bg: string; border: string; label: string }
> = {
  performance: {
    icon: TrendingUp,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    label: "Performance",
  },
  trend: {
    icon: Sparkles,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    label: "Trend",
  },
  warning: {
    icon: AlertTriangle,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    label: "Warning",
  },
  opportunity: {
    icon: Lightbulb,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    label: "Opportunity",
  },
};

interface AIRecommendationCardProps {
  insight: DbAiInsight;
  onDismiss?: (id: string) => void;
}

export function AIRecommendationCard({ insight, onDismiss }: AIRecommendationCardProps) {
  const config = INSIGHT_CONFIG[insight.type];
  const Icon = config.icon;

  return (
    <div
      className={`relative rounded-[var(--radius-sm)] border ${config.border} ${config.bg} p-4 transition-all duration-200 hover:shadow-md ${insight.is_read ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`mt-0.5 flex-shrink-0 ${config.color}`}>
          <Icon className="h-4 w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
              {config.label}
            </span>
            {insight.score !== null && (
              <span className="text-xs text-[var(--color-text-muted)]">
                Score:{" "}
                <span className="font-medium text-[var(--color-text)]">{insight.score}/10</span>
              </span>
            )}
          </div>
          <p className="text-sm font-semibold text-[var(--color-text)] leading-snug">
            {insight.title}
          </p>
          <p className="text-xs text-[var(--color-text-muted)] leading-relaxed">{insight.body}</p>
        </div>

        {/* Dismiss */}
        {onDismiss && (
          <button
            onClick={() => onDismiss(insight.id)}
            className="flex-shrink-0 rounded-[var(--radius-xs)] p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] transition-colors"
            aria-label="Dismiss insight"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// Placeholder card shown when no real AI insights exist
export function AIInsightPlaceholder() {
  return (
    <div className="rounded-[var(--radius-sm)] border border-dashed border-[var(--color-border)] p-6 text-center space-y-2">
      <Sparkles className="h-8 w-8 text-[var(--color-text-muted)]/30 mx-auto" />
      <p className="text-sm font-medium text-[var(--color-text-muted)]">No insights yet</p>
      <p className="text-xs text-[var(--color-text-muted)]/60">
        AI insights will appear here as your listings accumulate engagement data.
      </p>
    </div>
  );
}
