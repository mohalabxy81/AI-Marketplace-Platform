import * as React from "react";
import { cn } from "@/lib/utils";

// ── Input ─────────────────────────────────────────────────────

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftSlot?: React.ReactNode;
  rightSlot?: React.ReactNode;
  wrapperClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      leftSlot,
      rightSlot,
      id,
      wrapperClassName,
      ...props
    },
    ref
  ) => {
    const inputId = id ?? `input-${Math.random().toString(36).slice(2, 7)}`;

    return (
      <div className={cn("flex flex-col gap-1.5", wrapperClassName)}>
        {label && (
          <label
            htmlFor={inputId}
            className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftSlot && (
            <span className="absolute left-3 flex items-center text-[var(--color-text-subtle)]">
              {leftSlot}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              // Base
              "w-full h-9 bg-[var(--color-surface)] text-sm text-[var(--color-text)]",
              "border border-[var(--color-border)] rounded-[var(--radius-xs)]",
              "placeholder:text-[var(--color-text-subtle)]",
              "transition-colors duration-[var(--duration-fast)]",
              "focus:outline-none focus:border-[var(--color-accent)]",
              // Slots
              leftSlot  ? "pl-9 pr-3"  : "px-3",
              rightSlot ? "pr-9" : "",
              // Error
              error && "border-[var(--color-error)] focus:border-[var(--color-error)]",
              // Disabled
              "disabled:opacity-50 disabled:cursor-not-allowed",
              className
            )}
            {...props}
          />

          {rightSlot && (
            <span className="absolute right-3 flex items-center text-[var(--color-text-subtle)]">
              {rightSlot}
            </span>
          )}
        </div>

        {error && (
          <p className="text-xs text-[var(--color-error)]">{error}</p>
        )}
        {helperText && !error && (
          <p className="text-xs text-[var(--color-text-subtle)]">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
