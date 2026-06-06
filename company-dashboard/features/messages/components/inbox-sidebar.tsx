"use client";

import { Users, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChatTarget {
  id: string;
  name: string;
  type: "channel" | "direct";
  description: string;
}

interface InboxSidebarProps {
  targets: ChatTarget[];
  activeId: string;
  onSelect: (id: string) => void;
}

export function InboxSidebar({ targets, activeId, onSelect }: InboxSidebarProps) {
  const channels = targets.filter((t) => t.type === "channel");
  const directs = targets.filter((t) => t.type === "direct");

  return (
    <div className="w-80 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col h-[calc(100vh-var(--header-height)-1.5rem)] shrink-0">
      <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)] flex items-center justify-between">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--color-text)] uppercase">Workspace Inbox</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
        {/* Channels Section */}
        <div>
          <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--color-text-subtle)] uppercase tracking-wider">
            Channels
          </div>
          <div className="space-y-0.5 mt-1">
            {channels.map((channel) => {
              const isActive = channel.id === activeId;
              return (
                <button
                  key={channel.id}
                  onClick={() => onSelect(channel.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-[var(--radius-xs)] font-medium text-left transition-colors outline-none",
                    isActive
                      ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)] border-l-2 border-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]"
                  )}
                >
                  <Hash className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{channel.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div>
          <div className="px-3 py-1.5 text-[10px] font-bold text-[var(--color-text-subtle)] uppercase tracking-wider">
            Direct Messages
          </div>
          <div className="space-y-0.5 mt-1">
            {directs.map((direct) => {
              const isActive = direct.id === activeId;
              return (
                <button
                  key={direct.id}
                  onClick={() => onSelect(direct.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-[var(--radius-xs)] font-medium text-left transition-colors outline-none",
                    isActive
                      ? "bg-[var(--color-accent-dim)] text-[var(--color-accent)] border-l-2 border-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]"
                  )}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{direct.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
