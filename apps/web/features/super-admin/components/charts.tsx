"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// ==========================================
// Admin Growth Chart (Area)
// ==========================================
interface GrowthDataPoint {
  date: string;
  tenants: number;
  active: number;
}

interface AdminGrowthChartProps {
  data: GrowthDataPoint[];
}

export function AdminGrowthChart({ data }: AdminGrowthChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="date" stroke="#71717a" fontSize={9} />
        <YAxis stroke="#71717a" fontSize={9} />
        <Tooltip
          contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: 0 }}
          labelStyle={{ color: "#71717a", fontSize: 9 }}
        />
        <Area
          type="monotone"
          dataKey="tenants"
          stroke="#f59e0b"
          fill="#f59e0b"
          fillOpacity={0.05}
          name="Total Tenants"
        />
        <Area
          type="monotone"
          dataKey="active"
          stroke="#10b981"
          fill="#10b981"
          fillOpacity={0.05}
          name="Active Tenants"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ==========================================
// Admin Latency Chart (Line)
// ==========================================
interface LatencyDataPoint {
  index: number;
  latency: number;
  tokens: number;
}

interface AdminLatencyChartProps {
  data: LatencyDataPoint[];
}

export function AdminLatencyChart({ data }: AdminLatencyChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
        <XAxis dataKey="index" stroke="#71717a" fontSize={9} />
        <YAxis stroke="#71717a" fontSize={9} />
        <Tooltip
          contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: 0 }}
          labelStyle={{ color: "#71717a", fontSize: 9 }}
        />
        <Line
          type="monotone"
          dataKey="latency"
          stroke="#ef4444"
          strokeWidth={2}
          activeDot={{ r: 4 }}
          name="Latency (ms)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// ==========================================
// Admin MRR Chart (Area with Gradient)
// ==========================================
interface MRRDataPoint {
  date: string;
  mrr: number;
}

interface AdminMRRChartProps {
  data: MRRDataPoint[];
}

export function AdminMRRChart({ data }: AdminMRRChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
        <Area
          type="monotone"
          dataKey="mrr"
          stroke="#f59e0b"
          strokeWidth={2}
          fillOpacity={1}
          fill="url(#colorMrr)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ==========================================
// Admin Plan Pie Chart
// ==========================================
interface PieDataPoint {
  name: string;
  value: number;
}

interface AdminPlanPieChartProps {
  data: PieDataPoint[];
  colors: string[];
}

export function AdminPlanPieChart({ data, colors }: AdminPlanPieChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={65}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={colors[index % colors.length]}
              stroke="#27272a"
              strokeWidth={1}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: 0 }}
          itemStyle={{ fontSize: 9 }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
