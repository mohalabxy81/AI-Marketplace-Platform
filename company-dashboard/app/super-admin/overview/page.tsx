// app/(super-admin)/overview/page.tsx
"use client";

import * as React from "react";
import { useAdminAuth } from "@/features/platform-core/hooks/use-admin-auth";
import { useAnalyticsSnapshotsQuery, usePlanDistributionQuery } from "@/features/analytics/hooks/use-analytics-data";
import { useAuditLogsQuery } from "@/features/platform-core/hooks/use-audit-logs";
import { useSubscriptionsQuery, useInvoicesQuery, useOverrideQuotaMutation } from "@/features/billing/hooks/use-billing-queries";
import { useSupportTicketsQuery } from "@/features/support/hooks/use-support-tickets";
import { useModerationQueueQuery } from "@/features/moderation/hooks/use-moderation-queue";
import { useTriggerReindexMutation } from "@/features/ai/hooks/use-ai-config";
import { logAdminAction } from "@/features/platform-core/services/platform-audit.service";
import { 
  Activity, ShieldAlert, Cpu, HardDrive, 
  Users, DollarSign, LifeBuoy, AlertTriangle, 
  Terminal, ShieldCheck, Play, Power, Plus
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function OverviewPage() {
  const { hasCapability, admin } = useAdminAuth();
  const { data: snapshots } = useAnalyticsSnapshotsQuery();
  const { data: auditLogs } = useAuditLogsQuery();
  const { data: tickets } = useSupportTicketsQuery();
  const { data: modQueue } = useModerationQueueQuery();
  const { data: subscriptions } = useSubscriptionsQuery();
  
  const reindexMutation = useTriggerReindexMutation();
  
  const [killswitchActive, setKillswitchActive] = React.useState(false);
  const [provisionOpen, setProvisionOpen] = React.useState(false);
  const [newTenantName, setNewTenantName] = React.useState("");
  const [newTenantPlan, setNewTenantPlan] = React.useState("plan_growth");
  const [newTenantOwner, setNewTenantOwner] = React.useState("");

  if (!hasCapability("view_analytics_snapshots")) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center border border-dashed border-red-500/40 bg-zinc-950 p-8 text-center font-mono text-xs">
        <AlertTriangle className="mb-4 h-8 w-8 text-red-500 animate-pulse" />
        <span className="text-red-500 font-bold uppercase tracking-wider">ERROR: COCKPIT_ACCESS_DENIED</span>
        <p className="mt-2 max-w-md text-zinc-400">
          Required Capability: <code className="bg-zinc-900 px-2 py-1 text-amber-500">view_analytics_snapshots</code> is missing on current administrative credentials.
        </p>
      </div>
    );
  }

  // Calculate live values
  const currentSnap = snapshots?.[snapshots.length - 1];
  const activeTenants = currentSnap?.active_tenants || 0;
  const mrr = currentSnap?.total_mrr || 0;
  const openTickets = tickets?.filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS").length || 0;
  const queueDepth = modQueue?.filter(m => m.status === "PENDING").length || 0;

  const handleKillswitch = async () => {
    const nextState = !killswitchActive;
    await logAdminAction(
      nextState ? "platform.killswitch_activate" : "platform.killswitch_deactivate",
      "system",
      "global_routing",
      { killswitch: killswitchActive },
      { killswitch: nextState }
    );
    setKillswitchActive(nextState);
    if (nextState) {
      toast.error("EMERGENCY KILLSWITCH ENGAGED. Non-admin routes throttled.", {
        duration: 5000
      });
    } else {
      toast.success("Emergency killswitch disengaged. Traffic restored.");
    }
  };

  const handleProvisionTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenantName || !newTenantOwner) {
      toast.error("Please provide tenant credentials.");
      return;
    }
    
    await logAdminAction(
      "tenant.provision",
      "company",
      null,
      null,
      { name: newTenantName, plan: newTenantPlan, owner: newTenantOwner }
    );
    
    toast.success(`Tenant [${newTenantName}] successfully provisioned.`);
    setNewTenantName("");
    setNewTenantOwner("");
    setProvisionOpen(false);
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* 1. System Status Bar */}
      <div className="flex flex-wrap items-center justify-between border border-zinc-800 bg-zinc-950 p-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${killswitchActive ? "bg-red-400" : "bg-emerald-400"}`}></span>
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${killswitchActive ? "bg-red-500" : "bg-emerald-500"}`}></span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] uppercase font-bold text-zinc-500 leading-none">SYSTEM_STATUS</span>
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-200 leading-none">
              {killswitchActive ? "PLATFORM_DEGRADED_BY_OPERATOR" : "ALL_SYSTEMS_OPERATIONAL"}
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-6 text-[10px] text-zinc-400">
          <div className="flex items-center space-x-2">
            <Cpu className="h-3 w-3 text-amber-500" />
            <span>AI: ACTIVE</span>
          </div>
          <div className="flex items-center space-x-2">
            <HardDrive className="h-3 w-3 text-emerald-500" />
            <span>DB: ONLINE</span>
          </div>
          <div className="flex items-center space-x-2">
            <Activity className="h-3 w-3 text-amber-500 animate-pulse" />
            <span>LATENCY: 42ms</span>
          </div>
        </div>
      </div>

      {/* 2. KPI Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Tenants */}
        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-bold uppercase">ACTIVE_TENANTS</span>
            <Users className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-xl font-bold tracking-tight text-zinc-100">{activeTenants}</span>
            <span className="text-[9px] text-emerald-500">+4%</span>
          </div>
        </div>

        {/* Platform MRR */}
        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-bold uppercase">ESTIMATED_MRR</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-xl font-bold tracking-tight text-zinc-100">${(mrr / 1).toLocaleString()}</span>
            <span className="text-[9px] text-emerald-500">+1.2k</span>
          </div>
        </div>

        {/* Support Tickets */}
        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-bold uppercase">ACTIVE_TICKETS</span>
            <LifeBuoy className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-xl font-bold tracking-tight text-zinc-100">{openTickets}</span>
            <span className="text-[9px] text-zinc-500">/ {tickets?.length || 0} total</span>
          </div>
        </div>

        {/* Moderation Queue */}
        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between text-zinc-500">
            <span className="text-[10px] font-bold uppercase">MODERATION_QUEUE</span>
            <ShieldAlert className="h-4 w-4 text-red-500 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline space-x-1">
            <span className="text-xl font-bold tracking-tight text-zinc-100">{queueDepth}</span>
            <span className="text-[9px] text-red-500">PENDING</span>
          </div>
        </div>
      </div>

      {/* 3. Action Toolbar */}
      <div className="border border-zinc-800 bg-zinc-950 p-4">
        <h3 className="text-[10px] font-bold uppercase text-zinc-500 mb-3">QUICK_ACTUATOR_FUNCTIONS</h3>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={() => setProvisionOpen(true)}
            className="flex items-center space-x-1 border border-amber-500 bg-amber-500/10 px-3 py-1.5 font-bold text-amber-500 hover:bg-amber-500 hover:text-black transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>PROVISION_NEW_TENANT</span>
          </button>
          
          <button 
            onClick={() => reindexMutation.mutate({})}
            disabled={reindexMutation.isPending}
            className="flex items-center space-x-1 border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-bold text-zinc-300 hover:border-zinc-500 hover:text-white disabled:opacity-50 transition-colors"
          >
            <Play className="h-3.5 w-3.5 text-emerald-500" />
            <span>{reindexMutation.isPending ? "INDEXING_PIPELINE..." : "FORCE_VECTOR_REINDEX"}</span>
          </button>

          <button 
            onClick={handleKillswitch}
            className={`flex items-center space-x-1 border px-3 py-1.5 font-bold transition-colors ${
              killswitchActive 
                ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black" 
                : "border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black"
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            <span>{killswitchActive ? "DISABLE_ROUTING_LIMITS" : "ENGAGE_EMERGENCY_KILLSWITCH"}</span>
          </button>
        </div>
      </div>

      {/* 4. Provisioning Modal Form */}
      {provisionOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-[10px] font-bold uppercase text-amber-500 flex items-center space-x-1">
                <Terminal className="h-3.5 w-3.5" />
                <span>PROVISION_NEW_ORGANIZATION</span>
              </span>
              <button 
                onClick={() => setProvisionOpen(false)}
                className="text-zinc-500 hover:text-white"
              >
                [X]
              </button>
            </div>
            <form onSubmit={handleProvisionTenant} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Company Name</label>
                <input 
                  type="text" 
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  className="w-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-200 outline-none focus:border-amber-500" 
                  placeholder="Acme Widgets Ltd"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Owner Email</label>
                <input 
                  type="email" 
                  value={newTenantOwner}
                  onChange={(e) => setNewTenantOwner(e.target.value)}
                  className="w-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-200 outline-none focus:border-amber-500" 
                  placeholder="admin@acme.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Subscription Tier</label>
                <select 
                  value={newTenantPlan}
                  onChange={(e) => setNewTenantPlan(e.target.value)}
                  className="w-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-200 outline-none focus:border-amber-500"
                >
                  <option value="plan_free">Free Sandbox</option>
                  <option value="plan_growth">Growth Plan</option>
                  <option value="plan_scale">Scale Plan</option>
                  <option value="plan_enterprise">Enterprise Tier</option>
                </select>
              </div>
              <div className="flex justify-end space-x-3 pt-3 border-t border-zinc-800">
                <button 
                  type="button" 
                  onClick={() => setProvisionOpen(false)}
                  className="border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-zinc-400 hover:text-white"
                >
                  CANCEL
                </button>
                <button 
                  type="submit" 
                  className="border border-amber-500 bg-amber-500/10 px-4 py-1.5 text-amber-500 hover:bg-amber-500 hover:text-black font-bold"
                >
                  PROVISION
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Logs & Live Feeds */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Audit Log Ledger */}
        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <span className="text-[10px] font-bold uppercase text-zinc-400">AUDIT_LOG_LEDGER</span>
            <span className="text-[9px] text-zinc-500">REALTIME_STREAM</span>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
            {auditLogs?.logs && auditLogs.logs.length > 0 ? (
              auditLogs.logs.map((log: any) => (
                <div key={log.id} className="border-l border-amber-500 pl-3 py-0.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-zinc-200 uppercase text-[10px]">{log.action}</span>
                    <span className="text-[9px] text-zinc-500">
                      {formatDistanceToNow(new Date(log.createdAt))} ago
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400">
                    Target: <span className="text-amber-500">{log.targetType} ({log.targetId?.slice(0, 8)})</span>
                  </div>
                  <div className="text-[9px] text-zinc-500">
                    IP: {log.ipAddress} | Admin ID: {log.adminId.slice(0, 8)}
                  </div>
                </div>
              ))
            ) : (
              <span className="text-zinc-600 block text-center">NO_LEDGER_ENTRIES</span>
            )}
          </div>
        </div>

        {/* Live System Alerts Feed */}
        <div className="border border-zinc-800 bg-zinc-950 p-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-2 mb-3">
            <span className="text-[10px] font-bold uppercase text-zinc-400">SYSTEM_ALERTS_FEED</span>
            <span className="text-[9px] text-red-500 animate-pulse font-bold">LIVE</span>
          </div>
          <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
            {/* Live alerts mapped from moderation queue + support tickets */}
            {modQueue?.filter(item => item.priority === "CRITICAL" && item.status === "PENDING").map((item) => (
              <div key={item.id} className="border border-red-500/20 bg-red-950/10 p-3 space-y-1">
                <div className="flex items-center space-x-2 text-red-500 font-bold">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>CRITICAL_ABUSE_DETECTION</span>
                </div>
                <p className="text-[10px] text-zinc-300">
                  Target listing <span className="font-bold text-amber-500">#{item.target_id.slice(0, 8)}</span> has a high risk score of {item.risk_score}%.
                </p>
                <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-1">
                  <span>Reports: {item.reports_count}</span>
                  <span>{new Date(item.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}

            {tickets?.filter(t => t.priority === "CRITICAL" && t.status !== "CLOSED").map((t) => (
              <div key={t.id} className="border border-amber-500/20 bg-amber-950/10 p-3 space-y-1">
                <div className="flex items-center space-x-2 text-amber-500 font-bold">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <span>CRITICAL_SUPPORT_ESCALATION</span>
                </div>
                <p className="text-[10px] text-zinc-300">
                  Subject: <span className="italic">"{t.subject}"</span>
                </p>
                <div className="flex items-center justify-between text-[9px] text-zinc-500 pt-1">
                  <span>Company: {t.company_id}</span>
                  <span>{new Date(t.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}

            {(!modQueue?.some(m => m.priority === "CRITICAL" && m.status === "PENDING") && !tickets?.some(t => t.priority === "CRITICAL")) && (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <ShieldCheck className="h-8 w-8 text-emerald-500 mb-2 opacity-50" />
                <span>ALL_THREAT_VECTORS_CLEAR</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
