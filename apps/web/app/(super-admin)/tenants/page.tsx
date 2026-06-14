import React from "react";
import { Users, Building2, TrendingUp, AlertCircle } from "lucide-react";

export default function TenantsPage() {
  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Tenant Management</h2>
        <p className="mt-1 text-sm text-neutral-400">Manage all platform tenants, plans, and account statuses.</p>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Tenants", value: "1,204", icon: Building2, color: "blue" },
          { label: "Active", value: "1,148", icon: TrendingUp, color: "emerald" },
          { label: "On Trial", value: "41", icon: Users, color: "amber" },
          { label: "Suspended", value: "15", icon: AlertCircle, color: "rose" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
            <p className="text-xs text-neutral-400">{stat.label}</p>
            <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h3 className="text-sm font-semibold text-white">All Tenants</h3>
          <input
            type="search"
            placeholder="Search tenants…"
            className="w-64 rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-800">
              {["Company", "Plan", "Members", "MRR", "Status", "Actions"].map((h) => (
                <th key={h} className="px-6 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800">
            {[
              { name: "Acme Corp", plan: "Enterprise", members: 42, mrr: 1200, status: "active" },
              { name: "Globex LLC", plan: "Growth", members: 18, mrr: 299, status: "active" },
              { name: "Initech", plan: "Starter", members: 5, mrr: 99, status: "trial" },
              { name: "Umbrella Co", plan: "Free", members: 2, mrr: 0, status: "suspended" },
            ].map((row) => (
              <tr key={row.name} className="hover:bg-neutral-800/30 transition-colors">
                <td className="px-6 py-4 font-medium text-white">{row.name}</td>
                <td className="px-6 py-4 text-neutral-300">{row.plan}</td>
                <td className="px-6 py-4 text-neutral-300">{row.members}</td>
                <td className="px-6 py-4 text-neutral-300">${row.mrr}/mo</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                    ${row.status === "active" ? "bg-emerald-400/10 text-emerald-400 ring-1 ring-emerald-400/20" :
                      row.status === "trial" ? "bg-amber-400/10 text-amber-400 ring-1 ring-amber-400/20" :
                        "bg-rose-400/10 text-rose-400 ring-1 ring-rose-400/20"}`}>
                    {row.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">View →</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
