"use client";

import * as React from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileSidebar } from "@/components/layout/mobile-sidebar";
import { TopHeader } from "@/components/layout/top-header";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isLoading, isAuthenticated } = useAuth();

  // Show a full-page loading state while auth is hydrating
  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--color-bg)]">
        <Skeleton className="h-12 w-12 rounded-full" />
      </div>
    );
  }

  // Middleware handles the actual redirect, but we prevent render flash
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <Sidebar />
      <MobileSidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopHeader />
        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}
