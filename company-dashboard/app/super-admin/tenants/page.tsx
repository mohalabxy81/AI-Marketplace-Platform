// app/(super-admin)/tenants/page.tsx
"use client";

import * as React from "react";
import { useAdminAuth } from "@/features/platform-core";
import { useSubscriptionsQuery, useOverrideQuotaMutation } from "@/features/billing";
import { logAdminAction } from "@/features/platform-core";
import { useImpersonateUserMutation } from "@/features/support";
import { MOCK_TENANTS } from "@/lib/mock/super-admin-mock-data";
import { 
  Search, ShieldAlert, Key, 
  Settings, User, Plus, ExternalLink, ShieldCheck,
  AlertTriangle, ShieldAlert as BanIcon
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function TenantsPage() {
  const { hasCapability, admin } = useAdminAuth();
  const { data: subscriptions } = useSubscriptionsQuery();
  const impersonateMutation = useImpersonateUserMutation();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<"ALL" | "active" | "suspended" | "trialing">("ALL");
  const [planFilter, setPlanFilter] = React.useState<"ALL" | "plan_free" | "plan_growth" | "plan_scale" | "plan_enterprise">("ALL");
  const [tenantsList, setTenantsList] = React.useState(MOCK_TENANTS);

  // Impersonation modal state
  const [impersonateTarget, setImpersonateTarget] = React.useState<{ userId: string; companyId: string } | null>(null);
  const [justification, setJustification] = React.useState("");

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

  const toggleTenantStatus = async (tenantId: string, currentStatus: string) => {
    if (!hasCapability("suspend_tenant")) {
      toast.error("Unauthorized: Requires suspend_tenant capability.");
      return;
    }

    const nextStatus = currentStatus === "suspended" ? "active" : "suspended";
    
    await logAdminAction(
      nextStatus === "suspended" ? "tenant.suspend" : "tenant.unsuspend",
      "company",
      tenantId,
      { status: currentStatus },
      { status: nextStatus }
    );

    setTenantsList(prev => 
      prev.map(t => t.id === tenantId ? { ...t, status: nextStatus } : t)
    );

    toast.success(`Tenant ${tenantId} status changed to ${nextStatus.toUpperCase()}.`);
  };

  const handleStartImpersonate = (companyId: string, email: string) => {
    if (!hasCapability("impersonate_user")) {
      toast.error("Unauthorized: Requires impersonate_user capability.");
      return;
    }
    setImpersonateTarget({ userId: email, companyId });
    setJustification("");
  };

  const submitImpersonation = () => {
    if (!impersonateTarget || !justification) {
      toast.error("Impersonation reason is required.");
      return;
    }

    impersonateMutation.mutate({
      adminId: admin?.id || "unknown",
      userId: impersonateTarget.userId,
      companyId: impersonateTarget.companyId,
      justification
    });

    setImpersonateTarget(null);
  };

  // Filter criteria logic
  const filteredTenants = tenantsList.filter(tenant => {
    const matchesSearch = 
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.owner_email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "ALL" || tenant.status === statusFilter;
    const matchesPlan = planFilter === "ALL" || tenant.plan_id === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Page Title & Search Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border border-zinc-800 bg-zinc-950 p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">TENANT_REGISTRY</h2>
          <p className="text-[10px] text-zinc-500">Cross-tenant routing administration cockpit</p>
        </div>

        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input 
            type="text" 
            placeholder="Search ID, Name, Owner Email..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-4 text-zinc-200 outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Dynamic Filters Bar */}
      <div className="flex flex-wrap gap-4 border border-zinc-800 bg-zinc-950 p-4 text-[10px]">
        {/* Status filters */}
        <div className="space-y-1">
          <span className="block font-bold text-zinc-500 uppercase">Operational Status</span>
          <div className="flex border border-zinc-800">
            {["ALL", "active", "suspended", "trialing"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status as any)}
                className={`px-3 py-1 font-bold transition-colors ${
                  statusFilter === status 
                    ? "bg-amber-500 text-black" 
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-850 hover:text-white"
                }`}
              >
                {status.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Plan Filters */}
        <div className="space-y-1">
          <span className="block font-bold text-zinc-500 uppercase">Subscription Tier</span>
          <div className="flex border border-zinc-800">
            {["ALL", "plan_free", "plan_growth", "plan_scale", "plan_enterprise"].map((plan) => (
              <button
                key={plan}
                onClick={() => setPlanFilter(plan as any)}
                className={`px-3 py-1 font-bold transition-colors ${
                  planFilter === plan 
                    ? "bg-amber-500 text-black" 
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-850 hover:text-white"
                }`}
              >
                {plan === "ALL" ? "ALL" : plan.split("_")[1].toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tenant Grid Table */}
      <div className="border border-zinc-800 bg-zinc-950 overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[10px] bg-zinc-900/30">
              <th className="p-3 font-bold">Tenant ID</th>
              <th className="p-3 font-bold">Organization Name</th>
              <th className="p-3 font-bold">Owner / Email</th>
              <th className="p-3 font-bold">Billing Plan</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850">
            {filteredTenants.length > 0 ? (
              filteredTenants.map((tenant) => {
                const sub = subscriptions?.find(s => s.company_id === tenant.id);
                return (
                  <tr key={tenant.id} className="hover:bg-zinc-900/40 transition-colors">
                    <td className="p-3 font-bold text-zinc-400">{tenant.id}</td>
                    <td className="p-3 font-bold text-zinc-100 hover:text-amber-500">
                      <Link href={`/super-admin/tenants/${tenant.id}`} className="flex items-center space-x-1">
                        <span>{tenant.name}</span>
                        <ExternalLink className="h-3 w-3 opacity-50" />
                      </Link>
                    </td>
                    <td className="p-3 text-zinc-400">
                      <div>{tenant.owner_name}</div>
                      <div className="text-[10px] text-zinc-500">{tenant.owner_email}</div>
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-zinc-300 uppercase">
                        {tenant.plan_id.split("_")[1]}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={`inline-flex px-2 py-0.5 font-bold uppercase text-[9px] ${
                        tenant.status === "active" 
                          ? "bg-emerald-950/40 text-emerald-500 border border-emerald-500/20" 
                          : tenant.status === "suspended" 
                          ? "bg-red-950/40 text-red-500 border border-red-500/20 animate-pulse"
                          : "bg-amber-950/40 text-amber-500 border border-amber-500/20"
                      }`}>
                        {tenant.status}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleStartImpersonate(tenant.id, tenant.owner_email)}
                          className="flex items-center space-x-1 border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-zinc-300 hover:border-amber-500 hover:text-amber-500 transition-colors"
                        >
                          <Key className="h-3 w-3" />
                          <span>IMPERSONATE</span>
                        </button>

                        <button
                          onClick={() => toggleTenantStatus(tenant.id, tenant.status)}
                          className={`flex items-center space-x-1 border px-2.5 py-1 font-bold transition-colors ${
                            tenant.status === "suspended"
                              ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black"
                              : "border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black"
                          }`}
                        >
                          {tenant.status === "suspended" ? (
                            <>
                              <ShieldCheck className="h-3 w-3" />
                              <span>RESTORE</span>
                            </>
                          ) : (
                            <>
                              <BanIcon className="h-3 w-3" />
                              <span>SUSPEND</span>
                            </>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-zinc-600 font-bold">
                  NO_COMPANIES_MATCH_CRITERIA
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Impersonation Modal */}
      {impersonateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-[10px] font-bold uppercase text-red-500 flex items-center space-x-1">
                <AlertTriangle className="h-3.5 w-3.5 animate-pulse" />
                <span>SECURE_IMPERSONATION_GATEWAY</span>
              </span>
              <button 
                onClick={() => setImpersonateTarget(null)}
                className="text-zinc-500 hover:text-white"
              >
                [X]
              </button>
            </div>
            <div className="mt-4 space-y-3">
              <p className="text-[10px] text-zinc-400">
                You are about to launch a live user impersonation session for account <span className="font-bold text-amber-500">{impersonateTarget.userId}</span> under tenant <span className="font-bold text-amber-500">{impersonateTarget.companyId}</span>.
              </p>
              <div className="border border-red-500/20 bg-red-950/10 p-3 text-[10px] text-red-400 font-bold uppercase">
                WARNING: This session is fully recorded in the append-only audit ledger and is subject to security review.
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Operational Justification / Ticket ID</label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Ticket #tkt_2. Debugging billing rate error on CAD card."
                  className="w-full h-20 border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t border-zinc-800">
                <button 
                  onClick={() => setImpersonateTarget(null)}
                  className="border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-zinc-400 hover:text-white"
                >
                  CANCEL
                </button>
                <button 
                  onClick={submitImpersonation}
                  disabled={impersonateMutation.isPending}
                  className="border border-red-500 bg-red-500/10 px-4 py-1.5 text-red-500 hover:bg-red-500 hover:text-black font-bold disabled:opacity-50"
                >
                  {impersonateMutation.isPending ? "INITIALIZING..." : "LAUNCH_SESSION"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
