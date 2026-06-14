// features/billing/components/quota-meter.tsx
"use client";

interface QuotaMeterProps {
  resourceName: string;
  current: number;
  limit: number;
}

export function QuotaMeter({ resourceName, current, limit }: QuotaMeterProps) {
  const percentage = Math.min(100, Math.max(0, (current / Math.max(limit, 1)) * 100));
  
  let color = "bg-emerald-500";
  if (percentage > 80) color = "bg-amber-500";
  if (percentage > 95) color = "bg-red-500";

  return (
    <div className="space-y-1 w-full">
      <div className="flex justify-between text-[10px] uppercase font-bold text-zinc-400">
        <span>{resourceName.replace(/_/g, " ")}</span>
        <span>{current.toLocaleString()} / {limit.toLocaleString()}</span>
      </div>
      <div className="h-1.5 w-full bg-zinc-900 border border-zinc-800 overflow-hidden">
        <div 
          className={`h-full ${color} transition-all duration-500`} 
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
