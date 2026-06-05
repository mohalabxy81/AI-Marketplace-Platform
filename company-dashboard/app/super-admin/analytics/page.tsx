// app/(super-admin)/analytics/page.tsx
"use client";

import * as React from "react";
import { useAdminAuth } from "@/features/platform-core";
import { useAnalyticsSnapshotsQuery } from "@/features/analytics";
import { useAIInferenceLogsQuery } from "@/features/ai";
import { 
  BarChart3, Cpu, AlertTriangle, TrendingUp, Clock, Activity
} from "lucide-react";
import dynamic from "next/dynamic";

const AdminGrowthChart = dynamic(
  () => import("@/features/super-admin/components/charts").then((mod) => mod.AdminGrowthChart),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-zinc-600 animate-pulse">LOADING_GROWTH_CHART...</div> }
);

const AdminLatencyChart = dynamic(
  () => import("@/features/super-admin/components/charts").then((mod) => mod.AdminLatencyChart),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-zinc-600 animate-pulse">LOADING_LATENCY_CHART...</div> }
);

export default function AnalyticsPage() {
  const { hasCapability } = useAdminAuth();
  const { data: snapshots } = useAnalyticsSnapshotsQuery();
  const { data: inferenceLogs } = useAIInferenceLogsQuery();

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!hasCapability("view_analytics_snapshots")) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center border border-dashed border-red-500/40 bg-zinc-950 p-8 text-center font-mono text-xs">
        <AlertTriangle className="mb-4 h-8 w-8 text-red-500 animate-pulse" />
        <span className="text-red-500 font-bold uppercase tracking-wider">ERROR: ACCESS_DENIED</span>
        <p className="mt-2 text-zinc-400">
          Required Capability: <code className="bg-zinc-900 px-2 py-1 text-amber-500">view_analytics_snapshots</code> is missing.
        </p>
      </div>
    );
  }

  // Latency metrics calculation
  const totalInferenceCount = inferenceLogs?.length || 0;
  const averageLatency = totalInferenceCount > 0 
    ? Math.round(inferenceLogs!.reduce((sum, item) => sum + item.latency_ms, 0) / totalInferenceCount)
    : 0;

  // Process data for charts
  const historyData = snapshots?.map(snap => ({
    date: snap.snapshot_date,
    mrr: snap.total_mrr,
    tenants: snap.total_tenants,
    active: snap.active_tenants
  })) || [];

  const latencyTrendData = inferenceLogs?.slice(0, 15).reverse().map((log, idx) => ({
    index: idx + 1,
    latency: log.latency_ms,
    tokens: log.tokens_used
  })) || [];

  // Cohort Retention Grid Mock Dataset (Industrial Matrix HUD)
  const COHORT_RETENTION = [
    { cohort: "2025-Q1", size: 24, m1: 100, m2: 95, m3: 91, m4: 87 },
    { cohort: "2025-Q2", size: 30, m1: 100, m2: 96, m3: 90, m4: 83 },
    { cohort: "2025-Q3", size: 18, m1: 100, m2: 94, m3: 88, m4: 82 },
    { cohort: "2025-Q4", size: 22, m1: 100, m2: 98, m3: 95, m4: null },
    { cohort: "2026-Q1", size: 28, m1: 100, m2: 96, m3: null, m4: null }
  ];

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-zinc-800 bg-zinc-950 p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">BUSINESS_INTELLIGENCE</h2>
          <p className="text-[10px] text-zinc-500">Global telemetry, cohort retention, and inference metrics</p>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-bold uppercase">NET_TENANT_GROWTH</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-xl font-bold tracking-tight text-zinc-100">
              {snapshots ? snapshots[snapshots.length - 1]?.total_tenants - snapshots[0]?.total_tenants : 0}
            </span>
            <span className="text-[9px] text-zinc-500">tenants overall growth</span>
          </div>
        </div>

        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-bold uppercase">AVG_INFERENCE_LATENCY</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-xl font-bold tracking-tight text-zinc-100">{averageLatency}ms</span>
            <span className="text-[9px] text-zinc-500">active search endpoints</span>
          </div>
        </div>

        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-bold uppercase">COHORT_LTV_ESTIMATE</span>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-xl font-bold tracking-tight text-zinc-100">$8.4k</span>
            <span className="text-[9px] text-emerald-500">avg contract worth</span>
          </div>
        </div>
      </div>

      {/* Recharts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Tenant Scale Area Chart */}
        <div className="border border-zinc-800 bg-zinc-950 p-4 space-y-4">
          <span className="block text-[10px] font-bold text-zinc-400 uppercase">Tenant Account Growth Scale</span>
          <div className="h-60 w-full">
            {mounted && historyData.length > 0 ? (
              <AdminGrowthChart data={historyData} />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-600">CHART_MOUNTING...</div>
            )}
          </div>
        </div>

        {/* AI Latency Trends */}
        <div className="border border-zinc-800 bg-zinc-950 p-4 space-y-4">
          <span className="block text-[10px] font-bold text-zinc-400 uppercase">Search Inference Latency Performance (ms)</span>
          <div className="h-60 w-full">
            {mounted && latencyTrendData.length > 0 ? (
              <AdminLatencyChart data={latencyTrendData} />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-600">CHART_MOUNTING...</div>
            )}
          </div>
        </div>
      </div>

      {/* Cohort Retention Matrix HUD */}
      <div className="border border-zinc-800 bg-zinc-950 p-4">
        <div className="border-b border-zinc-800 pb-2 mb-3">
          <span className="font-bold text-[10px] text-zinc-400 uppercase">COHORT_RETENTION_MATRIX</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-center border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[9px] bg-zinc-900/30">
                <th className="p-3 text-left font-bold">Cohort</th>
                <th className="p-3 font-bold">Size</th>
                <th className="p-3 font-bold">Month 1</th>
                <th className="p-3 font-bold">Month 2</th>
                <th className="p-3 font-bold">Month 3</th>
                <th className="p-3 font-bold">Month 4</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {COHORT_RETENTION.map((item) => (
                <tr key={item.cohort} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="p-3 font-bold text-left text-zinc-300">{item.cohort}</td>
                  <td className="p-3 font-bold text-zinc-400">{item.size} companies</td>
                  
                  {/* Month 1 */}
                  <td className="p-3">
                    <span className="inline-block w-full bg-amber-500 text-black py-1 font-bold">
                      {item.m1}%
                    </span>
                  </td>

                  {/* Month 2 */}
                  <td className="p-3">
                    <span 
                      className="inline-block w-full py-1 font-bold text-zinc-100"
                      style={{ backgroundColor: `rgba(245, 158, 11, ${item.m2 ? item.m2 / 100 - 0.2 : 0})` }}
                    >
                      {item.m2}%
                    </span>
                  </td>

                  {/* Month 3 */}
                  <td className="p-3">
                    {item.m3 ? (
                      <span 
                        className="inline-block w-full py-1 font-bold text-zinc-100"
                        style={{ backgroundColor: `rgba(245, 158, 11, ${item.m3 / 100 - 0.2})` }}
                      >
                        {item.m3}%
                      </span>
                    ) : (
                      <span className="text-zinc-600 font-bold">-</span>
                    )}
                  </td>

                  {/* Month 4 */}
                  <td className="p-3">
                    {item.m4 ? (
                      <span 
                        className="inline-block w-full py-1 font-bold text-zinc-100"
                        style={{ backgroundColor: `rgba(245, 158, 11, ${item.m4 / 100 - 0.2})` }}
                      >
                        {item.m4}%
                      </span>
                    ) : (
                      <span className="text-zinc-600 font-bold">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
