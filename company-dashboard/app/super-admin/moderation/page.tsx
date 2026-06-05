// app/(super-admin)/moderation/page.tsx
"use client";

import * as React from "react";
import { useAdminAuth } from "@/features/platform-core";
import { useModerationQueueQuery, useActOnModerationMutation } from "@/features/moderation";
import { useModerationQueueStore } from "@/store/super-admin/moderation-queue.store";
import { 
  ShieldAlert, ShieldCheck, HelpCircle, 
  Trash2, AlertTriangle, Eye, ShieldCheck as ApproveIcon,
  ChevronsUp
} from "lucide-react";
import { toast } from "sonner";
import { type ModerationPriority, type ModerationStatus, type ModerationActionTaken } from "@/types/super-admin/trust";

export default function ModerationPage() {
  const { hasCapability, admin } = useAdminAuth();
  const { data: queue } = useModerationQueueQuery();
  const actOnModMutation = useActOnModerationMutation();

  const {
    filters,
    selectedIds,
    setPriorityFilter,
    setStatusFilter,
    setTargetTypeFilter,
    setSearchFilter,
    toggleSelectId,
    setSelectedIds,
    clearSelection
  } = useModerationQueueStore();

  // Action modal state
  const [activeItem, setActiveItem] = React.useState<any | null>(null);
  const [modalAction, setModalAction] = React.useState<ModerationActionTaken>("clear");
  const [justification, setJustification] = React.useState("");

  if (!hasCapability("review_moderation_queue")) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center border border-dashed border-red-500/40 bg-zinc-950 p-8 text-center font-mono text-xs">
        <AlertTriangle className="mb-4 h-8 w-8 text-red-500 animate-pulse" />
        <span className="text-red-500 font-bold uppercase tracking-wider">ERROR: ACCESS_DENIED</span>
        <p className="mt-2 text-zinc-400">
          Required Capability: <code className="bg-zinc-900 px-2 py-1 text-amber-500">review_moderation_queue</code> is missing.
        </p>
      </div>
    );
  }

  const openActionModal = (item: any, action: ModerationActionTaken) => {
    if (!hasCapability("act_on_moderation")) {
      toast.error("Unauthorized: Requires act_on_moderation capability.");
      return;
    }
    setActiveItem(item);
    setModalAction(action);
    setJustification("");
  };

  const submitAction = () => {
    if (!justification) {
      toast.error("Justification reason is required.");
      return;
    }

    actOnModMutation.mutate({
      queueId: activeItem.id,
      actorId: admin?.id || "system",
      action: modalAction,
      justification
    });

    setActiveItem(null);
  };

  const handleBulkAction = async (action: ModerationActionTaken) => {
    if (!hasCapability("act_on_moderation")) {
      toast.error("Unauthorized: Requires act_on_moderation capability.");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("No items selected.");
      return;
    }

    const reason = prompt(`Provide justification for bulk ${action.toUpperCase()} action on ${selectedIds.length} items:`);
    if (!reason) {
      toast.error("Justification is required for bulk actions.");
      return;
    }

    let successCount = 0;
    for (const id of selectedIds) {
      const item = queue?.find(q => q.id === id);
      if (item) {
        await actOnModMutation.mutateAsync({
          queueId: item.id,
          actorId: admin?.id || "system",
          action: action,
          justification: reason
        });
        successCount++;
      }
    }

    clearSelection();
    toast.success(`Bulk operations completed. Action applied to ${successCount} records.`);
  };

  // Filter queue items
  const filteredQueue = queue?.filter((item) => {
    const matchesPriority = filters.priority === "ALL" || item.priority === filters.priority;
    const matchesStatus = filters.status === "ALL" || item.status === filters.status;
    const matchesTargetType = filters.targetType === "ALL" || item.target_type === filters.targetType;
    
    const searchVal = filters.search.toLowerCase();
    const matchesSearch = 
      item.id.toLowerCase().includes(searchVal) ||
      item.company_id.toLowerCase().includes(searchVal) ||
      item.target_id.toLowerCase().includes(searchVal) ||
      (item.details.title as string)?.toLowerCase().includes(searchVal);

    return matchesPriority && matchesStatus && matchesTargetType && matchesSearch;
  }) || [];

  return (
    <div className="space-y-6 font-mono text-xs">
      {/* Title Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border border-zinc-800 bg-zinc-950 p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">SAFETY_MODERATION_QUEUE</h2>
          <p className="text-[10px] text-zinc-500">Live platform abuse filtering and listing governance console</p>
        </div>
      </div>

      {/* Query Filters Bar */}
      <div className="flex flex-wrap gap-4 border border-zinc-800 bg-zinc-950 p-4 text-[10px]">
        {/* Search */}
        <div className="flex-1 min-w-[200px] space-y-1">
          <span className="block font-bold text-zinc-500 uppercase">Search Details</span>
          <input 
            type="text"
            placeholder="Search Target ID, Company..."
            value={filters.search}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-zinc-200 outline-none focus:border-amber-500"
          />
        </div>

        {/* Priority Filter */}
        <div className="space-y-1">
          <span className="block font-bold text-zinc-500 uppercase">Priority filter</span>
          <div className="flex border border-zinc-800">
            {["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p as any)}
                className={`px-3 py-1 font-bold transition-colors ${
                  filters.priority === p 
                    ? "bg-amber-500 text-black" 
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-850 hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-1">
          <span className="block font-bold text-zinc-500 uppercase">Audit Status</span>
          <div className="flex border border-zinc-800">
            {["ALL", "PENDING", "APPROVED", "REJECTED", "ESCALATED"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s as any)}
                className={`px-3 py-1 font-bold transition-colors ${
                  filters.status === s 
                    ? "bg-amber-500 text-black" 
                    : "bg-zinc-900 text-zinc-400 hover:bg-zinc-850 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between border border-red-500/20 bg-red-950/10 px-4 py-3 text-red-500 font-bold uppercase">
          <span>{selectedIds.length} ITEMS_SELECTED_FOR_BULK_ACTION</span>
          <div className="flex space-x-2">
            <button 
              onClick={() => handleBulkAction("clear")}
              className="border border-red-500 px-3 py-1 bg-transparent hover:bg-red-500 hover:text-black transition-colors"
            >
              APPROVE_ALL
            </button>
            <button 
              onClick={() => handleBulkAction("ban")}
              className="border border-red-500 px-3 py-1 bg-red-500 text-black hover:bg-transparent hover:text-red-500 transition-colors"
            >
              BAN_ALL
            </button>
            <button 
              onClick={clearSelection}
              className="border border-zinc-700 px-3 py-1 bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
            >
              CLEAR
            </button>
          </div>
        </div>
      )}

      {/* Main Queue Ledger Grid */}
      <div className="border border-zinc-800 bg-zinc-950">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500 uppercase text-[9px] bg-zinc-900/30">
              <th className="p-3 w-8">
                <input 
                  type="checkbox"
                  checked={filteredQueue.length > 0 && selectedIds.length === filteredQueue.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(filteredQueue.map(item => item.id));
                    } else {
                      clearSelection();
                    }
                  }}
                  className="rounded-none accent-amber-500"
                />
              </th>
              <th className="p-3 font-bold">Queue ID</th>
              <th className="p-3 font-bold">Target Element / Company</th>
              <th className="p-3 font-bold">Risk Weight</th>
              <th className="p-3 font-bold">Priority</th>
              <th className="p-3 font-bold">Status</th>
              <th className="p-3 font-bold text-right">Operational Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850">
            {filteredQueue.length > 0 ? (
              filteredQueue.map((item) => (
                <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                  <td className="p-3">
                    <input 
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => toggleSelectId(item.id)}
                      className="rounded-none accent-amber-500"
                    />
                  </td>
                  <td className="p-3 font-bold text-zinc-400">{item.id.slice(0, 8)}</td>
                  <td className="p-3">
                    <div className="font-bold text-zinc-200 uppercase">
                      {item.target_type}: {item.target_id.slice(0, 10)}
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      Company: {item.company_id} | Reports: {item.reports_count}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`font-bold ${item.risk_score > 80 ? "text-red-500" : "text-amber-500"}`}>
                      {item.risk_score.toFixed(2)}%
                    </span>
                  </td>
                  <td className="p-3">
                    <span className={`inline-flex px-2 py-0.5 font-bold text-[9px] ${
                      item.priority === "CRITICAL" ? "bg-red-950 text-red-500 border border-red-500/20" : "bg-zinc-900 text-zinc-400"
                    }`}>
                      {item.priority}
                    </span>
                  </td>
                  <td className="p-3">
                    <span className="font-bold text-zinc-300 uppercase">{item.status}</span>
                  </td>
                  <td className="p-3 text-right">
                    {item.status === "PENDING" ? (
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => openActionModal(item, "clear")}
                          className="flex items-center space-x-1 border border-emerald-500 bg-emerald-500/10 px-2 py-1 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors"
                        >
                          <ApproveIcon className="h-3 w-3" />
                          <span>APPROVE</span>
                        </button>
                        <button
                          onClick={() => openActionModal(item, "ban")}
                          className="flex items-center space-x-1 border border-red-500 bg-red-500/10 px-2 py-1 text-red-400 hover:bg-red-500 hover:text-black transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>BAN</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-zinc-600 italic">RESOLVED</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="p-8 text-center text-zinc-600 font-bold">
                  NO_THREATS_DETECTED_IN_QUEUE
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Single Item Action Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md border border-zinc-800 bg-zinc-950 p-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <span className="text-[10px] font-bold uppercase text-amber-500 flex items-center space-x-1">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>CONFIRM_MODERATION_DECISION</span>
              </span>
              <button 
                onClick={() => setActiveItem(null)}
                className="text-zinc-500 hover:text-white"
              >
                [X]
              </button>
            </div>
            
            <div className="mt-4 space-y-4">
              <div className="border border-zinc-800 bg-zinc-900 p-3 space-y-1.5">
                <div className="font-bold text-zinc-200">
                  Target: {activeItem.target_type} ({activeItem.target_id})
                </div>
                <div className="text-zinc-400 font-bold">
                  Title: {activeItem.details.title || activeItem.details.user_email || "N/A"}
                </div>
                <div className="text-zinc-500 text-[10px]">
                  Description: {activeItem.details.description || activeItem.details.reason || "N/A"}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                  Reasoning Justification
                </label>
                <textarea
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Explain why this action is compliant with platform guidelines..."
                  className="w-full h-20 border border-zinc-800 bg-zinc-900 p-2 text-zinc-200 outline-none focus:border-amber-500 font-mono text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-zinc-800">
                <button 
                  onClick={() => setActiveItem(null)}
                  className="border border-zinc-800 bg-zinc-900 px-4 py-1.5 text-zinc-400 hover:text-white"
                >
                  CANCEL
                </button>
                <button 
                  onClick={submitAction}
                  className={`border px-4 py-1.5 font-bold transition-colors ${
                    modalAction === "clear"
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-black"
                      : "border-red-500 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black"
                  }`}
                >
                  CONFIRM_{modalAction.toUpperCase()}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
