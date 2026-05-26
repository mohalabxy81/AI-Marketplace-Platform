// features/platform-core/components/admin-nav-config.ts
import { type AdminCapability } from "@/types/super-admin/admin";
import { 
  Terminal, Shield, CreditCard, ShieldAlert, Cpu, 
  BarChart3, LifeBuoy, ToggleLeft, History, Settings 
} from "lucide-react";

export interface AdminNavItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<any>;
  requiredCapability?: AdminCapability;
}

export interface AdminNavSection {
  id: string;
  label?: string;
  items: AdminNavItem[];
}

export const adminSidebarConfig = {
  sections: [
    {
      id: "platform-ops",
      label: "Platform Command",
      items: [
        {
          id: "overview",
          label: "Command Center",
          href: "/super-admin/overview",
          icon: Terminal,
          requiredCapability: "view_analytics_snapshots"
        },
        {
          id: "tenants",
          label: "Tenant Registry",
          href: "/super-admin/tenants",
          icon: Shield,
          requiredCapability: "view_analytics_snapshots"
        }
      ]
    },
    {
      id: "monetization",
      label: "SaaS Operations",
      items: [
        {
          id: "billing",
          label: "Billing Engine",
          href: "/super-admin/billing",
          icon: CreditCard,
          requiredCapability: "override_billing_limits"
        },
        {
          id: "moderation",
          label: "Moderation Queue",
          href: "/super-admin/moderation",
          icon: ShieldAlert,
          requiredCapability: "review_moderation_queue"
        },
        {
          id: "ai-control",
          label: "AI Governance",
          href: "/super-admin/ai-control",
          icon: Cpu,
          requiredCapability: "configure_ml_weights"
        }
      ]
    },
    {
      id: "telemetry",
      label: "Intelligence & Support",
      items: [
        {
          id: "analytics",
          label: "Business BI",
          href: "/super-admin/analytics",
          icon: BarChart3,
          requiredCapability: "view_analytics_snapshots"
        },
        {
          id: "support",
          label: "Operator Support",
          href: "/super-admin/support",
          icon: LifeBuoy,
          requiredCapability: "resolve_support_tickets"
        },
        {
          id: "feature-flags",
          label: "Feature Flags",
          href: "/super-admin/feature-flags",
          icon: ToggleLeft,
          requiredCapability: "manage_feature_flags"
        }
      ]
    },
    {
      id: "governance",
      label: "Platform Security",
      items: [
        {
          id: "audit",
          label: "Audit Ledger",
          href: "/super-admin/audit",
          icon: History,
          requiredCapability: "view_audit_logs"
        },
        {
          id: "settings",
          label: "Global Settings",
          href: "/super-admin/settings",
          icon: Settings,
          requiredCapability: "manage_admin_users"
        }
      ]
    }
  ] as AdminNavSection[]
};
