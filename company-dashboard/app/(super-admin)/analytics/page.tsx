"use client";

import React, { useState } from "react";
import {
  BarChart3,
  LineChart as LineIcon,
  Activity,
  Server,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Cpu,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";

// ── Mock Performance Data ──────────────────────────────────────

const TIMELINE_DATA = [
  { time: "00:00", latency: 110, volume: 2400, errors: 2 },
  { time: "04:00", latency: 95, volume: 1800, errors: 1 },
  { time: "08:00", latency: 140, volume: 5600, errors: 12 },
  { time: "12:00", latency: 165, volume: 8900, errors: 24 },
  { time: "16:00", latency: 120, volume: 7200, errors: 8 },
  { time: "20:00", latency: 105, volume: 4300, errors: 3 },
];

const TENANT_REVENUE = [
  { name: "Tenant A", tokens: 4800, revenue: 720 },
  { name: "Tenant B", tokens: 3500, revenue: 525 },
  { name: "Tenant C", tokens: 9100, revenue: 1365 },
  { name: "Tenant D", tokens: 2100, revenue: 315 },
  { name: "Tenant E", tokens: 5900, revenue: 885 },
];

export default function PlatformAnalyticsPage() {
  const [metricTab, setMetricTab] = useState<"latency" | "volume" | "errors">("latency");

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Platform-Wide Analytics
        </h2>
        <p className="mt-1 text-sm leading-6 text-neutral-400">
          Monitor system metrics, global AI orchestration load, and multi-tenant telemetry.
        </p>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border border-neutral-800 bg-neutral-900/50 p-5 rounded-xl">
          <div className="flex justify-between items-start">
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Total Revenue</span>
            <span className="flex items-center text-emerald-400 text-xs font-semibold">
              <ArrowUpRight className="h-3 w-3 mr-0.5" /> +18.4%
            </span>
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">$42,904</p>
        </div>

        <div className="border border-neutral-800 bg-neutral-900/50 p-5 rounded-xl">
          <div className="flex justify-between items-start">
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Total Inference Cost</span>
            <span className="flex items-center text-red-400 text-xs font-semibold">
              <ArrowDownRight className="h-3 w-3 mr-0.5" /> +2.1%
            </span>
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">$8,214</p>
        </div>

        <div className="border border-neutral-800 bg-neutral-900/50 p-5 rounded-xl">
          <div className="flex justify-between items-start">
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Avg API Response Latency</span>
            <span className="flex items-center text-emerald-400 text-xs font-semibold">
              <ArrowDownRight className="h-3 w-3 mr-0.5" /> -14ms
            </span>
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">122.5 ms</p>
        </div>

        <div className="border border-neutral-800 bg-neutral-900/50 p-5 rounded-xl">
          <div className="flex justify-between items-start">
            <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Global Cache Hit Rate</span>
            <span className="flex items-center text-emerald-400 text-xs font-semibold">
              <ArrowUpRight className="h-3 w-3 mr-0.5" /> +4.2%
            </span>
          </div>
          <p className="text-2xl font-extrabold text-white mt-2">68.4%</p>
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gateway Telemetry */}
        <div className="lg:col-span-2 border border-neutral-800 bg-neutral-900/40 p-6 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-amber-500" />
              <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Gateway Operations Telemetry</h3>
            </div>

            {/* Tabs selector */}
            <div className="flex border border-neutral-800 bg-neutral-950 rounded-lg overflow-hidden h-8">
              {(["latency", "volume", "errors"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMetricTab(tab)}
                  className={`px-3.5 py-1 text-[10px] font-bold uppercase transition-colors ${
                    metricTab === tab ? "bg-amber-500 text-black" : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          {/* Chart container */}
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={TIMELINE_DATA}>
                <defs>
                  <linearGradient id="metricColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#555" fontSize={10} fontStyle="mono" />
                <YAxis stroke="#555" fontSize={10} fontStyle="mono" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111", borderColor: "#2A2A2A" }}
                  labelStyle={{ color: "#888", fontSize: "10px" }}
                />
                <Area
                  type="monotone"
                  dataKey={metricTab}
                  stroke="#F59E0B"
                  fillOpacity={1}
                  fill="url(#metricColor)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Tenants usage stats */}
        <div className="border border-neutral-800 bg-neutral-900/40 p-6 rounded-xl space-y-4">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-amber-500" />
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Tenant Monetization</h3>
          </div>

          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={TENANT_REVENUE}>
                <XAxis dataKey="name" stroke="#555" fontSize={10} />
                <YAxis stroke="#555" fontSize={10} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#111", borderColor: "#2A2A2A" }}
                  labelStyle={{ color: "#888", fontSize: "10px" }}
                />
                <Bar dataKey="revenue" fill="#3B82F6" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cluster Nodes & Services Health */}
      <div className="border border-neutral-800 bg-neutral-900/20 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-neutral-400" />
          <h3 className="text-sm font-semibold text-white uppercase tracking-wider">Cluster Compute Node Telemetry</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { name: "Node-US-East-1", cpu: "42%", ram: "64%", status: "HEALTHY" },
            { name: "Node-EU-West-1", cpu: "18%", ram: "32%", status: "HEALTHY" },
            { name: "Node-AP-Northeast-1", cpu: "88%", ram: "91%", status: "WARN" },
          ].map((node) => (
            <div key={node.name} className="border border-neutral-800 bg-neutral-950 p-4 rounded-lg space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-xs text-white">{node.name}</span>
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    node.status === "HEALTHY" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                  }`}
                >
                  {node.status}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-neutral-500">
                  <span>CPU Load</span>
                  <span className="text-neutral-300 font-mono">{node.cpu}</span>
                </div>
                <div className="flex justify-between text-[10px] text-neutral-500">
                  <span>RAM Usage</span>
                  <span className="text-neutral-300 font-mono">{node.ram}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
