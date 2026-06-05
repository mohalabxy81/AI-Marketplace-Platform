/**
 * Revenue Agent Service — AU.2 Revenue Autonomy
 * Coordinates Revenue, Pricing, Subscription, Expansion, and Retention agents.
 */

export type AutonomyLevel =
  | 'AUTONOMOUS_EXECUTION'
  | 'AGENT_APPROVED'
  | 'AI_RECOMMENDED'
  | 'HUMAN_DECISION'
  | 'BOARD_DECISION';

export interface RevenueOpportunity {
  opportunity_id: string;
  type: 'EXPANSION' | 'UPGRADE' | 'RETENTION' | 'PRICING' | 'ANNUAL_CONVERSION';
  tenant_id: string;
  tenant_name: string;
  expected_impact_usd: number;
  confidence: number;
  autonomy_level: AutonomyLevel;
  recommended_action: string;
  agent_source: string;
  detected_at: string;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface RevenueAttribution {
  period: { start: string; end: string };
  total_revenue_influenced_usd: number;
  by_agent: Record<string, number>;
  conversion_rate: number;
  roi_per_agent: Record<string, number>;
}

export interface InterventionPlan {
  plan_id: string;
  created_at: string;
  total_expected_impact_usd: number;
  interventions: Array<{
    opportunity_id: string;
    action: string;
    agent: string;
    timeline: string;
    autonomy_level: AutonomyLevel;
  }>;
}

class RevenueAgentServiceImpl {
  async scanRevenueOpportunities(): Promise<RevenueOpportunity[]> {
    const now = new Date().toISOString();
    return [
      {
        opportunity_id: 'opp_001', type: 'EXPANSION',
        tenant_id: 'ten_acme_corp', tenant_name: 'Acme Corp',
        expected_impact_usd: 28_000, confidence: 0.82,
        autonomy_level: 'AGENT_APPROVED',
        recommended_action: 'Initiate expansion email sequence — 3 upsell signals detected in last 14 days.',
        agent_source: 'Expansion Agent', detected_at: now, urgency: 'HIGH',
      },
      {
        opportunity_id: 'opp_002', type: 'ANNUAL_CONVERSION',
        tenant_id: 'ten_globex', tenant_name: 'Globex Industries',
        expected_impact_usd: 14_400, confidence: 0.76,
        autonomy_level: 'AGENT_APPROVED',
        recommended_action: 'Offer 15% annual discount — tenant on monthly billing for 8 months, usage stable.',
        agent_source: 'Subscription Optimization Agent', detected_at: now, urgency: 'MEDIUM',
      },
      {
        opportunity_id: 'opp_003', type: 'RETENTION',
        tenant_id: 'ten_initech', tenant_name: 'Initech LLC',
        expected_impact_usd: 9_600, confidence: 0.89,
        autonomy_level: 'AGENT_APPROVED',
        recommended_action: 'Trigger save campaign — ChurnRisk: CRITICAL (0.78). Executive sponsor outreach recommended.',
        agent_source: 'Retention Agent', detected_at: now, urgency: 'CRITICAL',
      },
      {
        opportunity_id: 'opp_004', type: 'PRICING',
        tenant_id: 'platform_wide', tenant_name: 'Platform-wide',
        expected_impact_usd: 41_000, confidence: 0.65,
        autonomy_level: 'AI_RECOMMENDED',
        recommended_action: 'Starter plan price adjustment +4.5% — below policy auto-approve threshold of 5%. Recommend CFO review.',
        agent_source: 'Pricing Agent', detected_at: now, urgency: 'LOW',
      },
      {
        opportunity_id: 'opp_005', type: 'UPGRADE',
        tenant_id: 'ten_nakatomi', tenant_name: 'Nakatomi Trading',
        expected_impact_usd: 7_200, confidence: 0.91,
        autonomy_level: 'AGENT_APPROVED',
        recommended_action: 'Upgrade nudge — usage at 91% of plan limit for 3 consecutive weeks.',
        agent_source: 'Subscription Optimization Agent', detected_at: now, urgency: 'HIGH',
      },
    ];
  }

  async getRevenueAttribution(period: { start: string; end: string }): Promise<RevenueAttribution> {
    return {
      period,
      total_revenue_influenced_usd: 62_000,
      by_agent: {
        'Retention Agent': 21_400,
        'Expansion Agent': 18_200,
        'Subscription Optimization Agent': 14_600,
        'Pricing Agent': 5_800,
        'Revenue Agent (coordination)': 2_000,
      },
      conversion_rate: 0.47,
      roi_per_agent: {
        'Retention Agent': 8.9,
        'Expansion Agent': 7.4,
        'Subscription Optimization Agent': 11.2,
        'Pricing Agent': 3.8,
      },
    };
  }

  async coordinateInterventions(): Promise<InterventionPlan> {
    const opportunities = await this.scanRevenueOpportunities();
    const sorted = [...opportunities].sort((a, b) => {
      const urgencyOrder = { CRITICAL: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });

    return {
      plan_id: `iplan_${Date.now()}`,
      created_at: new Date().toISOString(),
      total_expected_impact_usd: sorted.reduce((sum, o) => sum + o.expected_impact_usd, 0),
      interventions: sorted.map((o) => ({
        opportunity_id: o.opportunity_id,
        action: o.recommended_action,
        agent: o.agent_source,
        timeline: o.urgency === 'CRITICAL' ? 'Immediate' : o.urgency === 'HIGH' ? 'Today' : 'This week',
        autonomy_level: o.autonomy_level,
      })),
    };
  }
}

export const RevenueAgentService = new RevenueAgentServiceImpl();
