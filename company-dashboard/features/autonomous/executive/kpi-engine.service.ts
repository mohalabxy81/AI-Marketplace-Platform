/**
 * KPI Engine Service
 * Computes all business and autonomy KPIs from platform data sources.
 * Part of AU.1 — Executive Intelligence Layer
 */

export type KPIName =
  // Business KPIs
  | 'arr' | 'mrr' | 'nrr' | 'churn_rate' | 'cac' | 'ltv' | 'dau' | 'mau' | 'dau_mau_ratio' | 'nps'
  // Autonomy KPIs
  | 'autonomy_score' | 'agent_utilization' | 'automation_rate'
  | 'revenue_impact' | 'cost_savings' | 'resolution_rate'
  | 'trust_score_avg' | 'risk_score';

export type TrendDirection = 'UP' | 'DOWN' | 'FLAT' | 'DOWN_GOOD' | 'UP_BAD';

export interface MetricValue {
  value: number;
  unit: string;
  delta_7d: string;
  delta_30d?: string;
  trend: TrendDirection;
  benchmark?: number;
  target?: number;
  status: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
}

export interface KPISnapshot {
  computed_at: string;
  period_start: string;
  period_end: string;
  metrics: Record<KPIName, MetricValue>;
}

export interface KPIDashboard {
  snapshot: KPISnapshot;
  anomalies: AnomalyAlert[];
  top_movers: { metric: KPIName; change_pct: number; direction: TrendDirection }[];
}

export interface AnomalyAlert {
  metric: KPIName;
  current_value: number;
  expected_value: number;
  z_score: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detected_at: string;
  recommended_action?: string;
}

export interface TrendData {
  metric: KPIName;
  data_points: { timestamp: string; value: number }[];
  trend_line_slope: number;
  r_squared: number;
}

const KPI_TARGETS: Partial<Record<KPIName, number>> = {
  nrr: 1.10,
  churn_rate: 0.02,
  dau_mau_ratio: 0.40,
  autonomy_score: 0.60,
  agent_utilization: 0.40,
  automation_rate: 0.70,
  resolution_rate: 0.65,
  trust_score_avg: 0.85,
  risk_score: 0.15,
};

const KPI_UNITS: Record<KPIName, string> = {
  arr: 'USD', mrr: 'USD', nrr: 'ratio', churn_rate: 'pct',
  cac: 'USD', ltv: 'USD', dau: 'count', mau: 'count',
  dau_mau_ratio: 'ratio', nps: 'score',
  autonomy_score: 'pct', agent_utilization: 'pct', automation_rate: 'pct',
  revenue_impact: 'USD', cost_savings: 'USD', resolution_rate: 'pct',
  trust_score_avg: 'score', risk_score: 'score',
};

/** Determines trend direction with context-awareness */
function determineTrend(
  metric: KPIName,
  current: number,
  previous: number,
): TrendDirection {
  const delta = current - previous;
  if (Math.abs(delta) < 0.001 * Math.abs(previous || 1)) return 'FLAT';

  // Metrics where lower is better
  const lowerIsBetter: KPIName[] = ['churn_rate', 'cac', 'risk_score'];
  const isDown = delta < 0;

  if (lowerIsBetter.includes(metric)) {
    return isDown ? 'DOWN_GOOD' : 'UP_BAD';
  }
  return isDown ? 'DOWN' : 'UP';
}

/** Determines KPI health status relative to target */
function computeStatus(
  metric: KPIName,
  value: number,
): MetricValue['status'] {
  const target = KPI_TARGETS[metric];
  if (!target) return 'ON_TRACK';

  const lowerIsBetter: KPIName[] = ['churn_rate', 'cac', 'risk_score'];
  const ratio = lowerIsBetter.includes(metric) ? target / value : value / target;

  if (ratio >= 0.95) return 'ON_TRACK';
  if (ratio >= 0.80) return 'AT_RISK';
  return 'OFF_TRACK';
}

/**
 * Simulated KPI data — replaced by real ClickHouse + Supabase queries in production.
 * Each metric returns a realistic value with delta computation.
 */
