"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Dashboard Error:", error);
  }, [error]);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col items-center justify-center p-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-6">
        <AlertTriangle className="h-8 w-8 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)] mb-2">
        Something went wrong!
      </h2>
      <p className="text-[var(--color-text-muted)] max-w-md mb-8">
        We&apos;ve encountered an unexpected error. Our team has been notified.
        Please try again or contact support if the issue persists.
      </p>
      
      <div className="flex items-center gap-4">
        <button
          onClick={() => reset()}
          className="flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary)]/90 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        >
          <RefreshCcw className="h-4 w-4" />
          Try again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
        >
          Reload Page
        </button>
      </div>
      
      {process.env.NODE_ENV === "development" && (
        <div className="mt-8 p-4 rounded-md bg-red-500/10 border border-red-500/20 text-left max-w-2xl w-full overflow-auto">
          <p className="text-sm font-mono text-red-500 break-words">
            {error.message}
          </p>
        </div>
      )}
    </div>
  );
}
