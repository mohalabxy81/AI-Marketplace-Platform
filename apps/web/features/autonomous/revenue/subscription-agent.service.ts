/**
 * AU.2 — Subscription Agent Service
 * Health scoring, downgrade prevention, annual conversion automation
 */

export interface SubscriptionHealthRecord {
  tenant_id: string;
  company_name: string;
  plan: string;
  mrr: number;
  health_score: number;  // 0–100
  risk_tier: 'GREEN' | 'YELLOW' | 'RED';
  days_since_last_login: number;
  feature_adoption_rate: number;
  support_tickets_30d: number;
  expansion_potential: number;
  churn_probability: number;
  recommended_action: string;
  autonomy_level: 'AUTONOMOUS_EXECUTION' | 'AGENT_APPROVED' | 'AI_RECOMMENDED' | 'HUMAN_DECISION';
}

export interface SubscriptionOverview {
  total_tenants: number;
  green: number;
  yellow: number;
  red: number;
  avg_health_score: number;
  upgrade_candidates: number;
  downgrade_risks: number;
  annual_conversion_ready: number;
  mrr_at_risk: number;
  expansion_pipeline_mrr: number;
}

export const SubscriptionAgentService = {
  async getSubscriptionOverview(): Promise<SubscriptionOverview> {
    return {
      total_tenants: 342,
      green: 280,
      yellow: 48,
      red: 14,
      avg_health_score: 72,
      upgrade_candidates: 23,
      downgrade_risks: 8,
      annual_conversion_ready: 15,
      mrr_at_risk: 8_400,
      expansion_pipeline_mrr: 42_600,
    };
  },

  async getAtRiskSubscriptions(): Promise<SubscriptionHealthRecord[]> {
    return [
      {
        tenant_id: 'ten_delta', company_name: 'Delta Corp', plan: 'Growth', mrr: 199,
        health_score: 24, risk_tier: 'RED', days_since_last_login: 21,
        feature_adoption_rate: 0.18, support_tickets_30d: 4, expansion_potential: 0.1,
        churn_probability: 0.78,
        recommended_action: 'Trigger urgent save campaign: executive outreach + 30-day extension offer',
        autonomy_level: 'AGENT_APPROVED',
      },
      {
        tenant_id: 'ten_sigma', company_name: 'Sigma Labs', plan: 'Starter', mrr: 79,
        health_score: 41, risk_tier: 'RED', days_since_last_login: 14,
        feature_adoption_rate: 0.31, support_tickets_30d: 2, expansion_potential: 0.2,
        churn_probability: 0.62,
        recommended_action: 'Send onboarding re-engagement sequence + offer success call',
        autonomy_level: 'AUTONOMOUS_EXECUTION',
      },
    ];
  },

  async getAnnualConversionCandidates(): Promise<SubscriptionHealthRecord[]> {
    return [
      {
        tenant_id: 'ten_nakatomi', company_name: 'Nakatomi Trading', plan: 'Starter', mrr: 79,
        health_score: 91, risk_tier: 'GREEN', days_since_last_login: 1,
        feature_adoption_rate: 0.94, support_tickets_30d: 0, expansion_potential: 0.88,
        churn_probability: 0.04,
        recommended_action: 'Annual conversion: save 2 months. Project $948 ARR uplift with 16% discount.',
        autonomy_level: 'AGENT_APPROVED',
      },
      {
        tenant_id: 'ten_waystar', company_name: 'Waystar Royco', plan: 'Growth', mrr: 199,
        health_score: 88, risk_tier: 'GREEN', days_since_last_login: 2,
        feature_adoption_rate: 0.89, support_tickets_30d: 1, expansion_potential: 0.92,
        churn_probability: 0.03,
        recommended_action: 'Annual + upgrade to Enterprise. Project $2,388 ARR uplift.',
        autonomy_level: 'AGENT_APPROVED',
      },
    ];
  },

  async triggerSaveCampaign(tenant_id: string): Promise<{ success: boolean; campaign_id: string; channel: string }> {
    return {
      success: true,
      campaign_id: `save_${tenant_id}_${Date.now()}`,
      channel: 'in_app + email',
    };
  },

  async triggerAnnualConversionOffer(tenant_id: string): Promise<{ success: boolean; offer_url: string; discount_pct: number }> {
    return {
      success: true,
      offer_url: `/billing/annual-offer/${tenant_id}`,
      discount_pct: 16,
    };
  },
};
