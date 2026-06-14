import * as React from "react";
import { cn } from "@/lib/utils";

// ── Variant maps ──────────────────────────────────────────────

const variantClasses = {
  primary: [
    "bg-[var(--color-accent)] text-black border border-[var(--color-accent)]",
    "hover:bg-amber-400 hover:border-amber-400",
    "active:scale-[0.97]",
  ].join(" "),

  secondary: [
    "bg-[var(--color-surface-alt)] text-[var(--color-text)] border border-[var(--color-border)]",
    "hover:bg-[var(--color-border)] hover:border-[var(--color-text-subtle)]",
    "active:scale-[0.97]",
  ].join(" "),

  ghost: [
    "bg-transparent text-[var(--color-text-muted)] border border-transparent",
    "hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]",
    "active:scale-[0.97]",
  ].join(" "),

  outline: [
    "bg-transparent text-[var(--color-text)] border border-[var(--color-border)]",
    "hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]",
    "active:scale-[0.97]",
  ].join(" "),

  destructive: [
    "bg-[var(--color-error)] text-white border border-[var(--color-error)]",
    "hover:bg-red-600 hover:border-red-600",
    "active:scale-[0.97]",
  ].join(" "),
};

const sizeClasses = {
  sm: "h-7 px-3 text-xs gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-6 text-sm gap-2",
  icon: "h-9 w-9 p-0",
};

// ── Types ─────────────────────────────────────────────────────

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variantClasses;
  size?: keyof typeof sizeClasses;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

// ── Component ─────────────────────────────────────────────────

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          // Base
          "inline-flex items-center justify-center font-medium",
          "transition-all duration-[var(--duration-fast)]",
          "rounded-[var(--radius-xs)] select-none cursor-pointer",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
          "focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2",
          // Variants & sizes
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner className="shrink-0" />
            <span>Loading…</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);
Button.displayName = "Button";

// ── Spinner ───────────────────────────────────────────────────

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-4 w-4 animate-spin", className)}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeDasharray="32"
        strokeDashoffset="12"
        strokeLinecap="round"
      />
    </svg>
  );
}
