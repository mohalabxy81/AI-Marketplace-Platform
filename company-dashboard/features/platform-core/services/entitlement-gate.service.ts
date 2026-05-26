import { EntitlementResult, TenantContext } from "@/types/contracts/tenant.context";
import { PLATFORM_PRICING_PLANS } from "@/types/super-admin/billing";

export class EntitlementGate {
  /**
   * Evaluates if a tenant has access to a specific feature capability.
   * This operates synchronously by relying on the entitlements array injected into the TenantContext.
   */
  public evaluate(context: TenantContext, featureName: string): EntitlementResult {
    // 1. Check if the feature is explicitly enabled via an override in tenant_entitlements
    if (context.entitlements.includes(featureName)) {
      return { allowed: true };
    }

    // 2. Check if the feature is included in their base plan
    const currentPlan = PLATFORM_PRICING_PLANS.find(p => p.id === context.planTier);
    if (!currentPlan) {
      return { allowed: false, reason: "Invalid plan" };
    }

    // Heuristic: If feature string matches or is included in the features array.
    // In a full implementation, we'd map feature flags to specific plan capability enums.
    const hasFeature = currentPlan.features.some(f => 
      f.toLowerCase().replace(/[^a-z0-9]/g, '_').includes(featureName.toLowerCase())
    );

    if (hasFeature) {
      return { allowed: true };
    }

    // If neither base plan nor explicit entitlement grants access, deny.
    return {
      allowed: false,
      reason: `Feature '${featureName}' is not included in your current plan (${currentPlan.name}).`,
      upgradeHint: this.getUpgradeHint(featureName, currentPlan.id)
    };
  }

  /**
   * Suggests the next tier that includes the requested feature.
   */
  private getUpgradeHint(featureName: string, currentPlanId: string): string | undefined {
    const nextPlan = PLATFORM_PRICING_PLANS.find(p => 
      p.mrr > (PLATFORM_PRICING_PLANS.find(curr => curr.id === currentPlanId)?.mrr || 0) &&
      p.features.some(f => f.toLowerCase().replace(/[^a-z0-9]/g, '_').includes(featureName.toLowerCase()))
    );

    return nextPlan ? nextPlan.id : undefined;
  }
}

export const entitlementGate = new EntitlementGate();
