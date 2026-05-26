import * as React from "react";
import { cn } from "@/lib/utils";

// ── PageContainer ─────────────────────────────────────────────

export const PageContainer = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <main
    ref={ref}
    className={cn(
      "flex-1 flex flex-col min-h-[calc(100vh-var(--header-height))]",
      "p-4 md:p-8 max-w-7xl mx-auto w-full",
      "page-enter",
      className
    )}
    {...props}
  />
));
PageContainer.displayName = "PageContainer";

// ── PageHeader ────────────────────────────────────────────────

export const PageHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8", className)}
    {...props}
  />
));
PageHeader.displayName = "PageHeader";

// ── PageTitle ─────────────────────────────────────────────────

export const PageTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h1
    ref={ref}
    className={cn("text-display text-[var(--color-text)]", className)}
    {...props}
  />
));
PageTitle.displayName = "PageTitle";

// ── PageDescription ───────────────────────────────────────────

export const PageDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-body text-[var(--color-text-muted)] max-w-2xl mt-2", className)}
    {...props}
  />
));
PageDescription.displayName = "PageDescription";

// ── PageContent ───────────────────────────────────────────────

export const PageContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("flex-1", className)} {...props} />
));
PageContent.displayName = "PageContent";
