// types/super-admin/analytics.ts

export interface AnalyticsSnapshot {
  id: string;
  total_mrr: number;
  total_tenants: number;
  active_tenants: number;
  open_tickets: number;
  moderation_queue_depth: number;
  snapshot_date: string; // YYYY-MM-DD
  created_at: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FeatureRollout {
  id: string;
  flag_id: string;
  rollout_percentage: number;
  target_rules: {
    plan_tiers?: string[];
    company_ids?: string[];
    user_emails?: string[];
  };
  created_at: string;
  updated_at: string;
}

export interface PlatformMetrics {
  mrrGrowthRate: number;
  averageInferenceLatency: number;
  activeListingCount: number;
  abuseReportsCount: number;
}
