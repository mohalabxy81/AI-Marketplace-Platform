// features/ai/components/embedding-progress.tsx
"use client";

import { type EmbeddingStatus } from "@/types/super-admin/ai";

interface EmbeddingProgressProps {
  status: EmbeddingStatus;
  lastIndexedAt?: string | null;
}

export function EmbeddingProgress({ status, lastIndexedAt }: EmbeddingProgressProps) {
  const getBadgeStyle = () => {
    switch (status) {
      case "COMPLETED": return "bg-emerald-950/40 text-emerald-500 border-emerald-500/20";
      case "INDEXING": return "bg-amber-950/40 text-amber-500 border-amber-500/20 animate-pulse";
      case "FAILED": return "bg-red-950/40 text-red-500 border-red-500/20";
      case "STALE": return "bg-zinc-900 text-zinc-500 border-zinc-800";
    }
  };

  return (
    <div className="flex flex-col space-y-1">
      <span className={`inline-flex w-fit px-2 py-0.5 border font-bold text-[9px] uppercase ${getBadgeStyle()}`}>
        {status}
      </span>
      {lastIndexedAt && (
        <span className="text-[9px] text-zinc-600">
          Last: {new Date(lastIndexedAt).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
