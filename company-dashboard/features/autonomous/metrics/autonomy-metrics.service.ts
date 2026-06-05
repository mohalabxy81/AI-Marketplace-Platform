/**
 * Autonomy Metrics Service — AU.9 Autonomous Metrics
 * Tracks and computes the 8 core Autonomous Enterprise KPIs.
 */

export interface AutonomyMetricsSnapshot {
  snapshot_at: string;
  // Core Autonomy Metrics
  autonomy_score: AutonomyMetric;
  agent_utilization: AutonomyMetric;
  automation_rate: AutonomyMetric;
  revenue_impact: AutonomyMetric;
  cost_savings: AutonomyMetric;
  resolution_rate: AutonomyMetric;
  trust_score: AutonomyMetric;
  risk_score: AutonomyMetric;
  // Derived
  autonomous_enterprise_index: number;  // composite 0–100 score
  maturity_level: 'LEVEL_1_ASSISTED' | 'LEVEL_2_AUGMENTED' | 'LEVEL_3_AUTOMATED' | 'LEVEL_4_AUTONOMOUS' | 'LEVEL_5_SELF_OPTIMIZING';
  active_agents: AgentStatus[];
  decision_breakdown: DecisionBreakdown;
}

export interface AutonomyMetric {
  value: number;
  unit: string;
  target: number;
  achievement_pct: number;
  delta_7d: number;
  trend: 'UP' | 'DOWN' | 'FLAT';
  status: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
  historical: { date: string; value: number }[];
}

export interface AgentStatus {
  agent_id: string;
  name: string;
  status: 'ACTIVE' | 'IDLE' | 'PAUSED' | 'ERROR';
  autonomy_level: string;
  tasks_today: number;
  success_rate: number;
  avg_latency_ms: number;
  revenue_impact_mtd: number;
}

export interface DecisionBreakdown {
  total_decisions_today: number;
  autonomous_execution: number;
  agent_approved: number;
  ai_recommended: number;
  human_decision: number;
  board_decision: number;
}

const METRIC_TARGETS = {
  autonomy_score: 60,       // %
  agent_utilization: 40,    // %
  automation_rate: 70,      // %
  revenue_impact: 100_000,  // USD/month
  cost_savings: 50_000,     // USD/month
  resolution_rate: 65,      // %
  trust_score: 85,          // 0–100
  risk_score: 15,           // lower is better (target <15)
};

function buildMetric(
  value: number,
  target: number,
  unit: string,
  delta_7d: number,
  lowerIsBetter = false,
): AutonomyMetric {
  const achievement_pct = lowerIsBetter
    ? Math.min((target / Math.max(value, 0.001)) * 100, 100)
    : Math.min((value / target) * 100, 100);

  const trend = delta_7d > 0.5 ? 'UP' : delta_7d < -0.5 ? 'DOWN' : 'FLAT';
  const status = achievement_pct >= 95 ? 'ON_TRACK' : achievement_pct >= 80 ? 'AT_RISK' : 'OFF_TRACK';

  const historical = Array.from({ length: 14 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (13 - i));
    const noise = value * (1 + (Math.random() * 0.1 - 0.05));
    return { date: date.toISOString().slice(0, 10), value: Math.round(noise * 100) / 100 };
  });

  return { value, unit, target, achievement_pct: Math.round(achievement_pct), delta_7d, trend, status, historical };
}

function computeAutonomousEnterpriseIndex(metrics: Omit<AutonomyMetricsSnapshot, 'autonomous_enterprise_index' | 'maturity_level' | 'active_agents' | 'decision_breakdown' | 'snapshot_at'>): number {
  const scores = [
    metrics.autonomy_score.achievement_pct * 0.20,
    metrics.agent_utilization.achievement_pct * 0.15,
    metrics.automation_rate.achievement_pct * 0.15,
    metrics.revenue_impact.achievement_pct * 0.20,
    metrics.resolution_rate.achievement_pct * 0.15,
    metrics.trust_score.achievement_pct * 0.10,
    metrics.risk_score.achievement_pct * 0.05,
  ];
  return Math.round(scores.reduce((a, b) => a + b, 0));
}

function determineMaturityLevel(index: number): AutonomyMetricsSnapshot['maturity_level'] {
  if (index >= 85) return 'LEVEL_5_SELF_OPTIMIZING';
  if (index >= 70) return 'LEVEL_4_AUTONOMOUS';
  if (index >= 55) return 'LEVEL_3_AUTOMATED';
  if (index >= 35) return 'LEVEL_2_AUGMENTED';
  return 'LEVEL_1_ASSISTED';
}

