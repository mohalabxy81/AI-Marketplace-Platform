"use client";

import * as React from "react";
import { ThemeControls } from "./theme-controls";
import { useCompanyTheme } from "../hooks/use-company-theme";
import { BarChart3, LayoutDashboard, Users, Heart } from "lucide-react";
import { Hexagon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";

export function CustomizationShell() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8 h-full">
      {/* Controls Column */}
      <div className="flex flex-col h-full overflow-y-auto custom-scrollbar pr-2">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight mb-2">UI Customization</h2>
          <p className="text-muted-foreground">
            Personalize your dashboard&apos;s appearance. Changes apply globally for all team members.
          </p>
        </div>
        
        <div className="bg-card rounded-xl border p-6 flex-1">
          <ThemeControls />
        </div>
      </div>

      {/* Live Preview Column */}
      <div className="hidden lg:flex flex-col bg-muted/30 rounded-2xl border p-6 overflow-hidden relative">
        <div className="absolute inset-0 bg-grid-black/[0.02] -z-10" />
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            Live Preview
          </div>
          <p className="text-xs text-muted-foreground">This is how your team sees the dashboard</p>
        </div>

        {/* The Mock Dashboard */}
        <div className="flex-1 rounded-xl border bg-[var(--color-bg)] overflow-hidden flex shadow-sm pointer-events-none transition-all duration-300">
          <PreviewSidebar />
          <div className="flex-1 flex flex-col overflow-hidden">
            <PreviewHeader />
            <PreviewContent />
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Mock Components for the Live Preview
// They use CSS variables injected by ThemeProvider to reflect real-time changes
// ----------------------------------------------------------------------

function PreviewSidebar() {
  const { settings } = useCompanyTheme();
  const { company } = useAuth();
  
  const layoutConfig = settings?.layout_config;

  const isTransparent = layoutConfig?.sidebar_style === "transparent";

  return (
    <div className={`w-48 border-r border-[var(--color-border)] flex flex-col transition-all duration-300
      ${isTransparent ? "bg-transparent" : "bg-[var(--color-surface)]"}
    `}>
      <div className="h-14 border-b border-[var(--color-border)] flex items-center px-4 shrink-0">
        <div className="h-6 w-6 rounded-[var(--radius-xs)] bg-[var(--color-accent)] flex items-center justify-center shrink-0">
          {company?.logo ? (
            <Image src={company.logo} alt="Logo" width={24} height={24} className="w-full h-full object-cover rounded-[var(--radius-xs)]" />
          ) : (
            <Hexagon className="h-3 w-3 text-black" />
          )}
        </div>
        <span className="ml-2 text-xs font-bold text-[var(--color-text)] truncate">
          {company?.name || "Company"}
        </span>
      </div>
      <div className="flex-1 py-4 px-2 flex flex-col gap-1">
        <div className="px-2 py-1.5 flex items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--color-surface-alt)] text-[var(--color-text)]">
          <LayoutDashboard className="h-4 w-4" />
          <span className="text-xs font-medium">Overview</span>
        </div>
        <div className="px-2 py-1.5 flex items-center gap-2 rounded-[var(--radius-sm)] text-[var(--color-text-muted)]">
          <BarChart3 className="h-4 w-4" />
          <span className="text-xs font-medium">Analytics</span>
        </div>
        <div className="px-2 py-1.5 flex items-center gap-2 rounded-[var(--radius-sm)] text-[var(--color-text-muted)]">
          <Users className="h-4 w-4" />
          <span className="text-xs font-medium">Team</span>
        </div>
      </div>
    </div>
  );
}

function PreviewHeader() {
  return (
    <div className="h-14 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center px-4 shrink-0 justify-between transition-colors duration-300">
      <div className="h-5 w-32 bg-[var(--color-surface-alt)] rounded" />
      <div className="flex gap-2 items-center">
        <div className="h-6 w-6 rounded-full bg-[var(--color-surface-alt)]" />
        <div className="h-6 w-6 rounded-full bg-[var(--color-surface-alt)]" />
      </div>
    </div>
  );
}

function PreviewContent() {
  const { settings } = useCompanyTheme();
  const layoutConfig = settings?.layout_config;
  
  const gap = layoutConfig?.layout_density === "compact" ? "gap-4" : layoutConfig?.layout_density === "spacious" ? "gap-8" : "gap-6";
  const padding = layoutConfig?.layout_density === "compact" ? "p-4" : layoutConfig?.layout_density === "spacious" ? "p-8" : "p-6";

  return (
    <div className={`flex-1 overflow-y-auto ${padding} transition-all duration-300`}>
      <div className={`grid grid-cols-3 ${gap} mb-6`}>
        <div className="h-24 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col justify-between transition-all duration-300 shadow-sm">
           <div className="h-4 w-16 bg-[var(--color-surface-alt)] rounded" />
           <div className="h-6 w-12 bg-[var(--color-text)] rounded" />
        </div>
        <div className="h-24 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col justify-between transition-all duration-300 shadow-sm">
           <div className="h-4 w-20 bg-[var(--color-surface-alt)] rounded" />
           <div className="h-6 w-16 bg-[var(--color-text)] rounded" />
        </div>
        <div className="h-24 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-accent)] p-4 flex flex-col justify-between transition-all duration-300 shadow-sm relative overflow-hidden group">
           <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity" />
           <div className="h-4 w-24 bg-black/20 rounded z-10" />
           <div className="flex items-center justify-between z-10">
             <div className="h-6 w-14 bg-black/80 rounded" />
             <Heart className="h-5 w-5 text-black" />
           </div>
        </div>
      </div>

      <div className="h-64 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all duration-300 shadow-sm">
        <div className="h-5 w-32 bg-[var(--color-surface-alt)] rounded mb-4" />
        <div className="flex gap-4 h-48 items-end">
          <div className="flex-1 bg-[var(--color-accent)]/20 rounded-t-[var(--radius-sm)] h-[40%]" />
          <div className="flex-1 bg-[var(--color-accent)]/40 rounded-t-[var(--radius-sm)] h-[60%]" />
          <div className="flex-1 bg-[var(--color-accent)]/60 rounded-t-[var(--radius-sm)] h-[80%]" />
          <div className="flex-1 bg-[var(--color-accent)] rounded-t-[var(--radius-sm)] h-[100%]" />
          <div className="flex-1 bg-[var(--color-accent)]/80 rounded-t-[var(--radius-sm)] h-[70%]" />
        </div>
      </div>
    </div>
  );
}
