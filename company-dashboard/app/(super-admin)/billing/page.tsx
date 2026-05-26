import React from "react";
import { DollarSign, CreditCard, TrendingDown, AlertCircle } from "lucide-react";

export default function BillingPage() {
  return (
    <div className="space-y-8 max-w-7xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Billing & Quotas</h2>
        <p className="mt-1 text-sm text-neutral-400">Monitor revenue, subscriptions, and tenant quota consumption.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Platform MRR", value: "$84,220", sub: "+8.3% MoM", icon: DollarSign, color: "emerald" },
          { label: "Active Subscriptions", value: "1,148", sub: "All plans combined", icon: CreditCard, color: "blue" },
          { label: "Churn Rate (30d)", value: "1.4%", sub: "↓ from 2.1%", icon: TrendingDown, color: "amber" },
          { label: "Quota Violations", value: "7", sub: "AI token limits exceeded", icon: AlertCircle, color: "rose" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
            <p className="text-xs text-neutral-400">{stat.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{stat.value}</p>
            <p className="mt-1 text-xs text-neutral-500">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Plan Distribution */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-5">Plan Distribution</h3>
          <div className="space-y-4">
            {[
              { plan: "Enterprise", count: 82, pct: 7, color: "bg-blue-500" },
              { plan: "Growth", count: 341, pct: 30, color: "bg-emerald-500" },
              { plan: "Starter", count: 529, pct: 46, color: "bg-amber-500" },
              { plan: "Free", count: 193, pct: 17, color: "bg-neutral-600" },
            ].map((row) => (
              <div key={row.plan}>
                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-neutral-300">{row.plan}</span>
                  <span className="text-neutral-400">{row.count} ({row.pct}%)</span>
                </div>
                <div className="w-full bg-neutral-800 rounded-full h-1.5">
                  <div className={`${row.color} h-1.5 rounded-full`} style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Invoices */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <h3 className="text-sm font-semibold text-white mb-5">Recent Invoices</h3>
          <div className="space-y-3">
            {[
              { tenant: "Acme Corp", amount: "$1,200", status: "paid", date: "May 1" },
              { tenant: "Globex LLC", amount: "$299", status: "paid", date: "May 3" },
              { tenant: "Initech", amount: "$99", status: "open", date: "May 5" },
              { tenant: "Massive Dyn.", amount: "$499", status: "paid", date: "May 7" },
            ].map((inv) => (
              <div key={inv.tenant} className="flex items-center justify-between py-2 border-b border-neutral-800 last:border-0">
                <div>
                  <p className="text-sm text-white">{inv.tenant}</p>
                  <p className="text-xs text-neutral-500">{inv.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">{inv.amount}</span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${inv.status === "paid" ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-400"}`}>
                    {inv.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