class AutonomyMetricsServiceImpl {
  async getSnapshot(): Promise<AutonomyMetricsSnapshot> {
    const autonomy_score = buildMetric(38, METRIC_TARGETS.autonomy_score, '%', +2.3);
    const agent_utilization = buildMetric(28, METRIC_TARGETS.agent_utilization, '%', +1.8);
    const automation_rate = buildMetric(55, METRIC_TARGETS.automation_rate, '%', +3.1);
    const revenue_impact = buildMetric(62_000, METRIC_TARGETS.revenue_impact, 'USD', +4200);
    const cost_savings = buildMetric(28_000, METRIC_TARGETS.cost_savings, 'USD', +1800);
    const resolution_rate = buildMetric(47, METRIC_TARGETS.resolution_rate, '%', +5.2);
    const trust_score = buildMetric(81, METRIC_TARGETS.trust_score, '/ 100', -0.5);
    const risk_score = buildMetric(19, METRIC_TARGETS.risk_score, '/ 100', -1.2, true);

    const metrics = { autonomy_score, agent_utilization, automation_rate, revenue_impact, cost_savings, resolution_rate, trust_score, risk_score };
    const autonomous_enterprise_index = computeAutonomousEnterpriseIndex(metrics);
    const maturity_level = determineMaturityLevel(autonomous_enterprise_index);

    const active_agents: AgentStatus[] = [
      { agent_id: 'retention_agent', name: 'Retention Agent', status: 'ACTIVE', autonomy_level: 'AGENT_APPROVED', tasks_today: 47, success_rate: 0.94, avg_latency_ms: 320, revenue_impact_mtd: 21_400 },
      { agent_id: 'expansion_agent', name: 'Expansion Agent', status: 'ACTIVE', autonomy_level: 'AGENT_APPROVED', tasks_today: 23, success_rate: 0.87, avg_latency_ms: 450, revenue_impact_mtd: 18_200 },
      { agent_id: 'listing_agent', name: 'Listing Agent', status: 'ACTIVE', autonomy_level: 'AUTONOMOUS_EXECUTION', tasks_today: 312, success_rate: 0.98, avg_latency_ms: 85, revenue_impact_mtd: 0 },
      { agent_id: 'trust_agent', name: 'Trust Agent', status: 'ACTIVE', autonomy_level: 'AUTONOMOUS_EXECUTION', tasks_today: 189, success_rate: 0.96, avg_latency_ms: 120, revenue_impact_mtd: 8_400 },
      { agent_id: 'fraud_agent', name: 'Fraud Agent', status: 'ACTIVE', autonomy_level: 'AUTONOMOUS_EXECUTION', tasks_today: 1_203, success_rate: 0.93, avg_latency_ms: 45, revenue_impact_mtd: 0 },
      { agent_id: 'support_agent', name: 'Support Agent', status: 'ACTIVE', autonomy_level: 'AGENT_APPROVED', tasks_today: 88, success_rate: 0.79, avg_latency_ms: 2_100, revenue_impact_mtd: 5_200 },
      { agent_id: 'discovery_agent', name: 'Discovery Agent', status: 'ACTIVE', autonomy_level: 'AUTONOMOUS_EXECUTION', tasks_today: 56, success_rate: 1.0, avg_latency_ms: 230, revenue_impact_mtd: 0 },
      { agent_id: 'pricing_agent', name: 'Pricing Agent', status: 'IDLE', autonomy_level: 'AI_RECOMMENDED', tasks_today: 3, success_rate: 1.0, avg_latency_ms: 1_800, revenue_impact_mtd: 5_800 },
    ];

    const decision_breakdown: DecisionBreakdown = {
      total_decisions_today: 1_921,
      autonomous_execution: 1_482,
      agent_approved: 302,
      ai_recommended: 98,
      human_decision: 37,
      board_decision: 2,
    };

    return {
      snapshot_at: new Date().toISOString(),
      ...metrics,
      autonomous_enterprise_index,
      maturity_level,
      active_agents,
      decision_breakdown,
    };
  }

  async getHistoricalTrend(metric: keyof typeof METRIC_TARGETS, days = 30): Promise<{ date: string; value: number }[]> {
    const base = METRIC_TARGETS[metric] * 0.6;
    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const value = base + (i / days) * (METRIC_TARGETS[metric] * 0.4) + Math.random() * 5;
      return { date: date.toISOString().slice(0, 10), value: Math.round(value * 10) / 10 };
    });
  }
}

export const AutonomyMetricsService = new AutonomyMetricsServiceImpl();
