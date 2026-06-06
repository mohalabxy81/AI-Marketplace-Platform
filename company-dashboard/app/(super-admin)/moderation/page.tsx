"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  Filter,
  Trash2,
  AlertTriangle,
  Eye,
  CheckCircle,
  HelpCircle,
  PlusCircle,
  Slash,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────

interface ModerationItem {
  id: string;
  target_type: "listing" | "user" | "review";
  target_id: string;
  company_id: string;
  company_name: string;
  reports_count: number;
  risk_score: number;
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "PENDING" | "APPROVED" | "REJECTED";
  details: {
    title: string;
    reason: string;
    reporter: string;
  };
}

// ── Mock Queue Data ─────────────────────────────────────────────

const INITIAL_QUEUE: ModerationItem[] = [
  {
    id: "MOD-001",
    target_type: "listing",
    target_id: "LST-9e4f2b",
    company_id: "CMP-0042",
    company_name: "Metropolis Realty Group",
    reports_count: 4,
    risk_score: 84.5,
    priority: "HIGH",
    status: "PENDING",
    details: {
      title: "Cozy Downtown Penthouse Suite",
      reason: "Suspected rental bait-and-switch advertising. Pricing is 80% below median local index.",
      reporter: "user_agent_8291@reverso.sh",
    },
  },
  {
    id: "MOD-002",
    target_type: "user",
    target_id: "USR-3a9d1c",
    company_id: "CMP-0182",
    company_name: "Apex Logistics",
    reports_count: 7,
    risk_score: 92.0,
    priority: "CRITICAL",
    status: "PENDING",
    details: {
      title: "alex.mercer@apexlogistics.sh",
      reason: "Rapid automated listing injection detected (140 submissions within 12 seconds). Suspected API script abuse.",
      reporter: "Security Gateway Sentinel",
    },
  },
  {
    id: "MOD-003",
    target_type: "review",
    target_id: "REV-7f2e4b",
    company_id: "CMP-0091",
    company_name: "Hesperia Logistics",
    reports_count: 2,
    risk_score: 41.2,
    priority: "LOW",
    status: "PENDING",
    details: {
      title: "Review on Warehouse B Listing",
      reason: "Offensive language and toxic communication targeting agent response.",
      reporter: "sentiment_classifier_bot",
    },
  },
];

