import React from "react";
import { Activity, Server, Database, ShieldCheck } from "lucide-react";

export default function SuperAdminDashboardPage() {
  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Platform Operations Overview
        </h2>
        <p className="mt-1 text-sm leading-6 text-neutral-400">
          Global system health, tenant metrics, and AI inference load.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI Cards */}
        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <div className="flex items-center gap-x-4">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Activity className="h-6 w-6 text-emerald-400" />
            </div>
            <h3 className="text-sm font-medium leading-6 text-neutral-400">Total Active Tenants</h3>
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-white">1,204</p>
          <p className="mt-1 text-sm text-emerald-400">+12% from last month</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <div className="flex items-center gap-x-4">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Server className="h-6 w-6 text-blue-400" />
            </div>
            <h3 className="text-sm font-medium leading-6 text-neutral-400">AI Inference Volume (24h)</h3>
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-white">845k</p>
          <p className="mt-1 text-sm text-neutral-400">Avg Latency: 124ms</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <div className="flex items-center gap-x-4">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Database className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-sm font-medium leading-6 text-neutral-400">Vector Index Size</h3>
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-white">14.2 GB</p>
          <p className="mt-1 text-sm text-neutral-400">3,492,010 embeddings</p>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <div className="flex items-center gap-x-4">
            <div className="p-2 bg-rose-500/10 rounded-lg">
              <ShieldCheck className="h-6 w-6 text-rose-400" />
            </div>
            <h3 className="text-sm font-medium leading-6 text-neutral-400">Moderation Queue</h3>
          </div>
          <p className="mt-4 text-3xl font-semibold tracking-tight text-white">42</p>
          <p className="mt-1 text-sm text-rose-400">14 pending CRITICAL</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <h3 className="text-base font-semibold leading-6 text-white mb-4">Recent Audit Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-x-4 py-3 border-b border-neutral-800 last:border-0">
                <div className="h-2 w-2 mt-2 rounded-full bg-blue-400 shrink-0" />
                <div>
                  <p className="text-sm text-white">Platform Admin changed <strong>Claude 3.5 Sonnet</strong> fallback routing.</p>
                  <p className="text-xs text-neutral-500 mt-1">14 minutes ago</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <h3 className="text-base font-semibold leading-6 text-white mb-4">System Health</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Supabase Database</span>
              <span className="inline-flex items-center rounded-md bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-400/20">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">OpenAI API</span>
              <span className="inline-flex items-center rounded-md bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-400/20">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Anthropic API</span>
              <span className="inline-flex items-center rounded-md bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-400/20">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-neutral-400">Stripe Webhooks</span>
              <span className="inline-flex items-center rounded-md bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-400 ring-1 ring-inset ring-emerald-400/20">Operational</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
