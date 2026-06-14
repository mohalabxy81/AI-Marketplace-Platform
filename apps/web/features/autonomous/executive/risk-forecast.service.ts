/**
 * Risk Forecast Service
 * Probabilistic risk modeling for executive and board risk reporting.
 * Part of AU.1 — Executive Intelligence Layer
 */

export type RiskCategory =
  | 'FINANCIAL' | 'OPERATIONAL' | 'REGULATORY' | 'REPUTATIONAL'
  | 'TECHNICAL' | 'COMPETITIVE' | 'AI_SAFETY';

export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface RiskItem {
  risk_id: string;
  category: RiskCategory;
  name: string;
  description: string;
  probability: number;       // 0.0–1.0
  impact_score: number;      // 1–5
  velocity_score: number;    // 1–3 (how fast it's materializing)
  composite_score: number;   // probability × impact × velocity / normalization
  severity: RiskSeverity;
  time_horizon: '30D' | '60D' | '90D' | 'FY';
  mitigation: string;
  owner: string;
  last_updated: string;
  trend: 'IMPROVING' | 'STABLE' | 'DETERIORATING';
}

export interface RiskRegister {
  computed_at: string;
  overall_risk_score: number;
  risk_level: RiskSeverity;
  risks: RiskItem[];
  critical_risks: RiskItem[];
  monte_carlo_summary: MonteCarloSummary;
  concentration_risks: ConcentrationRisk[];
}

export interface MonteCarloSummary {
  simulations: number;
  p50_impact_usd: number;
  p90_impact_usd: number;
  p99_impact_usd: number;
  probability_of_major_impact: number;  // P(impact > $500K)
}

export interface ConcentrationRisk {
  type: 'REVENUE' | 'CUSTOMER' | 'TECHNOLOGY' | 'GEOGRAPHY';
  description: string;
  concentration_pct: number;
  threshold_pct: number;
  at_risk: boolean;
}

const RISK_REGISTRY_DATA: Omit<RiskItem, 'composite_score' | 'severity'>[] = [
  {
    risk_id: 'R-FIN-001', category: 'FINANCIAL',
    name: 'Revenue Concentration Risk',
    description: 'Top 3 tenants represent 18% of MRR. Loss of any single account would materially impact revenue.',
    probability: 0.12, impact_score: 4, velocity_score: 2,
    time_horizon: '90D', mitigation: 'Diversify customer base; activate expansion agent on 8 dormant accounts.',
    owner: 'CFO', last_updated: new Date().toISOString(), trend: 'STABLE',
  },
  {
    risk_id: 'R-OPS-001', category: 'OPERATIONAL',
    name: 'Agent Autonomy Misconfiguration',
    description: 'Misconfigured policy gates could allow autonomous actions beyond intended scope.',
    probability: 0.08, impact_score: 3, velocity_score: 1,
    time_horizon: '30D', mitigation: 'Implement policy engine audit trail; require dual-approval for AGENT_APPROVED policy changes.',
    owner: 'CTO', last_updated: new Date().toISOString(), trend: 'IMPROVING',
  },
  {
    risk_id: 'R-REG-001', category: 'REGULATORY',
    name: 'EU AI Act Compliance Gap',
    description: 'Autonomous decision-making systems require documentation and human oversight mechanisms under EU AI Act.',
    probability: 0.35, impact_score: 3, velocity_score: 2,
    time_horizon: 'FY', mitigation: 'Engage compliance team; document decision engine policies; implement explainability endpoints.',
    owner: 'Chief Compliance Officer', last_updated: new Date().toISOString(), trend: 'STABLE',
  },
  {
    risk_id: 'R-TECH-001', category: 'TECHNICAL',
    name: 'LLM Provider Dependency',
    description: 'Platform AI agents depend on single LLM provider. Provider outage cascades to all autonomous operations.',
    probability: 0.15, impact_score: 4, velocity_score: 3,
    time_horizon: '60D', mitigation: 'Implement multi-provider routing; fallback to local models (Llama-3-8B) for critical paths.',
    owner: 'CTO', last_updated: new Date().toISOString(), trend: 'DETERIORATING',
  },
  {
    risk_id: 'R-REP-001', category: 'REPUTATIONAL',
    name: 'False Positive Fraud Actions',
    description: 'Fraud agent false positives may incorrectly freeze legitimate tenant accounts, causing customer harm.',
    probability: 0.07, impact_score: 3, velocity_score: 2,
    time_horizon: '30D', mitigation: 'Review fraud agent false positive rate weekly; maintain human override path for all automated freezes.',
    owner: 'VP Operations', last_updated: new Date().toISOString(), trend: 'IMPROVING',
  },
  {
    risk_id: 'R-AI-001', category: 'AI_SAFETY',
    name: 'Agent Hallucination in Revenue Recommendations',
    description: 'Revenue or pricing agent may generate confidence-high but factually incorrect pricing recommendations.',
    probability: 0.10, impact_score: 3, velocity_score: 2,
    time_horizon: '60D', mitigation: 'All pricing changes remain AI_RECOMMENDED; require human sign-off; implement recommendation backtesting.',
    owner: 'Chief AI Officer', last_updated: new Date().toISOString(), trend: 'STABLE',
  },
];

