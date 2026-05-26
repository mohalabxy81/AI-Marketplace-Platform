"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PeakHourPoint } from "@/services/analytics/analytics.service";

interface PeakHoursChartProps {
  data: PeakHourPoint[];
}

export function PeakHoursChart({ data }: PeakHoursChartProps) {
  const fillColor = "#8b5cf6"; // violet-500
  const hoverColor = "#a855f7"; // purple-500

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="hour"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 11, fill: "var(--color-text-muted)" }}
        />
        <Tooltip cursor={{ fill: "var(--color-surface-alt)", opacity: 0.5 }} content={<CustomTooltip />} />
        <Bar
          dataKey="interactions"
          fill={fillColor}
          radius={[4, 4, 0, 0]}
          activeBar={{ fill: hoverColor }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm p-3 shadow-lg">
        <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-violet-500" />
          <p className="text-sm font-medium text-[var(--color-text)]">
            {payload[0].value.toLocaleString()}{" "}
            <span className="text-xs text-[var(--color-text-muted)] font-normal">Interactions</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
}
