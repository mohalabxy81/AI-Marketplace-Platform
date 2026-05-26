"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { ActionBreakdown } from "@/services/analytics/analytics.service";

interface ActionDonutChartProps {
  data: ActionBreakdown[];
}

export function ActionDonutChart({ data }: ActionDonutChartProps) {
  // Map actions to specific semantic colors
  const colorMap: Record<string, string> = {
    view: "#6366f1", // indigo-500
    click: "#10b981", // emerald-500
    save: "#f59e0b", // amber-500
    share: "#ec4899", // pink-500
  };

  const defaultColor = "#94a3b8"; // slate-400

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="45%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="count"
          nameKey="action"
          stroke="none"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colorMap[entry.action] || defaultColor} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          formatter={(value) => <span className="text-xs text-[var(--color-text)] capitalize">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: ActionBreakdown & { fill?: string } }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm p-3 shadow-lg flex items-center gap-2">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: payload[0].payload.fill }} />
        <p className="text-sm font-medium text-[var(--color-text)] capitalize">
          {data.action}: <span className="font-bold">{data.count.toLocaleString()}</span>
        </p>
      </div>
    );
  }
  return null;
}
