// app/(super-admin)/audit/page.tsx
"use client";

import * as React from "react";
import { useAdminAuth } from "@/features/platform-core/hooks/use-admin-auth";
import { useAuditLogsQuery } from "@/features/platform-core/hooks/use-audit-logs";
import { 
  History, Search, ShieldCheck, Download, 
  ChevronDown, ChevronUp, AlertTriangle 
} from "lucide-react";
import { toast } from "sonner";

export default function AuditLedgerPage() {
  const { hasCapability } = useAdminAuth();
  const { data: logs } = useAuditLogsQuery();

  const [searchQuery, setSearchQuery] = React.useState("");
  const [targetFilter, setTargetFilter] = React.useState("ALL");
  const [expandedLogId, setExpandedLogId] = React.useState<string | null>(null);

  if (!hasCapability("view_audit_logs")) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center border border-dashed border-red-500/40 bg-zinc-950 p-8 text-center font-mono text-xs">
        <AlertTriangle className="mb-4 h-8 w-8 text-red-500 animate-pulse" />
        <span className="text-red-500 font-bold uppercase tracking-wider">ERROR: ACCESS_DENIED</span>
        <p className="mt-2 text-zinc-400">
          Required Capability: <code className="bg-zinc-900 px-2 py-1 text-amber-500">view_audit_logs</code> is missing.
        </p>
      </div>
    );
  }

  // Filter logs logic
  const filteredLogs = logs?.logs?.filter((log: any) => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.adminId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.ipAddress.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTarget = targetFilter === "ALL" || log.targetType === targetFilter;

    return matchesSearch && matchesTarget;
  }) || [];

  // Export to CSV helper
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error("No ledger entries to export.");
      return;
    }

    const headers = ["Log ID", "Admin ID", "Action", "Target Type", "Target ID", "IP Address", "User Agent", "Timestamp"];
    const rows = filteredLogs.map((log: any) => [
      log.id,
      log.adminId,
      log.action,
      log.targetType,
      log.targetId || "N/A",
      log.ipAddress,
      `"${log.userAgent.replace(/"/g, '""')}"`,
      log.createdAt
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `platform_audit_ledger_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Ledger logs exported to CSV.");
  };

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-zinc-800 bg-zinc-950 p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest text-red-500">AUDIT_LOG_LEDGER</h2>
          <p className="text-[10px] text-zinc-500">Tamper-proof append-only ledger tracking all administrative actions</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="flex items-center space-x-1 border border-zinc-700 bg-zinc-900 px-3 py-1.5 font-bold text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors"
        >
          <Download className="h-3.5 w-3.5" />
          <span>EXPORT_TO_CSV</span>
        </button>
      </div>

      {/* Query Filters */}
      <div className="flex flex-wrap gap-4 border border-zinc-800 bg-zinc-950 p-4 text-[10px]">
        {/* Search */}
        <div className="flex-1 min-w-[200px] space-y-1">
          <span className="block font-bold text-zinc-500 uppercase">Search logs</span>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-500" />
            <input 
              type="text"
              placeholder="Search Action, IP, Admin ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-zinc-800 bg-zinc-900 py-1.5 pl-8 pr-3 text-zinc-200 outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Target Type Filter */}
        <div className="space-y-1">
          <span className="block font-bold text-zinc-500 uppercase">Target type</span>
          <div className="flex border border-zinc-800">
            {["ALL", "company", "user", "feature_flag", "ai_configuration"].map((t) => (
              <button
                key={t}
                onClick={() => setTargetFilter(t)}
                className={`px-3 py-1.5 font-bold transition-colors ${
                  targetFilter === t 
                    ? "bg-amber-500 text-black" 
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-850 hover:text-white"
                }`}
              >
                {t.replace("_", " ").toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Ledger Table */}
      <div className="border border-zinc-800 bg-zinc-950">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[9px] bg-zinc-900/30">
              <th className="p-3 w-8"></th>
              <th className="p-3 font-bold">Timestamp</th>
              <th className="p-3 font-bold">Admin ID</th>
              <th className="p-3 font-bold">Action Taken</th>
              <th className="p-3 font-bold">Target Type</th>
              <th className="p-3 font-bold">Target ID</th>
              <th className="p-3 font-bold">Network IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log: any) => {
                const isExpanded = expandedLogId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <tr 
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="hover:bg-zinc-900/40 cursor-pointer transition-colors"
                    >
                      <td className="p-3">
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                        )}
                      </td>
                      <td className="p-3 text-zinc-300">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="p-3 font-bold text-zinc-400">{log.adminId.slice(0, 8)}</td>
                      <td className="p-3 font-bold text-zinc-100 uppercase">{log.action}</td>
                      <td className="p-3 text-zinc-400 uppercase">{log.targetType}</td>
                      <td className="p-3 text-zinc-500">{log.targetId?.slice(0, 12) || "GLOBAL"}</td>
                      <td className="p-3 text-zinc-400">{log.ipAddress}</td>
                    </tr>

                    {/* Expandable JSON state diff viewer */}
                    {isExpanded && (
                      <tr>
                        <td colSpan={7} className="p-4 bg-zinc-900/50 border-t border-zinc-900">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <span className="block text-[9px] font-bold text-zinc-500 uppercase">State Before Action</span>
                              <pre className="border border-zinc-800 bg-black/60 p-3 max-h-40 overflow-y-auto custom-scrollbar text-[10px] text-red-400 leading-tight">
                                {JSON.stringify(log.beforeState || {}, null, 2)}
                              </pre>
                            </div>
                            <div className="space-y-1">
                              <span className="block text-[9px] font-bold text-zinc-500 uppercase">State After Action</span>
                              <pre className="border border-zinc-800 bg-black/60 p-3 max-h-40 overflow-y-auto custom-scrollbar text-[10px] text-emerald-400 leading-tight">
                                {JSON.stringify(log.afterState || {}, null, 2)}
                              </pre>
                            </div>
                          </div>
                          <div className="mt-3 text-[9px] text-zinc-500 uppercase font-bold">
                            User Agent: <span className="text-zinc-400 font-normal">{log.userAgent}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-600 font-bold">
                  NO_AUDIT_LOG_RECORDS
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
