import * as React from "react";
import { cn } from "@/lib/utils";

// ── Variant map ───────────────────────────────────────────────

const badgeVariants = {
  default: "bg-[var(--color-surface-alt)] text-[var(--color-text)] border-[var(--color-border)]",
  accent:  "bg-[var(--color-accent-dim)] text-[var(--color-accent)] border-[var(--color-accent-muted)]",
  success: "bg-emerald-950 text-emerald-400 border-emerald-800",
  warning: "bg-amber-950 text-amber-400 border-amber-800",
  error:   "bg-red-950 text-red-400 border-red-800",
  info:    "bg-blue-950 text-blue-400 border-blue-800",
  muted:   "bg-[var(--color-surface)] text-[var(--color-text-subtle)] border-[var(--color-border)]",
} as const;

export type BadgeVariant = keyof typeof badgeVariants;

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({
  className,
  variant = "default",
  dot = false,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5",
        "px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider",
        "border rounded-[var(--radius-xs)]",
        "whitespace-nowrap leading-none",
        badgeVariants[variant],
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full shrink-0",
            variant === "success" && "bg-emerald-400",
            variant === "warning" && "bg-amber-400",
            variant === "error"   && "bg-red-400",
            variant === "info"    && "bg-blue-400",
            variant === "accent"  && "bg-[var(--color-accent)]",
            (variant === "default" || variant === "muted") && "bg-[var(--color-text-muted)]"
          )}
        />
      )}
      {children}
    </span>
  );
}