function computeCompositeScore(risk: Pick<RiskItem, 'probability' | 'impact_score' | 'velocity_score'>): number {
  // RiskScore = Σ(probability × impact × velocity) / normalization
  // Max raw: 1.0 × 5 × 3 = 15 → normalize to [0,1]
  return (risk.probability * risk.impact_score * risk.velocity_score) / 15;
}

function scoreToseverity(score: number): RiskSeverity {
  if (score >= 0.50) return 'CRITICAL';
  if (score >= 0.30) return 'HIGH';
  if (score >= 0.15) return 'MEDIUM';
  return 'LOW';
}

class RiskForecastServiceImpl {
  async getRiskRegister(): Promise<RiskRegister> {
    const risks: RiskItem[] = RISK_REGISTRY_DATA.map((r) => {
      const composite_score = computeCompositeScore(r);
      return { ...r, composite_score, severity: scoreToseverity(composite_score) };
    });

    const overallScore = risks.reduce((sum, r) => sum + r.composite_score, 0) / risks.length;
    const monteCarlo = this.runMonteCarloSimulation(risks);
    const concentrationRisks = this.detectConcentrationRisks();

    return {
      computed_at: new Date().toISOString(),
      overall_risk_score: Math.round(overallScore * 1000) / 1000,
      risk_level: scoreToseverity(overallScore),
      risks: risks.sort((a, b) => b.composite_score - a.composite_score),
      critical_risks: risks.filter((r) => r.severity === 'CRITICAL' || r.severity === 'HIGH'),
      monte_carlo_summary: monteCarlo,
      concentration_risks: concentrationRisks,
    };
  }

  private runMonteCarloSimulation(risks: RiskItem[], simulations = 10_000): MonteCarloSummary {
    const impacts: number[] = [];
    for (let i = 0; i < simulations; i++) {
      let totalImpact = 0;
      for (const risk of risks) {
        if (Math.random() < risk.probability) {
          const baseImpact = risk.impact_score * 50_000;
          const noise = 0.5 + Math.random();
          totalImpact += baseImpact * noise;
        }
      }
      impacts.push(totalImpact);
    }
    impacts.sort((a, b) => a - b);
    return {
      simulations,
      p50_impact_usd: Math.round(impacts[Math.floor(simulations * 0.50)]),
      p90_impact_usd: Math.round(impacts[Math.floor(simulations * 0.90)]),
      p99_impact_usd: Math.round(impacts[Math.floor(simulations * 0.99)]),
      probability_of_major_impact: impacts.filter((i) => i > 500_000).length / simulations,
    };
  }

  private detectConcentrationRisks(): ConcentrationRisk[] {
    return [
      {
        type: 'REVENUE', description: 'Top 3 tenants by MRR',
        concentration_pct: 18, threshold_pct: 15, at_risk: true,
      },
      {
        type: 'TECHNOLOGY', description: 'Single LLM provider dependency (OpenAI)',
        concentration_pct: 100, threshold_pct: 70, at_risk: true,
      },
      {
        type: 'GEOGRAPHY', description: 'User base concentration in US+EU',
        concentration_pct: 78, threshold_pct: 80, at_risk: false,
      },
      {
        type: 'CUSTOMER', description: 'Top 10 accounts by seat count',
        concentration_pct: 31, threshold_pct: 40, at_risk: false,
      },
    ];
  }
}

export const RiskForecastService = new RiskForecastServiceImpl();
