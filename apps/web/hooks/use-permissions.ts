"use client";

import { useAuthStore } from "@/store/auth.store";
import { hasPermission, canViewNavItem } from "@/lib/permissions";
import type { Permission } from "@/lib/permissions";

export function usePermissions() {
  const { role } = useAuthStore();

  return {
    /**
     * Check if current user has a specific permission.
     */
    can: (permission: Permission): boolean => {
      if (!role) return false;
      return hasPermission(role, permission);
    },

    /**
     * Check if current user can view a nav item.
     */
    canView: (requiredPermission?: Permission): boolean => {
      if (!role) return false;
      return canViewNavItem(role, requiredPermission);
    },

    role,
    isOwner: role === "OWNER",
    isManager: role === "MANAGER",
    isAgent: role === "AGENT",
    isViewer: role === "VIEWER",
  };
}
