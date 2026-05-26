// features/platform-core/components/command-palette.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Terminal, ArrowRight, ShieldAlert, Cpu, CreditCard, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  title: string;
  category: string;
  href: string;
  icon: React.ComponentType<any>;
}

const PLATFORM_COMMANDS: CommandItem[] = [
  { id: "overview", title: "Go to Command Center Overview", category: "Platform Ops", href: "/super-admin/overview", icon: Terminal },
  { id: "tenants", title: "View Tenant Registry and Statuses", category: "Platform Ops", href: "/super-admin/tenants", icon: Terminal },
  { id: "billing", title: "Configure Stripe and Meted Subscriptions", category: "Monetization", href: "/super-admin/billing", icon: CreditCard },
  { id: "moderation", title: "Process Content Flags Queue", category: "Trust & Safety", href: "/super-admin/moderation", icon: ShieldAlert },
  { id: "ai", title: "Tune Recommendation and Hybrid weights", category: "AI Control", href: "/super-admin/ai-control", icon: Cpu },
  { id: "analytics", title: "Inspect ARR, MRR, and Cohorts BI", category: "Intelligence", href: "/super-admin/analytics", icon: History },
  { id: "support", title: "Manage Support Tickets & Impersonation", category: "Support", href: "/super-admin/support", icon: Settings },
  { id: "feature-flags", title: "Toggle Feature Rollout Allocations", category: "SaaS Flags", href: "/super-admin/feature-flags", icon: Settings },
  { id: "audit", title: "Review Safe Platform Audit Log Ledger", category: "Governance", href: "/super-admin/audit", icon: History }
];

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredCommands = PLATFORM_COMMANDS.filter((cmd) =>
    cmd.title.toLowerCase().includes(search.toLowerCase()) ||
    cmd.category.toLowerCase().includes(search.toLowerCase())
  );

  React.useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  const handleSelect = (href: string) => {
    router.push(href);
    setIsOpen(false);
    setSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleSelect(filteredCommands[selectedIndex].href);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center bg-black/80 backdrop-none p-4 pt-[15vh]">
      {/* Backdrop Closer */}
      <div className="absolute inset-0 cursor-crosshair" onClick={() => setIsOpen(false)} />

      {/* Console Frame */}
      <div 
        className="relative flex w-full max-w-lg flex-col border border-zinc-800 bg-zinc-950 rounded-none shadow-2xl overflow-hidden font-mono"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Box */}
        <div className="flex h-12 items-center gap-3 border-b border-zinc-800 px-4 bg-zinc-900/50">
          <Search className="h-4 w-4 text-zinc-500 shrink-0" />
          <input
            type="text"
            className="flex-1 bg-transparent text-xs text-zinc-200 outline-none placeholder:text-zinc-600 caret-amber-500"
            placeholder="TYPE_COMMAND_TO_NAVIGATE..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
          <span className="text-[9px] border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-zinc-500 font-bold">
            ESC_CLOSE
          </span>
        </div>

        {/* Results Stream */}
        <div className="max-h-72 overflow-y-auto p-2 custom-scrollbar">
          {filteredCommands.length > 0 ? (
            <div className="flex flex-col gap-0.5">
              {filteredCommands.map((cmd, idx) => {
                const Icon = cmd.icon;
                const isSelected = idx === selectedIndex;

                return (
                  <button
                    key={cmd.id}
                    onClick={() => handleSelect(cmd.href)}
                    className={cn(
                      "flex items-center justify-between w-full text-left px-3 py-2.5 rounded-none transition-all outline-none border cursor-pointer",
                      isSelected
                        ? "bg-zinc-900 border-amber-500/50 text-amber-500"
                        : "bg-transparent border-transparent text-zinc-400 hover:bg-zinc-900/30 hover:text-zinc-300"
                    )}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-bold tracking-wide truncate">{cmd.title}</span>
                        <span className="text-[8px] uppercase tracking-widest text-zinc-600 mt-0.5">
                          NODE_SCOPE: {cmd.category}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center text-zinc-600">
              <ShieldAlert className="h-6 w-6 text-zinc-700 mb-2" />
              <span className="text-[10px] uppercase tracking-widest">
                NO_MATCHING_NODES_FOUND
              </span>
            </div>
          )}
        </div>

        {/* Console status footer */}
        <div className="flex h-8 items-center justify-between border-t border-zinc-800 bg-zinc-900/30 px-4 text-[8px] text-zinc-600 uppercase tracking-widest">
          <span>CONSOLE_STATUS: OPERATIONAL</span>
          <span>SELECT: [↑↓] ENTER: [↵]</span>
        </div>
      </div>
    </div>
  );
}
