"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePermissions } from "@/hooks/use-permissions";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/types/navigation";

export function SidebarNavItem({ item }: { item: NavItem }) {
  const pathname = usePathname();
  const { canView } = usePermissions();
  const { isCollapsed, closeMobile } = useSidebar();

  const isActive = pathname.startsWith(item.href);
  const isVisible = canView(item.requiredPermission);

  if (!isVisible) return null;

  return (
    <Link
      href={item.href}
      onClick={closeMobile}
      className={cn(
        "group flex items-center gap-3 rounded-[var(--radius-xs)] px-3 py-2 text-sm font-medium transition-all duration-[var(--duration-fast)]",
        "outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]",
        isActive
          ? "bg-[var(--color-surface-alt)] text-[var(--color-accent)]"
          : "text-[var(--color-text-subtle)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)]",
        isCollapsed ? "justify-center px-0" : ""
      )}
      title={isCollapsed ? item.label : undefined}
    >
      <item.icon
        className={cn(
          "shrink-0 transition-colors",
          isCollapsed ? "h-5 w-5" : "h-4 w-4",
          isActive ? "text-[var(--color-accent)]" : "text-[var(--color-text-muted)] group-hover:text-[var(--color-text)]"
        )}
      />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
      
      {!isCollapsed && item.badge && (
        <span
          className={cn(
            "ml-auto flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1 text-[10px] font-bold",
            isActive
              ? "bg-[var(--color-accent)] text-black"
              : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
          )}
        >
          {item.badge}
        </span>
      )}
    </Link>
  );
}
