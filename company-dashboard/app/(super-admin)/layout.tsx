import React from "react";
import Link from "next/link";
import { LayoutDashboard, Users, CreditCard, BrainCircuit, ShieldAlert, LineChart, Settings } from "lucide-react";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-neutral-950 text-white">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 border-r border-neutral-800 bg-neutral-900">
        <div className="flex h-16 items-center px-6 border-b border-neutral-800">
          <h1 className="text-lg font-bold tracking-tight text-white">Reverso Platform</h1>
        </div>
        <nav className="p-4 space-y-1">
          <Link href="/super-admin/dashboard" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link href="/super-admin/tenants" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors">
            <Users className="h-4 w-4" />
            Tenants
          </Link>
          <Link href="/super-admin/billing" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors">
            <CreditCard className="h-4 w-4" />
            Billing & Quotas
          </Link>
          <Link href="/super-admin/ai-control" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors">
            <BrainCircuit className="h-4 w-4" />
            AI Orchestration
          </Link>
          <Link href="/super-admin/moderation" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors">
            <ShieldAlert className="h-4 w-4" />
            Moderation & Trust
          </Link>
          <Link href="/super-admin/analytics" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors">
            <LineChart className="h-4 w-4" />
            Analytics
          </Link>
        </nav>
        <div className="absolute bottom-0 w-64 border-t border-neutral-800 p-4">
          <Link href="/super-admin/settings" className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex h-16 shrink-0 items-center gap-x-4 border-b border-neutral-800 bg-neutral-900 px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 ml-auto">
              {/* Profile dropdown stub */}
              <div className="h-8 w-8 rounded-full bg-neutral-800 border border-neutral-700" />
            </div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
