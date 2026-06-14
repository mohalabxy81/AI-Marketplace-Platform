import {
  LayoutDashboard,
  ListTodo,
  Users,
  BarChart3,
  Bell,
  MessageSquare,
  Palette,
  Settings,
  Activity,
  CreditCard,
} from "lucide-react";
import type { SidebarConfig } from "@/types/navigation";

export const sidebarConfig: SidebarConfig = {
  sections: [
    {
      id: "main",
      label: "Main",
      items: [
        {
          id: "overview",
          label: "Overview",
          href: "/overview",
          icon: LayoutDashboard,
          requiredPermission: "view_overview",
        },
        {
          id: "listings",
          label: "Listings",
          href: "/listings",
          icon: ListTodo,
          requiredPermission: "view_listings",
        },
        {
          id: "team",
          label: "Team",
          href: "/team",
          icon: Users,
          requiredPermission: "view_team",
        },
        {
          id: "analytics",
          label: "Analytics",
          href: "/analytics",
          icon: BarChart3,
          requiredPermission: "view_analytics",
        },
      ],
    },
    {
      id: "analytics",
      label: "Analytics & Insights",
      items: [
        {
          id: "analytics-overview",
          label: "Overview",
          href: "/analytics",
          icon: BarChart3,
          requiredPermission: "view_analytics",
        },
        {
          id: "analytics-listings",
          label: "Listing Performance",
          href: "/analytics/listings",
          icon: ListTodo,
          requiredPermission: "view_analytics",
        },
        {
          id: "analytics-behavior",
          label: "User Behavior",
          href: "/analytics/behavior",
          icon: Users,
          requiredPermission: "view_analytics",
        },
      ],
    },
    {
      id: "communication",
      label: "Communication",
      items: [
        {
          id: "notifications",
          label: "Notifications",
          href: "/notifications",
          icon: Bell,
          requiredPermission: "view_notifications",
        },
        {
          id: "activity",
          label: "Activity Feed",
          href: "/activity",
          icon: Activity,
          requiredPermission: "view_activity",
        },
        {
          id: "messages",
          label: "Messages",
          href: "/messages",
          icon: MessageSquare,
          requiredPermission: "view_messages",
        },
      ],
    },
    {
      id: "customization",
      label: "Customization",
      items: [
        {
          id: "ui_customization",
          label: "UI Customization",
          href: "/ui-customization",
          icon: Palette,
          requiredPermission: "view_ui_customization",
        },
        {
          id: "billing",
          label: "Billing",
          href: "/billing",
          icon: CreditCard,
          requiredPermission: "view_settings",
        },
        {
          id: "settings",
          label: "Settings",
          href: "/settings",
          icon: Settings,
          requiredPermission: "view_settings",
        },
      ],
    },
  ],
};
