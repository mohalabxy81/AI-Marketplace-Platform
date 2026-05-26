"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";
import { getInitials } from "@/lib/utils";

// ── Size map ──────────────────────────────────────────────────

const sizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-11 w-11 text-base",
  xl: "h-14 w-14 text-lg",
} as const;

// ── Types ─────────────────────────────────────────────────────

interface AvatarProps {
  src?: string | null;
  name?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const initials = getInitials(name);

  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative flex shrink-0 overflow-hidden rounded-[var(--radius-xs)]",
        "bg-[var(--color-surface-alt)] border border-[var(--color-border)]",
        sizes[size],
        className
      )}
    >
      {src && (
        <AvatarPrimitive.Image
          src={src}
          alt={name ?? "User avatar"}
          className="h-full w-full object-cover"
        />
      )}
      <AvatarPrimitive.Fallback
        className={cn(
          "flex h-full w-full items-center justify-center",
          "font-semibold text-[var(--color-accent)] bg-[var(--color-accent-dim)]"
        )}
      >
        {initials}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
