/* eslint-disable @typescript-eslint/no-unused-vars */
// features/platform-core/components/admin-topbar.tsx
"use client";

import * as React from "react";
import { ShieldAlert, Bell, Search, ShieldAlert as ImpersonateIcon } from "lucide-react";
import { useAdminAuth } from "../hooks/use-admin-auth";
import { usePlatformUIStore } from "@/store/super-admin/platform-ui.store";
import { cn } from "@/lib/utils";

export function AdminTopbar() {
  const { admin } = useAdminAuth();
  const { alerts, sidebarCollapsed } = usePlatformUIStore();

  const activeAlertsCount = alerts.filter((a) => a.type === "error" || a.type === "warning").length;

  if (!admin) return null;

  return (
    <header className="flex h-16 items-center justify-between px-6 border-b border-zinc-800 bg-zinc-950 shrink-0">
      {/* Left Area: Path / System Indicator */}
      <div className="flex items-center gap-4">
        <span className="font-mono text-xs uppercase tracking-wider text-zinc-500">
          SYS_NODE: <span className="text-zinc-300 font-bold">REVERSO_01</span>
        </span>
        <div className="h-4 w-px bg-zinc-800" />
        <span className="text-xs text-zinc-400 font-medium font-mono">
          SECURE_CHANNEL: <span className="text-emerald-400 font-bold">ACTIVE</span>
        </span>
      </div>

      {/* Right Area: Controls & Alerts */}
      <div className="flex items-center gap-4">
        {/* Cmd+K Search trigger placeholder */}
        <button
          className="flex h-8 items-center gap-2 border border-zinc-800 bg-zinc-900 px-3 text-[10px] text-zinc-500 hover:text-zinc-300 hover:border-zinc-700 transition-colors outline-none rounded-none cursor-pointer"
          onClick={() => {
            // Dispatch custom keyboard event to trigger command palette
            const event = new KeyboardEvent("keydown", { key: "k", metaKey: true });
            window.dispatchEvent(event);
          }}
        >
          <Search className="h-3.5 w-3.5" />
          <span className="font-mono">SEARCH_NODE (⌘K)</span>
        </button>

        {/* Live Alerts Indicator */}
        <div className="relative">
          <button
            className={cn(
              "flex h-8 w-8 items-center justify-center border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all outline-none rounded-none cursor-pointer",
              activeAlertsCount > 0 && "border-amber-500/50 text-amber-500 bg-amber-950/10 animate-pulse"
            )}
            title={`${activeAlertsCount} active risk warnings`}
          >
            <ShieldAlert className="h-4 w-4" />
          </button>
          {activeAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center bg-amber-500 font-mono text-[9px] font-black text-black">
              {activeAlertsCount}
            </span>
          )}
        </div>

        {/* System Activity Logs count */}
        <button
          className="flex h-8 w-8 items-center justify-center border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors outline-none rounded-none cursor-pointer"
          title="Notification Broadcast Logs"
        >
          <Bell className="h-4 w-4" />
        </button>

        <div className="h-6 w-px bg-zinc-800" />

        {/* Operational Scope details */}
        <div className="flex flex-col text-right font-mono">
          <span className="text-[10px] font-bold text-zinc-300 uppercase leading-none">
            {admin.email}
          </span>
          <span className="text-[8px] text-zinc-500 leading-none mt-1">
            CLASS_{admin.role}
          </span>
        </div>
      </div>
    </header>
  );
}
