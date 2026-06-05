/**
 * Revenue Forecast Service
 * Dual-model ensemble: ARIMA statistical layer + GPT-4o intelligence layer
 * Part of AU.1 — Executive Intelligence Layer
 */

export interface RevenueForecast {
  forecast_id: string;
  generated_at: string;
  horizon_days: 30 | 60 | 90;
  current_mrr: number;
  forecast_mrr: number;
  confidence_interval: { lower: number; upper: number };
  confidence_level: 'HIGH' | 'MEDIUM' | 'LOW';
  drivers: ForecastDriver[];
  risks: ForecastRisk[];
  narrative: string;
}

export interface ForecastDriver {
  name: string;
  impact_usd: number;
  direction: 'POSITIVE' | 'NEGATIVE';
  confidence: number;
  source: 'STATISTICAL' | 'AI_INTELLIGENCE';
}

export interface ForecastRisk {
  description: string;
  probability: number;
  impact_usd: number;
  mitigation: string;
}

export interface ConfidenceInterval {
  horizon_days: number;
  lower_bound: number;
  upper_bound: number;
  midpoint: number;
  sigma_pct: number;
}

/** Simulated forecast — production connects to ARIMA model + OpenAI GPT-4o */
function simulateMRRHistory(months: number): number[] {
  let mrr = 260_000;
  return Array.from({ length: months }, () => {
    mrr *= 1 + (Math.random() * 0.06 + 0.01); // 1–7% MoM growth
    return Math.round(mrr);
  });
}

/** Linear regression on log-transformed MRR series */
function arimaForecast(history: number[], horizonDays: number): number {
  const n = history.length;
  const logHistory = history.map(Math.log);
  const xs = Array.from({ length: n }, (_, i) => i);
  const xMean = (n - 1) / 2;
  const yMean = logHistory.reduce((a, b) => a + b, 0) / n;
  const slope =
    xs.reduce((sum, x, i) => sum + (x - xMean) * (logHistory[i] - yMean), 0) /
    xs.reduce((sum, x) => sum + (x - xMean) ** 2, 0);
  const intercept = yMean - slope * xMean;
  const monthsFwd = horizonDays / 30;
  return Math.exp(intercept + slope * (n + monthsFwd));
}

/** GPT-4o driven adjustment — simulated here, real version calls OpenAI */
function llmForecastAdjustment(
  baseForecast: number,
  horizon_days: number,
): { adjusted: number; narrative: string; drivers: ForecastDriver[] } {
  const adjustments = [
    { name: 'Expansion agent pipeline', impact_usd: 28_000, dir: 'POSITIVE' as const },
    { name: 'Seasonal Q3 slowdown', impact_usd: -12_000, dir: 'NEGATIVE' as const },
    { name: 'Enterprise upsell opportunity (3 accounts)', impact_usd: 45_000, dir: 'POSITIVE' as const },
    { name: 'Retention campaign reduction in churn', impact_usd: 18_000, dir: 'POSITIVE' as const },
  ];

  const totalAdjustment = adjustments.reduce(
    (sum, a) => sum + (a.dir === 'POSITIVE' ? a.impact_usd : -a.impact_usd),
    0,
  );

  const drivers: ForecastDriver[] = adjustments.map((a) => ({
    name: a.name,
    impact_usd: Math.abs(a.impact_usd),
    direction: a.dir,
    confidence: 0.72,
    source: 'AI_INTELLIGENCE',
  }));

  return {
    adjusted: baseForecast + totalAdjustment / (horizon_days / 30),
    narrative: `The ${horizon_days}-day forecast reflects continued organic growth supplemented by agent-driven expansion opportunities. Three enterprise accounts show strong upsell signals. Seasonal Q3 headwinds partially offset growth. Net effect: +${Math.round(totalAdjustment / 1000)}K MRR addition over the period.`,
    drivers,
  };
}

class RevenueForecastServiceImpl {
  private history = simulateMRRHistory(24);

  async forecast(horizon: 30 | 60 | 90): Promise<RevenueForecast> {
    const currentMrr = this.history[this.history.length - 1];
    const arimaResult = arimaForecast(this.history, horizon);
    const { adjusted: llmResult, narrative, drivers } = llmForecastAdjustment(arimaResult, horizon);

    // Ensemble: 60% ARIMA + 40% LLM
    const ensembleForecast = 0.6 * arimaResult + 0.4 * llmResult;

    // Confidence interval widens with horizon
    const sigmaFactor = horizon === 30 ? 0.05 : horizon === 60 ? 0.12 : 0.20;
    const ci = {
      lower: Math.round(ensembleForecast * (1 - sigmaFactor)),
      upper: Math.round(ensembleForecast * (1 + sigmaFactor)),
    };

    const risks: ForecastRisk[] = [
      {
        description: 'Revenue concentration: top 3 accounts = 18% of MRR',
        probability: 0.12,
        impact_usd: -63_000,
        mitigation: 'Activate expansion agent on 8 dormant enterprise accounts',
      },
      {
        description: 'Q3 pipeline conversion slower than historical average',
        probability: 0.25,
        impact_usd: -22_000,
        mitigation: 'Accelerate trial-to-paid campaigns via subscription optimization agent',
      },
    ];

    return {
      forecast_id: `forecast_${horizon}d_${Date.now()}`,
      generated_at: new Date().toISOString(),
      horizon_days: horizon,
      current_mrr: Math.round(currentMrr),
      forecast_mrr: Math.round(ensembleForecast),
      confidence_interval: ci,
      confidence_level: horizon === 30 ? 'HIGH' : horizon === 60 ? 'MEDIUM' : 'LOW',
      drivers,
      risks,
      narrative,
    };
  }

  async getConfidenceInterval(horizon: number): Promise<ConfidenceInterval> {
    const base = this.history[this.history.length - 1];
    const sigma = horizon === 30 ? 0.05 : horizon === 60 ? 0.12 : 0.20;
    const midpoint = base * (1 + 0.035 * (horizon / 30));
    return {
      horizon_days: horizon,
      lower_bound: Math.round(midpoint * (1 - sigma)),
      upper_bound: Math.round(midpoint * (1 + sigma)),
      midpoint: Math.round(midpoint),
      sigma_pct: sigma * 100,
    };
  }
}

export const RevenueForecastService = new RevenueForecastServiceImpl();
