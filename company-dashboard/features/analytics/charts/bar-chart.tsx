"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { CategoryBreakdown } from "@/services/analytics/analytics.service";

interface CategoryBarChartProps {
  data: CategoryBreakdown[];
}

export function CategoryBarChart({ data }: CategoryBarChartProps) {
  // Array of colors for different bars
  const colors = [
    "#6366f1", // indigo-500
    "#10b981", // emerald-500
    "#34d399", // emerald-400
    "#14b8a6", // teal-500
    "#ec4899", // pink-500
    "#f43f5e", // rose-500
    "#ef4444", // red-500
    "#f97316", // orange-500
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 10, left: 10, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
        <XAxis
          type="number"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "var(--color-text-muted)" }}
        />
        <YAxis
          dataKey="category"
          type="category"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "var(--color-text)" }}
          tickFormatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
          width={80}
        />
        <Tooltip cursor={{ fill: "var(--color-surface-alt)", opacity: 0.5 }} content={<CustomTooltip />} />
        <Bar dataKey="interactions" radius={[0, 4, 4, 0]} barSize={24}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: CategoryBreakdown }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm p-3 shadow-lg">
        <p className="text-sm font-medium text-[var(--color-text)] capitalize mb-1">
          {data.category}
        </p>
        <p className="text-xs text-[var(--color-text-muted)]">
          <span className="font-medium text-[var(--color-text)]">
            {data.interactions.toLocaleString()}
          </span>{" "}
          interactions
        </p>
      </div>
    );
  }
  return null;
}
