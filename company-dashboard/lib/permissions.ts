import type { UserRole } from "@/types/database";

// ── Permission Definitions ────────────────────────────────────

export type Permission =
  | "view_overview"
  | "view_listings"
  | "manage_listings"
  | "publish_listings"
  | "view_team"
  | "manage_team"
  | "view_analytics"
  | "view_notifications"
  | "view_activity"
  | "view_messages"
  | "manage_messages"
  | "view_ui_customization"
  | "manage_ui_customization"
  | "view_settings"
  | "manage_settings";

// ── Role → Permission Map ─────────────────────────────────────

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    "view_overview",
    "view_listings",
    "manage_listings",
    "publish_listings",
    "view_team",
    "manage_team",
    "view_analytics",
    "view_notifications",
    "view_activity",
    "view_messages",
    "manage_messages",
    "view_ui_customization",
    "manage_ui_customization",
    "view_settings",
    "manage_settings",
  ],
  MANAGER: [
    "view_overview",
    "view_listings",
    "manage_listings",
    "publish_listings",
    "view_team",
    "view_analytics",
    "view_notifications",
    "view_activity",
    "view_messages",
    "manage_messages",
    "view_ui_customization",
    "manage_ui_customization",
    "view_settings",
  ],
  AGENT: [
    "view_overview",
    "view_listings",
    "manage_listings",
    "view_analytics",
    "view_notifications",
    "view_activity",
    "view_messages",
    "manage_messages",
  ],
  VIEWER: [
    "view_overview",
    "view_listings",
    "view_analytics",
    "view_notifications",
    "view_activity",
    "view_messages",
  ],
};

// ── Helpers ───────────────────────────────────────────────────

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role can view a nav item, given its optional required permission.
 */
export function canViewNavItem(
  role: UserRole,
  requiredPermission?: Permission
): boolean {
  if (!requiredPermission) return true;
  return hasPermission(role, requiredPermission);
}

/**
 * Get the display label for a role.
 */
export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    OWNER: "Owner",
    MANAGER: "Manager",
    AGENT: "Agent",
    VIEWER: "Viewer",
  };
  return labels[role];
}

/**
 * Get badge variant for a role.
 */
export function getRoleBadgeVariant(
  role: UserRole
): "accent" | "success" | "info" | "muted" {
  const map: Record<UserRole, "accent" | "success" | "info" | "muted"> = {
    OWNER: "accent",
    MANAGER: "success",
    AGENT: "info",
    VIEWER: "muted",
  };
  return map[role];
}
