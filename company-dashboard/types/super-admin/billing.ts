// types/super-admin/billing.ts

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired";

export type InvoiceStatus =
  | "draft"
  | "open"
  | "paid"
  | "uncollectible"
  | "void";

export interface TenantSubscription {
  id: string;
  company_id: string;
  stripe_subscription_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  price_id: string;
  quantity: number;
  cancel_at_period_end: boolean;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface TenantInvoice {
  id: string;
  company_id: string;
  stripe_invoice_id: string;
  subscription_id: string | null;
  amount_due: number; // in cents
  amount_paid: number; // in cents
  currency: string;
  status: InvoiceStatus;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface BillingEvent {
  id: string;
  company_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface UsageTracking {
  id: string;
  company_id: string;
  resource_name: string;
  quantity_used: number;
  tracked_at: string;
}

export interface QuotaUsage {
  id: string;
  company_id: string;
  resource_name: string;
  limit_amount: number;
  current_usage: number;
  reset_at: string;
  updated_at: string;
}

export interface TenantEntitlement {
  id: string;
  company_id: string;
  feature_name: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PricingPlan {
  id: string;
  name: string;
  description: string;
  mrr: number; // in USD
  quota_listings: number;
  quota_team_members: number;
  quota_api_calls: number;
  features: string[];
}

export const PLATFORM_PRICING_PLANS: PricingPlan[] = [
  {
    id: "plan_free",
    name: "Free Sandbox",
    description: "Ideal for testing and evaluation",
    mrr: 0,
    quota_listings: 10,
    quota_team_members: 1,
    quota_api_calls: 1000,
    features: ["Basic Analytics", "Community Support", "Standard Search"]
  },
  {
    id: "plan_growth",
    name: "Growth",
    description: "For small teams and growing marketplaces",
    mrr: 99,
    quota_listings: 100,
    quota_team_members: 5,
    quota_api_calls: 50000,
    features: ["Advanced Analytics", "Email Support", "Semantic AI Search", "Custom Branding"]
  },
  {
    id: "plan_scale",
    name: "Scale",
    description: "For high-volume transaction marketplaces",
    mrr: 299,
    quota_listings: 1000,
    quota_team_members: 20,
    quota_api_calls: 500000,
    features: ["Realtime Dashboards", "Priority 24/7 Support", "Multi-model Search", "Audit Ledger Log", "A/B Testing Gate"]
  },
  {
    id: "plan_enterprise",
    name: "Enterprise",
    description: "For custom scale and regulatory requirements",
    mrr: 999,
    quota_listings: 999999, // unlimited
    quota_team_members: 999, // unlimited
    quota_api_calls: 99999999, // unlimited
    features: ["Dedicated Support Engineer", "SLA Agreements", "On-demand Reindexing", "Custom ML Weight Configuration", "Custom SSO & RBAC"]
  }
];
