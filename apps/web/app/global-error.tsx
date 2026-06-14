"use client";

import { Geist, Geist_Mono } from "next/font/google";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 mb-6">
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--color-text)] mb-2">
            Critical System Error
          </h2>
          <p className="text-[var(--color-text-muted)] max-w-md mb-8">
            A critical error occurred that prevented the application from loading. 
            Please try refreshing the page.
          </p>
          
          <button
            onClick={() => reset()}
            className="flex items-center gap-2 rounded-md bg-[var(--color-primary)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-primary)]/90 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
          >
            <RefreshCcw className="h-4 w-4" />
            Try again
          </button>
          
          {process.env.NODE_ENV === "development" && (
            <div className="mt-8 p-4 rounded-md bg-red-500/10 border border-red-500/20 text-left max-w-2xl w-full overflow-auto">
              <p className="text-sm font-mono text-red-500 break-words">
                {error.message}
              </p>
            </div>
          )}
        </div>
      </body>
    </html>
  );
}
