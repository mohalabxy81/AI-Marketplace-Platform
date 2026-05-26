export interface TenantContext {
  tenantId: string;
  userId: string;
  userRole: "OWNER" | "MANAGER" | "AGENT" | "VIEWER";
  planTier: string;      // e.g., 'plan_free', 'plan_growth', 'plan_scale', 'plan_enterprise'
  entitlements: string[]; // List of active feature entitlements for the tenant
}

export interface EntitlementResult {
  allowed: boolean;
  reason?: string;
  upgradeHint?: string;
}
