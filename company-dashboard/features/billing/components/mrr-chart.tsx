// features/billing/components/mrr-chart.tsx
"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

interface MRRChartProps {
  data: { date: string; mrr: number }[];
  isLoading?: boolean;
}

export function MRRChart({ data, isLoading }: MRRChartProps) {
  if (isLoading) {
    return <div className="flex h-full items-center justify-center text-zinc-600">LOADING_MRR_DATA...</div>;
  }

  if (!data || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-zinc-600">NO_MRR_DATA_AVAILABLE</div>;
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1}/>
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="date" stroke="#71717a" fontSize={9} />
        <YAxis stroke="#71717a" fontSize={9} tickFormatter={(v) => `$${v}`} />
        <Tooltip 
          contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: 0 }}
          labelStyle={{ color: "#71717a", fontSize: 9 }}
          itemStyle={{ color: "#f59e0b", fontSize: 10 }}
        />
        <Area type="monotone" dataKey="mrr" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorMrr)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
