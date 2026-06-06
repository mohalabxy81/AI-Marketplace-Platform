"use client";

import { User, Edit3, Trash2, Mail, Shield, Share, Eye, CheckCircle } from "lucide-react";
import type { DbAuditLog } from "@/types/database";

const actionConfig = {
  created: { icon: CheckCircle, color: "text-emerald-400 bg-emerald-400/10 border-emerald-500/20" },
  edited: { icon: Edit3, color: "text-blue-400 bg-blue-400/10 border-blue-500/20" },
  deleted: { icon: Trash2, color: "text-red-400 bg-red-400/10 border-red-500/20" },
  invited: { icon: Mail, color: "text-amber-400 bg-amber-400/10 border-amber-500/20" },
  role_changed: { icon: Shield, color: "text-orange-400 bg-orange-400/10 border-orange-500/20" },
  published: { icon: Share, color: "text-cyan-400 bg-cyan-400/10 border-cyan-500/20" },
  archived: { icon: Eye, color: "text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border-[var(--color-border)]" },
};

interface ActivityItemProps {
  activity: DbAuditLog & { actor: { full_name: string | null; email: string; role: string } };
}

export function ActivityItem({ activity }: ActivityItemProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const config = (actionConfig as any)[activity.action] || { icon: User, color: "text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border-[var(--color-border)]" };
  const Icon = config.icon;

  const actorName = activity.actor?.full_name || activity.actor?.email || "System/Operator";

  return (
    <div className="flex gap-4 relative">
      <div className="absolute top-10 bottom-0 left-5 w-px bg-[var(--color-border)] -ml-px" />
      
      <div className={`relative z-10 flex shrink-0 items-center justify-center w-10 h-10 rounded-[var(--radius-xs)] border border-[var(--color-border)] ${config.color} ring-4 ring-[var(--color-bg)]`}>
        <Icon className="w-4 h-4" />
      </div>
      
      <div className="flex-1 pb-8">
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-sm)] p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
            <p className="text-xs text-[var(--color-text-muted)]">
              <span className="font-semibold text-[var(--color-text)] text-sm">{actorName}</span>
              {" "}
              <span className="text-[var(--color-text-muted)]">performed action</span>
              {" "}
              <span className="font-mono text-[var(--color-accent)] uppercase text-[10px] bg-[var(--color-accent-dim)] px-1.5 py-0.5 rounded-[var(--radius-xs)] border border-[var(--color-accent)]/20">{activity.action}</span>
              {" "}
              <span className="text-[var(--color-text-muted)]">on entity</span>
              {" "}
              <span className="font-semibold text-[var(--color-text)]">{activity.entity_type}</span>
            </p>
            <span className="text-[10px] font-mono text-[var(--color-text-subtle)]">
              {new Date(activity.created_at).toLocaleString()}
            </span>
          </div>
          {Object.keys(activity.metadata || {}).length > 0 && (
            <div className="mt-2 text-[10px] text-[var(--color-text-muted)] bg-[var(--color-surface-alt)] border border-[var(--color-border)] p-2 rounded-[var(--radius-xs)] font-mono max-h-40 overflow-y-auto">
              {JSON.stringify(activity.metadata, null, 2)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
