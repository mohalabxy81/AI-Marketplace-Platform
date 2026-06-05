/**
 * Retention Agent Service — AU.2 Revenue Autonomy
 * Predicts and prevents churn through health scoring and save campaigns.
 */

export type RiskTier = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ChurnRiskScore {
  tenant_id: string;
  tenant_name: string;
  churn_risk: number;           // 0.0–1.0
  risk_tier: RiskTier;
  leading_indicators: LeadingIndicator[];
  recommended_action: string;
  intervention_urgency: 'MONITOR' | 'ENGAGE' | 'ESCALATE' | 'EMERGENCY';
  estimated_arr_at_risk: number;
}

export interface LeadingIndicator {
  signal: string;
  value: number | string | boolean;
  weight: number;
  contribution_to_risk: number;
  trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
}

export interface RetentionMetrics {
  period: string;
  gross_churn_rate: number;
  net_churn_rate: number;
  saved_accounts: number;
  save_rate: number;
  revenue_saved_usd: number;
  campaigns_triggered: number;
  avg_intervention_latency_minutes: number;
  agent_attribution_pct: number;
}

export interface CampaignResult {
  campaign_id: string;
  tenant_id: string;
  triggered_at: string;
  autonomy_level: string;
  sequence_type: string;
  status: 'TRIGGERED' | 'IN_PROGRESS' | 'CONVERTED' | 'LOST';
}

/** Simulate churn risk computation (production uses ML model) */
function computeChurnRisk(signals: Record<string, number>): number {
  const {
    days_since_login = 0,
    support_tickets = 0,
    usage_decline_30d = 0,
    payment_failures = 0,
    feature_adoption = 0.5,
    expansion_events = 0,
  } = signals;

  // Logistic regression coefficients (trained on historical data)
  const z =
    -3.5 +
    0.04 * days_since_login +
    0.15 * support_tickets +
    0.25 * usage_decline_30d +
    0.35 * payment_failures +
    -1.8 * feature_adoption +
    -0.2 * expansion_events;

  return 1 / (1 + Math.exp(-z));
}

const MOCK_TENANTS = [
  {
    id: 'ten_initech', name: 'Initech LLC',
    signals: { days_since_login: 18, support_tickets: 4, usage_decline_30d: 0.45, payment_failures: 1, feature_adoption: 0.15, expansion_events: 0 },
    arr: 14_400,
  },
  {
    id: 'ten_umbrella', name: 'Umbrella Corp',
    signals: { days_since_login: 7, support_tickets: 1, usage_decline_30d: 0.12, payment_failures: 0, feature_adoption: 0.38, expansion_events: 1 },
    arr: 28_800,
  },
  {
    id: 'ten_soylent', name: 'Soylent AI',
    signals: { days_since_login: 2, support_tickets: 0, usage_decline_30d: 0, payment_failures: 0, feature_adoption: 0.78, expansion_events: 3 },
    arr: 19_200,
  },
  {
    id: 'ten_tyrell', name: 'Tyrell Corp',
    signals: { days_since_login: 34, support_tickets: 7, usage_decline_30d: 0.62, payment_failures: 2, feature_adoption: 0.08, expansion_events: 0 },
    arr: 9_600,
  },
];

class RetentionAgentServiceImpl {
  async computeChurnRisk(tenant_id: string): Promise<ChurnRiskScore> {
    const tenant = MOCK_TENANTS.find((t) => t.id === tenant_id) ?? MOCK_TENANTS[0];
    const riskScore = computeChurnRisk(tenant.signals);
    const tier = riskScore >= 0.75 ? 'CRITICAL' : riskScore >= 0.50 ? 'HIGH' : riskScore >= 0.20 ? 'MEDIUM' : 'LOW';

    const indicators: LeadingIndicator[] = [
      {
        signal: 'Days since last login',
        value: tenant.signals.days_since_login,
        weight: 0.25,
        contribution_to_risk: 0.04 * tenant.signals.days_since_login,
        trend: tenant.signals.days_since_login > 14 ? 'DETERIORATING' : 'STABLE',
      },
      {
        signal: 'Usage decline (30d)',
        value: `${(tenant.signals.usage_decline_30d * 100).toFixed(0)}%`,
        weight: 0.25,
        contribution_to_risk: 0.25 * tenant.signals.usage_decline_30d,
        trend: tenant.signals.usage_decline_30d > 0.2 ? 'DETERIORATING' : 'STABLE',
      },
      {
        signal: 'Feature adoption score',
        value: tenant.signals.feature_adoption,
        weight: 0.20,
        contribution_to_risk: -1.8 * tenant.signals.feature_adoption,
        trend: tenant.signals.feature_adoption < 0.3 ? 'DETERIORATING' : 'IMPROVING',
      },
    ];

    const actionMap: Record<RiskTier, string> = {
      CRITICAL: 'Emergency save: VP Customer Success outreach + executive sponsor email + 30-day extension offer',
      HIGH: 'Personal outreach sequence + free consultation + account health review',
      MEDIUM: 'Automated health check email + in-app tooltip guidance',
      LOW: 'Monitor — no intervention required',
    };

    return {
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      churn_risk: Math.round(riskScore * 1000) / 1000,
      risk_tier: tier,
      leading_indicators: indicators,
      recommended_action: actionMap[tier],
      intervention_urgency: tier === 'CRITICAL' ? 'EMERGENCY' : tier === 'HIGH' ? 'ESCALATE' : tier === 'MEDIUM' ? 'ENGAGE' : 'MONITOR',
      estimated_arr_at_risk: tenant.arr,
    };
  }

  async getAllChurnRisks(): Promise<ChurnRiskScore[]> {
    return Promise.all(MOCK_TENANTS.map((t) => this.computeChurnRisk(t.id)));
  }

  async triggerSaveCampaign(tenant_id: string, risk_tier: RiskTier): Promise<CampaignResult> {
    const sequences: Record<RiskTier, string> = {
      CRITICAL: 'emergency_executive_save',
      HIGH: 'personal_cso_outreach',
      MEDIUM: 'automated_health_check',
      LOW: 'passive_monitoring',
    };
    return {
      campaign_id: `camp_${Date.now()}`,
      tenant_id,
      triggered_at: new Date().toISOString(),
      autonomy_level: risk_tier === 'MEDIUM' ? 'AGENT_APPROVED' : 'AI_RECOMMENDED',
      sequence_type: sequences[risk_tier],
      status: 'TRIGGERED',
    };
  }

  async getRetentionMetrics(): Promise<RetentionMetrics> {
    return {
      period: '2026-05',
      gross_churn_rate: 0.023,
      net_churn_rate: 0.016,
      saved_accounts: 8,
      save_rate: 0.34,
      revenue_saved_usd: 21_400,
      campaigns_triggered: 23,
      avg_intervention_latency_minutes: 4.2,
      agent_attribution_pct: 0.72,
    };
  }
}

export const RetentionAgentService = new RetentionAgentServiceImpl();
