// features/platform-core/components/admin-sidebar.tsx
"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, LogOut, Terminal } from "lucide-react";
import { adminSidebarConfig } from "./admin-nav-config";
import { useAdminAuth } from "../hooks/use-admin-auth";
import { usePlatformUIStore } from "@/store/super-admin/platform-ui.store";
import { signOut } from "@/services/auth/auth.service";
import { cn } from "@/lib/utils";

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { admin, hasCapability } = useAdminAuth();
  const { sidebarCollapsed, toggleSidebar } = usePlatformUIStore();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (e) {
      console.error("Sign out failed", e);
    }
  };

  if (!admin) return null;

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-zinc-800 bg-zinc-950 h-screen transition-all duration-300 ease-in-out sticky top-0 shrink-0",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header — Brand Area */}
      <div className="flex h-16 items-center px-4 border-b border-zinc-800 shrink-0">
        <Link href="/super-admin/overview" className="flex items-center gap-3 outline-none">
          <div className="flex h-8 w-8 items-center justify-center rounded-none border border-amber-500 bg-amber-950/30 text-amber-500 shrink-0">
            <Terminal className="h-4 w-4" />
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col">
              <span className="text-xs font-black tracking-widest text-zinc-100 uppercase">
                Reverso
              </span>
              <span className="text-[9px] uppercase tracking-wider text-amber-500 font-bold">
                Control Plane
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
        <div className="flex flex-col gap-6 px-3">
          {adminSidebarConfig.sections.map((section) => {
            // Capability filter
            const visibleItems = section.items.filter((item) =>
              !item.requiredCapability || hasCapability(item.requiredCapability)
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.id} className="flex flex-col gap-1">
                {section.label && !sidebarCollapsed && (
                  <h4 className="px-3 pb-2 text-[9px] font-bold uppercase tracking-widest text-zinc-500">
                    {section.label}
                  </h4>
                )}
                {sidebarCollapsed && (
                  <div className="my-2 h-px w-full bg-zinc-800" />
                )}
                <div className="flex flex-col gap-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href || pathname.startsWith(item.href + "/");

                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 rounded-none transition-all duration-200 group relative outline-none",
                          isActive
                            ? "bg-zinc-900 border-l border-amber-500 text-amber-500 font-medium"
                            : "text-zinc-400 hover:bg-zinc-900/50 hover:text-zinc-200"
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0 transition-transform group-hover:scale-105", isActive ? "text-amber-500" : "text-zinc-400")} />
                        {!sidebarCollapsed && (
                          <span className="text-xs tracking-wide">{item.label}</span>
                        )}
                        {sidebarCollapsed && (
                          <div className="absolute left-full ml-3 px-2 py-1 bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-200 tracking-wider whitespace-nowrap rounded-none opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                            {item.label}
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer — Operator Identity Area */}
      <div className="border-t border-zinc-800 p-3 shrink-0">
        <div
          className={cn(
            "flex items-center gap-3 rounded-none bg-zinc-900 border border-zinc-800 p-2",
            sidebarCollapsed && "justify-center px-0 bg-transparent border-none"
          )}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-none border border-zinc-700 bg-zinc-800 text-zinc-300 font-mono font-bold text-xs uppercase shrink-0">
            {admin.email?.substring(0, 2) || "OP"}
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-xs font-bold text-zinc-200 truncate">
                {admin.full_name}
              </span>
              <span className="text-[9px] uppercase tracking-wider text-amber-500 font-bold truncate">
                {admin.role.replace("_", " ")}
              </span>
            </div>
          )}
        </div>

        {/* Control Buttons */}
        <div className={cn("flex items-center mt-2", sidebarCollapsed ? "justify-center flex-col gap-2" : "justify-between px-1")}>
          <button
            onClick={toggleSidebar}
            className="flex h-7 w-7 items-center justify-center rounded-none border border-zinc-800 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200 hover:border-zinc-700 transition-colors outline-none cursor-pointer"
            title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
          </button>
          
          <button
            onClick={handleSignOut}
            className="flex h-7 w-7 items-center justify-center rounded-none border border-zinc-800 text-zinc-500 hover:bg-red-950/20 hover:text-red-500 hover:border-red-900/50 transition-colors outline-none cursor-pointer"
            title="Disconnect Cockpit"
          >
            <LogOut className="h-3 w-3" />
          </button>
        </div>
      </div>
    </aside>
  );
}
