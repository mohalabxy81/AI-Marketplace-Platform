/**
 * Executive Copilot Service
 * Generates executive briefs, KPI snapshots, and strategic recommendations.
 * Part of AU.1 — Executive Intelligence Layer
 */

import { KPIEngineService, type KPISnapshot, type AnomalyAlert } from './kpi-engine.service';
import { RevenueForecastService, type RevenueForecast } from './revenue-forecast.service';

export interface ExecutiveBrief {
  brief_id: string;
  generated_at: string;
  period: { start: string; end: string };
  kpi_snapshot: KPISnapshot;
  revenue_forecast_30d: RevenueForecast;
  ai_insights: ExecutiveInsight[];
  risks: ExecutiveRisk[];
  recommendations: ExecutiveRecommendation[];
  autonomy_snapshot: AutonomySnapshot;
  anomalies: AnomalyAlert[];
}

export interface ExecutiveInsight {
  id: string;
  category: 'REVENUE' | 'GROWTH' | 'OPERATIONS' | 'AUTONOMY' | 'RISK';
  headline: string;
  detail: string;
  impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  confidence: number;
  source_agent?: string;
}

export interface ExecutiveRisk {
  id: string;
  description: string;
  probability: number;
  impact_score: number; // 1–5
  time_horizon: '30D' | '60D' | '90D' | 'Q4' | 'FY';
  mitigation: string;
}

export interface ExecutiveRecommendation {
  id: string;
  title: string;
  description: string;
  expected_impact_usd?: number;
  effort: 'LOW' | 'MEDIUM' | 'HIGH';
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggested_owner: string;
  autonomy_level: string;
}

export interface AutonomySnapshot {
  autonomy_score_pct: number;
  agent_utilization_pct: number;
  automation_rate_pct: number;
  revenue_influenced_usd: number;
  cost_saved_usd: number;
  decisions_today: number;
  autonomous_decisions_today: number;
  active_agents: string[];
  top_performing_agent: { name: string; revenue_impact_usd: number };
}

const ACTIVE_AGENTS = [
  'Revenue Agent', 'Pricing Agent', 'Retention Agent',
  'Listing Agent', 'Trust Agent', 'Fraud Agent',
  'Support Agent', 'Discovery Agent',
];

class ExecutiveCopilotServiceImpl {
  async generateExecutiveBrief(): Promise<ExecutiveBrief> {
    const now = new Date();
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [kpiDashboard, forecast30d] = await Promise.all([
      KPIEngineService.computeAllKPIs(),
      RevenueForecastService.forecast(30),
    ]);

    const insights = this.generateInsights(kpiDashboard.snapshot);
    const risks = this.generateRisks(kpiDashboard.snapshot);
    const recommendations = this.generateRecommendations(kpiDashboard.snapshot);
    const autonomySnapshot = this.buildAutonomySnapshot();

    return {
      brief_id: `exec_brief_${now.toISOString().slice(0, 10).replace(/-/g, '')}`,
      generated_at: now.toISOString(),
      period: {
        start: periodStart.toISOString(),
        end: now.toISOString(),
      },
      kpi_snapshot: kpiDashboard.snapshot,
      revenue_forecast_30d: forecast30d,
      ai_insights: insights,
      risks,
      recommendations,
      autonomy_snapshot: autonomySnapshot,
      anomalies: kpiDashboard.anomalies,
    };
  }

  private generateInsights(snapshot: KPISnapshot): ExecutiveInsight[] {
    const insights: ExecutiveInsight[] = [];
    const m = snapshot.metrics;

    // NRR insight
    if (m.nrr.value > 1.10) {
      insights.push({
        id: 'ins_nrr_positive',
        category: 'REVENUE',
        headline: `NRR at ${(m.nrr.value * 100).toFixed(0)}% — expansion revenue exceeds new logo revenue`,
        detail: 'Expansion agents have driven net revenue retention above the benchmark threshold, indicating strong product-market fit in the existing base.',
        impact: 'POSITIVE',
        confidence: 0.92,
        source_agent: 'Expansion Agent',
      });
    }

    // Autonomy score insight
    if (m.autonomy_score.value < 0.50) {
      insights.push({
        id: 'ins_autonomy_gap',
        category: 'AUTONOMY',
        headline: `Autonomy Score at ${(m.autonomy_score.value * 100).toFixed(0)}% — below 60% target`,
        detail: '3 agent policy gates are still set to AI_RECOMMENDED. Unlocking AGENT_APPROVED for retention interventions and listing publications would immediately increase autonomy score by ~15 points.',
        impact: 'NEGATIVE',
        confidence: 0.88,
        source_agent: 'Decision Engine',
      });
    }

    // Churn insight
    const churnDelta = parseFloat(m.churn_rate.delta_7d);
    if (churnDelta < 0) {
      insights.push({
        id: 'ins_churn_improvement',
        category: 'GROWTH',
        headline: `Churn rate improved ${Math.abs(churnDelta).toFixed(1)}% — retention agent interventions contributing`,
        detail: 'Save campaigns triggered by the retention agent have been converting 34% of high-risk accounts. Continuing current trajectory projects churn below 1.8% within 60 days.',
        impact: 'POSITIVE',
        confidence: 0.78,
        source_agent: 'Retention Agent',
      });
    }

    return insights;
  }

