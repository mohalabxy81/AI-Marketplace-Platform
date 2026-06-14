import type { LucideIcon } from "lucide-react";
import type { Permission } from "@/lib/permissions";

// ── Navigation Types ──────────────────────────────────────────

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  /** If set, user must have this permission to see this item */
  requiredPermission?: Permission;
  badge?: string | number;
}

export interface NavSection {
  id: string;
  label?: string;
  items: NavItem[];
}

export interface SidebarConfig {
  sections: NavSection[];
}
