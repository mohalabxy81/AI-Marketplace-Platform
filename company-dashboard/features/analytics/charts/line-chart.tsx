"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DailyTrendPoint } from "@/services/analytics/analytics.service";

interface InteractionLineChartProps {
  data: DailyTrendPoint[];
}

export function InteractionLineChart({ data }: InteractionLineChartProps) {
  // Recharts requires explicit hex/rgba for gradients, not css variables easily
  // In a real app we might read computed styles, but for simplicity we hardcode standard values
  // matching our design system's blue/indigo vibe.
  const strokeColor = "#6366f1"; // indigo-500
  const fillColor = "#818cf8"; // indigo-400

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={fillColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={fillColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "var(--color-text-muted)" }}
          dy={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12, fill: "var(--color-text-muted)" }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="views"
          stroke={strokeColor}
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorViews)"
          activeDot={{ r: 4, fill: strokeColor, stroke: "var(--color-surface)", strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: DailyTrendPoint }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: TooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)]/95 backdrop-blur-sm p-3 shadow-lg">
        <p className="text-xs font-medium text-[var(--color-text-muted)] mb-2">{label}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-indigo-500" />
            <p className="text-sm font-medium text-[var(--color-text)]">
              {payload[0].value.toLocaleString()}{" "}
              <span className="text-xs text-[var(--color-text-muted)] font-normal">Views</span>
            </p>
          </div>
          {payload[0].payload.clicks > 0 && (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <p className="text-sm font-medium text-[var(--color-text)]">
                {payload[0].payload.clicks.toLocaleString()}{" "}
                <span className="text-xs text-[var(--color-text-muted)] font-normal">Clicks</span>
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
}