  private generateRisks(snapshot: KPISnapshot): ExecutiveRisk[] {
    return [
      {
        id: 'risk_revenue_concentration',
        description: 'Revenue concentration: top 3 tenants represent 18% of MRR — single-point churn risk.',
        probability: 0.12,
        impact_score: 4,
        time_horizon: '90D',
        mitigation: 'Activate expansion agent on 8 dormant accounts; diversify pipeline across 5+ new segments.',
      },
      {
        id: 'risk_trust_score_decline',
        description: `Platform trust score avg (${snapshot.metrics.trust_score_avg.value.toFixed(2)}) approaching AT_RISK threshold of 0.75.`,
        probability: 0.18,
        impact_score: 3,
        time_horizon: '30D',
        mitigation: 'Trust agent intervention: increase moderation throughput, resolve 12 pending disputes.',
      },
      {
        id: 'risk_regulatory',
        description: 'EU AI Act compliance review pending — autonomous decision-making systems require documentation.',
        probability: 0.35,
        impact_score: 3,
        time_horizon: 'Q4',
        mitigation: 'Engage compliance team to document decision engine policies; implement explainability API.',
      },
    ];
  }

  private generateRecommendations(snapshot: KPISnapshot): ExecutiveRecommendation[] {
    return [
      {
        id: 'rec_expand_autonomy',
        title: 'Unlock AGENT_APPROVED for Retention Interventions',
        description: 'Current policy requires AI_RECOMMENDED for save campaigns. Changing to AGENT_APPROVED for MEDIUM-risk tenants would reduce intervention latency from 4h to <5min.',
        expected_impact_usd: 35_000,
        effort: 'LOW',
        urgency: 'HIGH',
        suggested_owner: 'CTO + VP Customer Success',
        autonomy_level: 'AGENT_APPROVED',
      },
      {
        id: 'rec_diversify_pipeline',
        title: 'Activate Expansion Agent on Dormant Enterprise Accounts',
        description: '8 enterprise accounts with ExpansionScore >0.70 have not received outreach in 90+ days. Agent can autonomously initiate sequences.',
        expected_impact_usd: 84_000,
        effort: 'LOW',
        urgency: 'HIGH',
        suggested_owner: 'VP Sales + Expansion Agent',
        autonomy_level: 'AGENT_APPROVED',
      },
      {
        id: 'rec_annual_conversion',
        title: 'Convert 23 Monthly Payers to Annual Plans',
        description: 'Subscription optimization agent has identified 23 tenants on monthly billing with 6+ months tenure. Annual conversion expected yield: +$42K in committed ARR.',
        expected_impact_usd: 42_000,
        effort: 'LOW',
        urgency: 'MEDIUM',
        suggested_owner: 'Revenue Agent + Finance',
        autonomy_level: 'AGENT_APPROVED',
      },
    ];
  }

  private buildAutonomySnapshot(): AutonomySnapshot {
    return {
      autonomy_score_pct: 38,
      agent_utilization_pct: 28,
      automation_rate_pct: 55,
      revenue_influenced_usd: 62_000,
      cost_saved_usd: 28_000,
      decisions_today: 1_847,
      autonomous_decisions_today: 702,
      active_agents: ACTIVE_AGENTS,
      top_performing_agent: {
        name: 'Retention Agent',
        revenue_impact_usd: 21_400,
      },
    };
  }
}

export const ExecutiveCopilotService = new ExecutiveCopilotServiceImpl();
