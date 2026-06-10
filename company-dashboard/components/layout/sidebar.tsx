"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft, ChevronRight, LogOut, Hexagon } from "lucide-react";
import { sidebarConfig } from "@/features/navigation";
import { SidebarNavItem } from "./sidebar-nav-item";
import { useSidebar } from "@/hooks/use-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { cn, truncate } from "@/lib/utils";
import { getRoleLabel, hasPermission } from "@/lib/permissions";
import { Avatar } from "@/components/ui/avatar";
import { signOut } from "@/services/auth/auth.service";
import { useRouter } from "next/navigation";

export function Sidebar() {
  const { isCollapsed, toggleCollapsed } = useSidebar();
  const { user, company } = useAuth();
  const { role } = usePermissions();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push("/login");
    } catch (e) {
      console.error("Sign out failed", e);
    }
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] h-screen transition-all duration-[var(--duration-mid)] var(--ease-smooth) sticky top-0",
        isCollapsed ? "w-[var(--sidebar-collapsed)]" : "w-[var(--sidebar-width)]"
      )}
    >
      {/* Header — Company Area */}
      <div className="flex h-[var(--header-height)] items-center px-4 border-b border-[var(--color-border)] shrink-0">
        <Link href="/overview" className="flex items-center gap-3 outline-none">
          <div className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-xs)] bg-[var(--color-accent)] text-black shrink-0">
            {company?.logo ? (
              <Image src={company.logo} alt={company.name} width={32} height={32} className="h-full w-full object-cover rounded-[var(--radius-xs)]" />
            ) : (
              <Hexagon className="h-5 w-5 fill-current" />
            )}
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight tracking-tight text-[var(--color-text)] truncate max-w-[150px]">
                {company?.name || "Workspace"}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[var(--color-text-subtle)] font-medium">
                Dashboard
              </span>
            </div>
          )}
        </Link>
      </div>

      {/* Nav Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden py-4 custom-scrollbar">
        <div className="flex flex-col gap-6 px-3">
          {sidebarConfig.sections.map((section, idx) => {
            // Check if section has any visible items for this user
            const hasVisibleItems = section.items.some((item) =>
              !item.requiredPermission || (role && hasPermission(role, item.requiredPermission))
            );
            if (!hasVisibleItems) return null;

            return (
              <div key={section.id} className="flex flex-col gap-1">
                {section.label && !isCollapsed && (
                  <h4 className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
                    {section.label}
                  </h4>
                )}
                {isCollapsed && idx > 0 && (
                  <div className="my-2 h-px w-full bg-[var(--color-border)] opacity-50" />
                )}
                <div className="flex flex-col gap-0.5">
                  {section.items.map((item) => (
                    <SidebarNavItem key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer — User Area */}
      <div className="border-t border-[var(--color-border)] p-3 shrink-0">
        <div
          className={cn(
            "flex items-center gap-3 rounded-[var(--radius-xs)] bg-[var(--color-surface-alt)] p-2 transition-all",
            isCollapsed && "justify-center px-0 bg-transparent"
          )}
        >
          <Avatar
            name={user?.full_name || user?.email}
            size={isCollapsed ? "sm" : "md"}
            className="shrink-0"
          />
          {!isCollapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-[var(--color-text)] truncate">
                {user?.full_name || truncate(user?.email || "", 20)}
              </span>
              <span className="text-xs text-[var(--color-accent)] font-medium truncate">
                {role ? getRoleLabel(role) : "User"}
              </span>
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className={cn("flex items-center mt-2", isCollapsed ? "justify-center flex-col gap-2" : "justify-between px-1")}>
          <button
            onClick={toggleCollapsed}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition-colors outline-none"
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
          
          <button
            onClick={handleSignOut}
            className="flex h-7 w-7 items-center justify-center rounded-[var(--radius-xs)] text-[var(--color-text-muted)] hover:bg-red-950 hover:text-red-400 transition-colors outline-none"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
