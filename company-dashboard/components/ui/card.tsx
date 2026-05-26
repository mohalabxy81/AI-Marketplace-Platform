import * as React from "react";
import { cn } from "@/lib/utils";

// ── Card ──────────────────────────────────────────────────────

export const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { noPadding?: boolean }
>(({ className, noPadding, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "bg-[var(--color-surface)] border border-[var(--color-border)]",
      "rounded-[var(--radius-xs)]",
      !noPadding && "p-5",
      className
    )}
    {...props}
  />
));
Card.displayName = "Card";

// ── CardHeader ────────────────────────────────────────────────

export const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col gap-1 pb-4 border-b border-[var(--color-border)]", className)}
    {...props}
  />
));
CardHeader.displayName = "CardHeader";

// ── CardTitle ─────────────────────────────────────────────────

export const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn(
      "text-sm font-semibold text-[var(--color-text)] tracking-tight",
      className
    )}
    {...props}
  />
));
CardTitle.displayName = "CardTitle";

// ── CardDescription ───────────────────────────────────────────

export const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-xs text-[var(--color-text-muted)]", className)}
    {...props}
  />
));
CardDescription.displayName = "CardDescription";

// ── CardContent ───────────────────────────────────────────────

export const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("pt-4", className)} {...props} />
));
CardContent.displayName = "CardContent";

// ── CardFooter ────────────────────────────────────────────────

export const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex items-center gap-3 pt-4 mt-4 border-t border-[var(--color-border)]",
      className
    )}
    {...props}
  />
));
CardFooter.displayName = "CardFooter";
