/**
 * AU.1 — Strategy Copilot Service
 * Competitive intelligence, market positioning, OKR tracking, strategic signals
 */

export interface OKR {
  objective: string;
  key_results: Array<{
    description: string;
    target: string | number;
    current: string | number;
    progress: number;  // 0–1
    status: 'ON_TRACK' | 'AT_RISK' | 'BEHIND';
  }>;
  owner: string;
  quarter: string;
}

export interface CompetitiveSignal {
  competitor: string;
  signal_type: 'PRICING_CHANGE' | 'FEATURE_LAUNCH' | 'FUNDING' | 'PARTNERSHIP' | 'ACQUISITION';
  description: string;
  threat_level: 'LOW' | 'MEDIUM' | 'HIGH';
  recommended_action: string;
  detected_at: string;
}

export interface MarketPosition {
  segment: string;
  market_share_est: number;
  vs_competitor_a: number;
  vs_competitor_b: number;
  differentiation_score: number;
  win_rate: number;
}

export const StrategyCopilotService = {
  async getOKRs(quarter: string): Promise<OKR[]> {
    return [
      {
        objective: 'Scale to Autonomous Enterprise Level 3',
        key_results: [
          { description: 'Autonomy Score', target: 70, current: 47, progress: 0.67, status: 'AT_RISK' },
          { description: 'Active autonomous agents', target: 15, current: 8, progress: 0.53, status: 'AT_RISK' },
          { description: 'Automation rate', target: 0.75, current: 0.55, progress: 0.73, status: 'ON_TRACK' },
          { description: 'Agent-driven revenue impact (monthly)', target: 150_000, current: 62_000, progress: 0.41, status: 'BEHIND' },
        ],
        owner: 'CTO + VP AI',
        quarter,
      },
      {
        objective: 'Reach $3M ARR with >110% NRR',
        key_results: [
          { description: 'ARR', target: 3_000_000, current: 2_640_000, progress: 0.88, status: 'ON_TRACK' },
          { description: 'NRR', target: 1.15, current: 1.14, progress: 0.99, status: 'ON_TRACK' },
          { description: 'Monthly churn', target: 0.015, current: 0.018, progress: 0.83, status: 'AT_RISK' },
          { description: 'Expansion MRR', target: 25_000, current: 14_800, progress: 0.59, status: 'AT_RISK' },
        ],
        owner: 'CEO + CRO',
        quarter,
      },
      {
        objective: 'Launch Enterprise Tier & Win 5 Enterprise Accounts',
        key_results: [
          { description: 'SSO/SCIM integration shipped', target: 'Q3', current: 'Planning', progress: 0.15, status: 'BEHIND' },
          { description: 'Enterprise pipeline value', target: 500_000, current: 120_000, progress: 0.24, status: 'BEHIND' },
          { description: 'Enterprise accounts signed', target: 5, current: 0, progress: 0, status: 'BEHIND' },
        ],
        owner: 'VP Sales + CPO',
        quarter,
      },
    ];
  },

  async getCompetitiveSignals(): Promise<CompetitiveSignal[]> {
    return [
      {
        competitor: 'Competitor A',
        signal_type: 'PRICING_CHANGE',
        description: 'Reduced Starter plan from $99 to $79/month — targeting our primary acquisition segment.',
        threat_level: 'HIGH',
        recommended_action: 'Pricing Agent: schedule competitive response analysis. Consider value-add positioning over price match.',
        detected_at: new Date(Date.now() - 86400000 * 2).toISOString(),
      },
      {
        competitor: 'Competitor B',
        signal_type: 'FEATURE_LAUNCH',
        description: 'Launched AI-powered listing enrichment — feature parity with our Listing Agent.',
        threat_level: 'MEDIUM',
        recommended_action: 'Accelerate marketplace autonomy roadmap. Differentiate on multi-agent orchestration depth.',
        detected_at: new Date(Date.now() - 86400000 * 5).toISOString(),
      },
      {
        competitor: 'Competitor C',
        signal_type: 'FUNDING',
        description: 'Series B $30M announced — likely to accelerate enterprise sales.',
        threat_level: 'MEDIUM',
        recommended_action: 'Accelerate enterprise tier launch. Strengthen compliance positioning (SOC 2 completion).',
        detected_at: new Date(Date.now() - 86400000 * 7).toISOString(),
      },
    ];
  },

  async getMarketPosition(): Promise<MarketPosition[]> {
    return [
      { segment: 'SMB AI Marketplace', market_share_est: 0.08, vs_competitor_a: 1.12, vs_competitor_b: 0.89, differentiation_score: 0.82, win_rate: 0.44 },
      { segment: 'Mid-Market Agent Platform', market_share_est: 0.04, vs_competitor_a: 0.96, vs_competitor_b: 1.31, differentiation_score: 0.78, win_rate: 0.38 },
      { segment: 'Enterprise', market_share_est: 0.01, vs_competitor_a: 0.42, vs_competitor_b: 0.67, differentiation_score: 0.61, win_rate: 0.22 },
    ];
  },

  async getStrategicSignalSummary(): Promise<string> {
    return '3 competitive signals detected this week. HIGH priority: Competitor A price cut threatens Starter segment. Recommended: Deploy Pricing Agent response analysis within 48h. Board-level item: Enterprise tier 3 months behind plan.';
  },
};
