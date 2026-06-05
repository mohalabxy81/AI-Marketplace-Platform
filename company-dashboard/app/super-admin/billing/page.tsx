// app/(super-admin)/billing/page.tsx
"use client";

import * as React from "react";
import { useAdminAuth } from "@/features/platform-core";
import { useInvoicesQuery, useSubscriptionsQuery, useIssueRefundMutation } from "@/features/billing";
import { useAnalyticsSnapshotsQuery } from "@/features/analytics";
import { 
  CreditCard, DollarSign, RefreshCcw, 
  AlertTriangle, ArrowDownRight, ArrowUpRight, FileText
} from "lucide-react";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const AdminMRRChart = dynamic(
  () => import("@/features/super-admin/components/charts").then((mod) => mod.AdminMRRChart),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-zinc-600 animate-pulse">LOADING_MRR_CHART...</div> }
);

const AdminPlanPieChart = dynamic(
  () => import("@/features/super-admin/components/charts").then((mod) => mod.AdminPlanPieChart),
  { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-zinc-600 animate-pulse">LOADING_DISTRIBUTION_CHART...</div> }
);

const COLORS = ["#18181b", "#27272a", "#52525b", "#d97706"]; // Industrial palette

export default function BillingPage() {
  const { hasCapability } = useAdminAuth();
  const { data: invoices } = useInvoicesQuery();
  const { data: subscriptions } = useSubscriptionsQuery();
  const { data: snapshots } = useAnalyticsSnapshotsQuery();
  const refundMutation = useIssueRefundMutation();

  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!hasCapability("override_billing_limits")) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center border border-dashed border-red-500/40 bg-zinc-950 p-8 text-center font-mono text-xs">
        <AlertTriangle className="mb-4 h-8 w-8 text-red-500 animate-pulse" />
        <span className="text-red-500 font-bold uppercase tracking-wider">ERROR: ACCESS_DENIED</span>
        <p className="mt-2 text-zinc-400">
          Required Capability: <code className="bg-zinc-900 px-2 py-1 text-amber-500">override_billing_limits</code> is missing.
        </p>
      </div>
    );
  }

  const handleRefund = (invoiceId: string, companyId: string, amount: number) => {
    if (!hasCapability("issue_refunds")) {
      toast.error("Unauthorized: Requires issue_refunds capability.");
      return;
    }
    
    if (confirm(`Confirm refund of $${(amount / 100).toFixed(2)} for invoice ${invoiceId}?`)) {
      refundMutation.mutate({ invoiceId, companyId, amount });
    }
  };

  // Process data for charts
  const mrrHistoryData = snapshots?.map(snap => ({
    date: snap.snapshot_date,
    mrr: snap.total_mrr
  })) || [];

  // Calculate plan distribution
  const planCounts = subscriptions?.reduce((acc: Record<string, number>, sub) => {
    acc[sub.plan_id] = (acc[sub.plan_id] || 0) + 1;
    return acc;
  }, {}) || {};

  const planPieData = Object.entries(planCounts).map(([name, value]) => ({
    name: name.split("_")[1].toUpperCase(),
    value
  }));

  // Summary Metrics
  const activeSubs = subscriptions?.filter(s => s.status === "active").length || 0;
  const overdueInvoicesCount = invoices?.filter(i => i.status === "open").length || 0;
  const totalDueAmount = invoices?.filter(i => i.status === "open").reduce((sum, i) => sum + i.amount_due, 0) || 0;

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-zinc-800 bg-zinc-950 p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">BILLING_ENGINE_COCKPIT</h2>
          <p className="text-[10px] text-zinc-500">MRR monitoring, invoice validation, and refund control</p>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <span className="block text-[10px] font-bold text-zinc-500 uppercase">ACTIVE_SUBSCRIPTIONS</span>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-xl font-bold text-zinc-100">{activeSubs}</span>
            <span className="text-[9px] text-zinc-500">/ {subscriptions?.length || 0} total</span>
          </div>
        </div>

        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <span className="block text-[10px] font-bold text-zinc-500 uppercase">OUTSTANDING_RECEIVABLES</span>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-xl font-bold text-red-500">${(totalDueAmount / 100).toLocaleString()}</span>
            <span className="text-[9px] text-zinc-500">({overdueInvoicesCount} invoices)</span>
          </div>
        </div>

        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <span className="block text-[10px] font-bold text-zinc-500 uppercase">STRIPE_GATEWAY_STATUS</span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="h-2 w-2 rounded-none bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-bold text-zinc-200">ONLINE</span>
          </div>
        </div>
      </div>

      {/* Recharts Graphics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* MRR Trend Line */}
        <div className="border border-zinc-800 bg-zinc-950 p-4 lg:col-span-2 space-y-4">
          <span className="block text-[10px] font-bold text-zinc-400 uppercase">MONTHLY_RECURRING_REVENUE_TREND</span>
          <div className="h-64 w-full">
            {mounted && mrrHistoryData.length > 0 ? (
              <AdminMRRChart data={mrrHistoryData} />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-600">CHART_MOUNTING...</div>
            )}
          </div>
        </div>

        {/* Plan Distribution Pie */}
        <div className="border border-zinc-800 bg-zinc-950 p-4 space-y-4 flex flex-col justify-between">
          <span className="block text-[10px] font-bold text-zinc-400 uppercase">PLAN_DISTRIBUTION</span>
          <div className="h-44 w-full flex justify-center items-center">
            {mounted && planPieData.length > 0 ? (
              <AdminPlanPieChart data={planPieData} colors={COLORS} />
            ) : (
              <div className="text-zinc-600">CHART_MOUNTING...</div>
            )}
          </div>
          <div className="flex flex-wrap gap-4 justify-center text-[9px] text-zinc-400 border-t border-zinc-900 pt-3">
            {planPieData.map((item, idx) => (
              <div key={item.name} className="flex items-center space-x-1.5">
                <span className="h-2 w-2 block" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></span>
                <span>{item.name}: {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invoice Ledger Table */}
      <div className="border border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 p-4">
          <span className="font-bold text-[10px] text-zinc-400 uppercase">INVOICE_AND_PAYMENT_LEDGER</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[9px] bg-zinc-900/30">
                <th className="p-3 font-bold">Stripe Invoice ID</th>
                <th className="p-3 font-bold">Company ID</th>
                <th className="p-3 font-bold">Amount Due</th>
                <th className="p-3 font-bold">Amount Paid</th>
                <th className="p-3 font-bold">Status</th>
                <th className="p-3 font-bold">Date Created</th>
                <th className="p-3 font-bold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {invoices && invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-3 font-bold text-zinc-400">{inv.stripe_invoice_id}</td>
                    <td className="p-3 font-bold text-zinc-200">{inv.company_id}</td>
                    <td className="p-3 text-zinc-200 font-bold">${(inv.amount_due / 100).toFixed(2)}</td>
                    <td className="p-3 text-zinc-300">${(inv.amount_paid / 100).toFixed(2)}</td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold uppercase ${
                        inv.status === "paid" 
                          ? "bg-emerald-950/40 text-emerald-500 border border-emerald-500/20" 
                          : inv.status === "open"
                          ? "bg-amber-950/40 text-amber-500 border border-amber-500/20"
                          : "bg-zinc-900 text-zinc-500 border border-zinc-800"
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="p-3 text-zinc-400">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {inv.invoice_pdf && (
                          <a 
                            href={inv.invoice_pdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 border border-zinc-850 bg-zinc-900 px-2 py-1 text-zinc-400 hover:text-white transition-colors"
                          >
                            <FileText className="h-3 w-3" />
                            <span>PDF</span>
                          </a>
                        )}
                        {inv.status === "paid" && (
                          <button
                            onClick={() => handleRefund(inv.id, inv.company_id, inv.amount_paid)}
                            className="flex items-center space-x-1 border border-red-500 bg-red-500/10 px-2 py-1 text-red-500 hover:bg-red-500 hover:text-black font-bold transition-colors"
                          >
                            <RefreshCcw className="h-3 w-3" />
                            <span>REFUND</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-600 font-bold">
                    NO_INVOICE_RECORDS_FOUND
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