export default function ModerationPage() {
  const [queue, setQueue] = useState<ModerationItem[]>(INITIAL_QUEUE);
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [activeItem, setActiveItem] = useState<ModerationItem | null>(null);
  const [actionType, setActionType] = useState<"approve" | "ban" | null>(null);
  const [justification, setJustification] = useState("");

  const handleSelectToggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (filteredItems: ModerationItem[]) => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((item) => item.id));
    }
  };

  const handleActionClick = (item: ModerationItem, action: "approve" | "ban") => {
    setActiveItem(item);
    setActionType(action);
    setJustification("");
  };

  const handleConfirmAction = () => {
    if (!activeItem || !actionType) return;

    setQueue((prev) =>
      prev.map((item) => {
        if (item.id === activeItem.id) {
          return {
            ...item,
            status: actionType === "approve" ? "APPROVED" : "REJECTED",
          };
        }
        return item;
      })
    );

    setActiveItem(null);
    setActionType(null);
  };

  const handleBulkAction = (action: "approve" | "ban") => {
    if (selectedIds.length === 0) return;

    setQueue((prev) =>
      prev.map((item) => {
        if (selectedIds.includes(item.id)) {
          return {
            ...item,
            status: action === "approve" ? "APPROVED" : "REJECTED",
          };
        }
        return item;
      })
    );

    setSelectedIds([]);
  };

  // Filter items
  const filteredItems = queue.filter((item) => {
    const matchesPriority = priorityFilter === "ALL" || item.priority === priorityFilter;
    const matchesType = typeFilter === "ALL" || item.target_type === typeFilter;
    const matchesSearch =
      item.id.toLowerCase().includes(search.toLowerCase()) ||
      item.company_name.toLowerCase().includes(search.toLowerCase()) ||
      item.details.title.toLowerCase().includes(search.toLowerCase()) ||
      item.details.reason.toLowerCase().includes(search.toLowerCase());

    return matchesPriority && matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h2 className="text-2xl font-bold leading-7 text-white sm:truncate sm:text-3xl sm:tracking-tight">
          Trust & Safety Moderation Queue
        </h2>
        <p className="mt-1 text-sm leading-6 text-neutral-400">
          Govern platform listings, user accounts, and reviews reported for policy violations.
        </p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-neutral-800 bg-neutral-900/50 p-4 rounded-xl">
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Total Pending items</p>
          <p className="text-2xl font-extrabold text-white mt-1">
            {queue.filter((i) => i.status === "PENDING").length}
          </p>
        </div>
        <div className="border border-neutral-800 bg-neutral-900/50 p-4 rounded-xl">
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Critical Priority Issues</p>
          <p className="text-2xl font-extrabold text-red-500 mt-1">
            {queue.filter((i) => i.status === "PENDING" && i.priority === "CRITICAL").length}
          </p>
        </div>
        <div className="border border-neutral-800 bg-neutral-900/50 p-4 rounded-xl">
          <p className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Platform Auto-Flag Score</p>
          <p className="text-2xl font-extrabold text-amber-500 mt-1">87.4% accuracy</p>
        </div>
      </div>

      {/* Filter panel */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between border border-neutral-800 bg-neutral-900/50 p-4 rounded-xl">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
          <input
            id="moderation-search"
            type="text"
            placeholder="Search report logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-white focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto items-center justify-end">
          {/* Priority filter buttons */}
          <div className="flex items-center border border-neutral-800 bg-neutral-950 rounded-lg overflow-hidden h-9">
            {["ALL", "LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
              <button
                key={p}
                onClick={() => setPriorityFilter(p)}
                className={`px-3 py-1.5 text-[10px] font-bold uppercase transition-colors ${
                  priorityFilter === p
                    ? "bg-amber-500 text-black"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Type Filter dropdown */}
          <select
            id="moderation-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-3 text-[10px] uppercase font-bold bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-300 focus:outline-none"
          >
            <option value="ALL">All Types</option>
            <option value="listing">Listings</option>
            <option value="user">Users</option>
            <option value="review">Reviews</option>
          </select>
        </div>
      </div>

      {/* Bulk Toolbar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between border border-red-500/30 bg-red-950/20 px-4 py-3 rounded-xl text-red-400 text-xs font-bold uppercase">
          <span>{selectedIds.length} queue items marked for action</span>
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkAction("approve")}
              className="border border-emerald-500 px-3 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black transition-colors rounded-lg"
            >
              APPROVE ALL
            </button>
            <button
              onClick={() => handleBulkAction("ban")}
              className="border border-red-500 px-3 py-1 bg-red-500/15 text-red-500 hover:bg-red-500 hover:text-black transition-colors rounded-lg"
            >
              BAN ALL
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1 text-neutral-400 hover:text-white"
            >
              CLEAR
            </button>
          </div>
        </div>
      )}

      {/* Queue Table */}
      <div className="border border-neutral-800 bg-neutral-900/20 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-neutral-800 text-neutral-400 uppercase text-[9px] bg-neutral-950/50">
              <th className="p-3.5 w-10">
                <input
                  type="checkbox"
                  checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                  onChange={() => handleSelectAll(filteredItems)}
                  className="accent-amber-500"
                />
              </th>
              <th className="p-3.5">Target entity</th>
              <th className="p-3.5">Risk Factor</th>
              <th className="p-3.5">Priority</th>
              <th className="p-3.5">Status</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-800/80">
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-neutral-900/30 transition-colors">
                  <td className="p-3.5">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={() => handleSelectToggle(item.id)}
                      disabled={item.status !== "PENDING"}
                      className="accent-amber-500 disabled:opacity-40"
                    />
                  </td>
                  <td className="p-3.5 space-y-1">
                    <div className="font-bold text-white uppercase flex items-center gap-1.5">
                      <span className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded uppercase font-mono">
                        {item.target_type}
                      </span>
                      <span>{item.details.title}</span>
                    </div>
                    <p className="text-[10px] text-neutral-400 max-w-lg">{item.details.reason}</p>
                    <div className="text-[9px] text-neutral-500 font-mono">
                      Target: {item.target_id} | Issuer: {item.company_name} | Reported by: {item.details.reporter}
                    </div>
                  </td>
                  <td className="p-3.5">
                    <span className={`font-mono font-bold ${item.risk_score > 75 ? "text-red-400" : "text-amber-400"}`}>
                      {item.risk_score.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        item.priority === "CRITICAL"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse"
                          : item.priority === "HIGH"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-neutral-800 text-neutral-400"
                      }`}
                    >
                      {item.priority}
                    </span>
                  </td>
                  <td className="p-3.5">
                    <span
                      className={`font-semibold uppercase tracking-wider text-[10px] ${
                        item.status === "APPROVED"
                          ? "text-emerald-400"
                          : item.status === "REJECTED"
                          ? "text-red-400"
                          : "text-neutral-400"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    {item.status === "PENDING" ? (
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleActionClick(item, "approve")}
                          className="flex items-center gap-1 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 px-2 py-1 text-[10px] hover:bg-emerald-500 hover:text-black transition-colors rounded"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleActionClick(item, "ban")}
                          className="flex items-center gap-1 border border-red-500/30 bg-red-500/10 text-red-400 px-2 py-1 text-[10px] hover:bg-red-500 hover:text-black transition-colors rounded"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Ban
                        </button>
                      </div>
                    ) : (
                      <span className="text-neutral-500 italic text-[10px]">Resolved</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="p-8 text-center text-neutral-500 font-semibold font-mono">
                  CLEAR_REPORT_STATE_REACHED
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      {activeItem && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md border border-neutral-800 bg-neutral-900 p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="text-xs font-bold uppercase text-amber-500 flex items-center gap-1.5">
                <ShieldAlert className="h-4 w-4" />
                Confirm Governance Action
              </span>
              <button onClick={() => { setActiveItem(null); setActionType(null); }} className="text-neutral-400 hover:text-white text-xs">
                [Close]
              </button>
            </div>

            <div className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 space-y-1">
              <p className="text-[10px] uppercase font-bold text-neutral-500">Target Object</p>
              <p className="text-xs text-white font-semibold">{activeItem.details.title}</p>
              <p className="text-[10px] text-neutral-400 mt-1">{activeItem.details.reason}</p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase text-neutral-400">Action Rationale Reason</label>
              <textarea
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Reasoning justification is mandatory under platform auditing standards..."
                className="w-full h-20 bg-neutral-950 border border-neutral-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setActiveItem(null); setActionType(null); }}
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                disabled={!justification.trim()}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors border ${
                  actionType === "approve"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black"
                    : "border-red-500 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-black"
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                Confirm {actionType === "approve" ? "Approval" : "Ban"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
