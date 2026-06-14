// lib/supabase/admin-permissions.ts
import { type AdminRole, type AdminCapability } from "@/types/super-admin/admin";

export const ADMIN_ROLE_CAPABILITIES: Record<AdminRole, AdminCapability[]> = {
  SUPER_ADMIN: [
    "provision_tenant",
    "suspend_tenant",
    "impersonate_user",
    "configure_stripe",
    "issue_refunds",
    "override_billing_limits",
    "review_moderation_queue",
    "act_on_moderation",
    "configure_ml_weights",
    "trigger_vector_reindex",
    "deploy_ai_configs",
    "view_audit_logs",
    "manage_admin_users",
    "manage_feature_flags",
    "resolve_support_tickets",
    "view_analytics_snapshots",
    "view_pii_data",
    "override_fraud_scores"
  ],
  PLATFORM_ADMIN: [
    "provision_tenant",
    "suspend_tenant",
    "view_audit_logs",
    "manage_feature_flags",
    "view_analytics_snapshots"
  ],
  PLATFORM_SUPPORT: [
    "resolve_support_tickets",
    "impersonate_user",
    "view_analytics_snapshots"
  ],
  MODERATOR: [
    "review_moderation_queue",
    "act_on_moderation"
  ],
  BILLING_ADMIN: [
    "configure_stripe",
    "issue_refunds",
    "override_billing_limits",
    "view_analytics_snapshots"
  ],
  ANALYTICS_ADMIN: [
    "view_analytics_snapshots",
    "view_audit_logs"
  ],
  AI_OPERATOR: [
    "configure_ml_weights",
    "trigger_vector_reindex",
    "deploy_ai_configs",
    "view_analytics_snapshots"
  ],
  TRUST_AND_SAFETY: [
    "review_moderation_queue",
    "act_on_moderation",
    "override_fraud_scores",
    "suspend_tenant"
  ],
  READONLY_AUDITOR: [
    "view_audit_logs",
    "view_analytics_snapshots"
  ]
};

/**
 * Validates if a role has the specified capability.
 */
export function hasAdminCapability(role: AdminRole, capability: AdminCapability): boolean {
  return ADMIN_ROLE_CAPABILITIES[role]?.includes(capability) ?? false;
}

/**
 * Map path prefixes under /super-admin to their required operational capability gates
 */
export const ADMIN_ROUTE_CAPABILITIES: Record<string, AdminCapability> = {
  "/super-admin/overview": "view_analytics_snapshots",
  "/super-admin/tenants": "view_analytics_snapshots",
  "/super-admin/tenants/new": "provision_tenant",
  "/super-admin/billing": "override_billing_limits",
  "/super-admin/moderation": "review_moderation_queue",
  "/super-admin/ai-control": "configure_ml_weights",
  "/super-admin/support": "resolve_support_tickets",
  "/super-admin/feature-flags": "manage_feature_flags",
  "/super-admin/audit": "view_audit_logs",
  "/super-admin/settings": "manage_admin_users"
};

/**
 * Resolves path requirements based on prefix matching
 */
export function getRequiredCapabilityForRoute(pathname: string): AdminCapability | null {
  for (const [route, capability] of Object.entries(ADMIN_ROUTE_CAPABILITIES)) {
    if (pathname === route || pathname.startsWith(route + "/")) {
      return capability;
    }
  }
  return null;
}