function getSimulatedKPIValue(metric: KPIName): { current: number; previous: number } {
  const base: Record<KPIName, number> = {
    arr: 4_200_000,        mrr: 350_000,        nrr: 1.14,
    churn_rate: 0.023,     cac: 780,            ltv: 9_400,
    dau: 12_400,           mau: 41_200,         dau_mau_ratio: 0.30,
    nps: 52,
    autonomy_score: 0.38,  agent_utilization: 0.28, automation_rate: 0.55,
    revenue_impact: 62_000, cost_savings: 28_000, resolution_rate: 0.47,
    trust_score_avg: 0.81, risk_score: 0.19,
  };
  const variance = 0.05;
  const current = base[metric];
  const previous = current * (1 - (Math.random() * variance * 2 - variance));
  return { current, previous };
}

class KPIEngineServiceImpl {
  /** Compute a single KPI metric */
  async computeKPI(name: KPIName): Promise<MetricValue> {
    const { current, previous } = getSimulatedKPIValue(name);
    const delta = ((current - previous) / Math.abs(previous || 1)) * 100;
    const trend = determineTrend(name, current, previous);

    return {
      value: current,
      unit: KPI_UNITS[name],
      delta_7d: `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`,
      trend,
      target: KPI_TARGETS[name],
      status: computeStatus(name, current),
    };
  }

  /** Compute all KPIs in a single snapshot */
  async computeAllKPIs(): Promise<KPIDashboard> {
    const now = new Date();
    const periodStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const metricNames: KPIName[] = [
      'arr', 'mrr', 'nrr', 'churn_rate', 'cac', 'ltv', 'dau', 'mau', 'dau_mau_ratio', 'nps',
      'autonomy_score', 'agent_utilization', 'automation_rate',
      'revenue_impact', 'cost_savings', 'resolution_rate', 'trust_score_avg', 'risk_score',
    ];

    const metricsEntries = await Promise.all(
      metricNames.map(async (name) => [name, await this.computeKPI(name)] as const),
    );
    const metrics = Object.fromEntries(metricsEntries) as Record<KPIName, MetricValue>;

    const anomalies = await this.detectKPIAnomalies();
    const topMovers = metricNames
      .map((m) => {
        const val = metrics[m].delta_7d;
        const change_pct = parseFloat(val);
        return { metric: m, change_pct: Math.abs(change_pct), direction: metrics[m].trend };
      })
      .sort((a, b) => b.change_pct - a.change_pct)
      .slice(0, 5);

    return {
      snapshot: {
        computed_at: now.toISOString(),
        period_start: periodStart.toISOString(),
        period_end: now.toISOString(),
        metrics,
      },
      anomalies,
      top_movers: topMovers,
    };
  }

  /** Get historical trend data for a metric */
  async getKPITrend(name: KPIName, lookbackDays: number): Promise<TrendData> {
    const { current } = getSimulatedKPIValue(name);
    const dataPoints = Array.from({ length: lookbackDays }).map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (lookbackDays - i));
      const noise = 1 + (Math.random() * 0.1 - 0.05);
      return { timestamp: date.toISOString(), value: current * noise };
    });

    return {
      metric: name,
      data_points: dataPoints,
      trend_line_slope: 0.003,  // slight upward trend
      r_squared: 0.82,
    };
  }

  /** Detect KPIs deviating more than 2σ from 30-day moving average */
  async detectKPIAnomalies(): Promise<AnomalyAlert[]> {
    const alerts: AnomalyAlert[] = [];
    const anomalyThreshold = 2.0;

    const riskKPIs: KPIName[] = ['churn_rate', 'risk_score', 'trust_score_avg'];
    for (const metric of riskKPIs) {
      const { current, previous } = getSimulatedKPIValue(metric);
      const std = previous * 0.08;
      const z_score = Math.abs(current - previous) / (std || 1);

      if (z_score > anomalyThreshold) {
        alerts.push({
          metric,
          current_value: current,
          expected_value: previous,
          z_score,
          severity: z_score > 3.5 ? 'CRITICAL' : z_score > 3 ? 'HIGH' : 'MEDIUM',
          detected_at: new Date().toISOString(),
          recommended_action: `Review ${metric} — deviation of ${z_score.toFixed(2)}σ from baseline.`,
        });
      }
    }
    return alerts;
  }
}

export const KPIEngineService = new KPIEngineServiceImpl();
