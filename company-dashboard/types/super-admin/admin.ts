// types/super-admin/admin.ts

export type AdminRole =
  | "SUPER_ADMIN"
  | "PLATFORM_ADMIN"
  | "PLATFORM_SUPPORT"
  | "MODERATOR"
  | "BILLING_ADMIN"
  | "ANALYTICS_ADMIN"
  | "AI_OPERATOR"
  | "TRUST_AND_SAFETY"
  | "READONLY_AUDITOR";

export type AdminCapability =
  | "provision_tenant"          // Create companies, set base keys
  | "suspend_tenant"            // Hard suspends of tenants (disables auth login)
  | "impersonate_user"          // Time-boxed, audited user simulation
  | "configure_stripe"          // Manage Stripe keys, product plans mapping
  | "issue_refunds"             // Process Stripe refunds/credits
  | "override_billing_limits"   // Set custom quotas bypassing core limits
  | "review_moderation_queue"   // View safety and listing queues
  | "act_on_moderation"         // Safe ban, warnings, and deletions of listings
  | "configure_ml_weights"      // Update recommendation search weights
  | "trigger_vector_reindex"    // Trigger full vector database re-indexing
  | "deploy_ai_configs"         // Roll out versioned model hyperparameters
  | "view_audit_logs"           // Inspect platform_audit_logs entries
  | "manage_admin_users"        // Add/remove platform_admins and edit roles
  | "manage_feature_flags"      // Update rollout configurations
  | "resolve_support_tickets"   // Manage customer support issues
  | "view_analytics_snapshots"  // View platform aggregate statistics
  | "view_pii_data"             // Access sensitive user profile parameters
  | "override_fraud_scores";    // Clear risk flags from user logs

export interface PlatformAdmin {
  id: string;
  userId: string;
  role: AdminRole;
  isActive: boolean;
  createdBy?: string;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlatformAuditLog {
  id: string;
  adminId: string;
  action: string;
  targetType: string;
  targetId?: string;
  beforeState?: Record<string, unknown>;
  afterState?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}
