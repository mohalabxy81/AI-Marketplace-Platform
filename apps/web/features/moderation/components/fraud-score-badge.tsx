// features/moderation/components/fraud-score-badge.tsx
"use client";

interface FraudScoreBadgeProps {
  score: number;
}

export function FraudScoreBadge({ score }: FraudScoreBadgeProps) {
  let colorClass = "bg-emerald-950/40 text-emerald-500 border-emerald-500/20";
  if (score >= 40) colorClass = "bg-amber-950/40 text-amber-500 border-amber-500/20";
  if (score >= 70) colorClass = "bg-red-950/40 text-red-500 border-red-500/20 animate-pulse";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 border font-bold text-[10px] uppercase ${colorClass}`}>
      SCORE: {score.toFixed(1)}
    </span>
  );
}
