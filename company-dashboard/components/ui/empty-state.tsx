import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center",
        "border border-dashed border-[var(--color-border)] rounded-[var(--radius-xs)]",
        "bg-[var(--color-surface)]",
        className
      )}
      {...props}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-[var(--radius-xs)] bg-[var(--color-surface-alt)] mb-4">
        <Icon className="h-6 w-6 text-[var(--color-text-muted)]" />
      </div>
      <h3 className="text-sm font-semibold text-[var(--color-text)] mb-1">
        {title}
      </h3>
      <p className="text-sm text-[var(--color-text-subtle)] max-w-sm mb-6">
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
}
