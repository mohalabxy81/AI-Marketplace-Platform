// app/(super-admin)/layout.tsx
"use client";

import * as React from "react";
import { AdminSidebar } from "@/features/platform-core/components/admin-sidebar";
import { AdminTopbar } from "@/features/platform-core/components/admin-topbar";
import { CommandPalette } from "@/features/platform-core/components/command-palette";
import { useAdminAuth } from "@/features/platform-core/hooks/use-admin-auth";
import { Terminal } from "lucide-react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { admin, isLoading, isAuthenticated } = useAdminAuth();

  // Full-page dark industrial loading skeleton to prevent flash
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-zinc-950 text-zinc-400 font-mono">
        <div className="flex h-12 w-12 items-center justify-center border border-amber-500 bg-amber-950/20 text-amber-500 animate-spin rounded-none">
          <Terminal className="h-5 w-5" />
        </div>
        <span className="mt-4 text-[10px] uppercase tracking-widest text-zinc-500 font-bold animate-pulse">
          INITIALIZING_SECURE_COCKPIT...
        </span>
      </div>
    );
  }

  // Session guard prevents rendering flash before middleware redirection takes over
  if (!isAuthenticated || !admin) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-950 text-zinc-100 font-sans selection:bg-amber-500 selection:text-black">
      {/* 1. Secure Navigation Sidebar */}
      <AdminSidebar />

      {/* 2. Primary Layout Canvas */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden bg-zinc-950">
        {/* 3. System Topbar */}
        <AdminTopbar />

        {/* 4. Domain Content Viewport */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-zinc-900/30 p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>

      {/* 5. Global Command Palette overlay */}
      <CommandPalette />
    </div>
  );
}
