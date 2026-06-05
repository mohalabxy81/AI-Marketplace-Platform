# Spec 47 — STEP AU.1: Executive Intelligence Layer

> **Phase**: AU.1 (Autonomous Enterprise)
> **Status**: Active
> **Scope**: Executive Copilot · Board Copilot · Strategy Copilot · Financial Copilot · Risk Copilot
> **Autonomy Level Default**: AI Recommended

---

## 1. Executive Summary

The Executive Intelligence Layer is the cognitive control plane of the Autonomous Enterprise. It provides C-suite and Board-level principals with AI-driven analysis, forecasting, and strategic recommendations — enabling human decision-makers to operate at 10× the analytical throughput with a fraction of the manual effort.

The layer runs five specialized copilots, each with domain-bounded memory, a dedicated toolset, and a structured output format suitable for board reporting, investor decks, and strategic reviews.

```
         ┌──────────────────────────────────────────────────────────┐
         │               EXECUTIVE INTELLIGENCE LAYER               │
         │                                                          │
         │  [Executive Copilot]  [Board Copilot]  [Strategy Copilot]│
         │  [Financial Copilot]                  [Risk Copilot]     │
         └────────────────────────┬─────────────────────────────────┘
                                  │
                        ┌─────────▼─────────┐
                        │   KPI Engine       │
                        │   Revenue Forecast │
                        │   Risk Engine      │
                        └───────────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              ▼                   ▼                   ▼
        [Analytics DB]     [Billing Ledger]    [Agent Activity]
        [ClickHouse]       [Stripe Events]     [Decision Logs]
```

---

## 2. Copilot Registry

### 2.1 Executive Copilot

**Mission**: Serve the CEO/COO with a real-time pulse on the business — answering "How are we doing?" with depth, context, and forward-looking signals.

**Capabilities**:
- KPI Analysis: Revenue, ARR, NRR, Churn, CAC, LTV, DAU/MAU, NPS
- Revenue Forecasting: 30/60/90-day projections using ARIMA + LLM synthesis
- Anomaly Detection: Flags metric deviations >2σ from 30-day moving average
- Peer Benchmarking: Compares metrics against industry benchmarks
- Executive Brief Generation: Weekly 1-page summaries with trend arrows

**Tools**:
- `query_kpi_dashboard()` — fetches all KPIs from ClickHouse + Billing
- `run_revenue_forecast()` — invokes ARIMA model or GPT-4o-based projection
- `detect_anomalies()` — statistical deviation scanner
- `generate_executive_brief()` — structured LLM output (Markdown → PDF)

**Memory**:
- **STM**: Last 7-day KPI context (Redis, TTL 24h)
- **LTM**: Historical executive briefs (PostgreSQL, 2-year retention)
- **Tenant**: Platform-wide aggregate (no tenant boundary crossed)

**Output Format**:
```json
{
  "brief_id": "exec_brief_20260606",
  "generated_at": "2026-06-06T00:00:00Z",
  "period": "2026-05-30 to 2026-06-06",
  "headline_metrics": {
    "arr": { "value": 4200000, "delta_7d": "+3.2%", "trend": "UP" },
    "churn_rate": { "value": 0.023, "delta_7d": "-0.3%", "trend": "DOWN_GOOD" },
    "nrr": { "value": 1.14, "delta_7d": "+0.02", "trend": "UP" }
  },
  "ai_insights": [
    "Churn decreased by 0.3% — retention agent interventions contributed ~40% of this improvement.",
    "Revenue from expansion exceeded new logo revenue for the first time (NRR > 1.10)."
  ],
  "risks": ["Q3 expansion pipeline concentration in 3 accounts — 18% revenue at risk."],
  "recommendations": ["Diversify pipeline; activate expansion agent on 8 dormant enterprise accounts."]
}
```

---

### 2.2 Board Copilot

**Mission**: Prepare board-ready materials: meeting decks, resolutions, committee briefs, and quarterly reviews.

**Capabilities**:
- Quarterly Board Report Generation (narrative + data)
- Committee Package Preparation (Audit, Risk, Comp, AI, Strategy)
- Resolution Drafting
- Strategic KPI Scorecards (Red/Amber/Green status)
- Investor-Ready Metrics (ARR Bridge, Rule of 40, Burn Multiple)

**Tools**:
- `generate_board_deck()` — structured Markdown → PPTX/PDF pipeline
- `compute_investor_metrics()` — Rule of 40, Burn Multiple, ARR Bridge
- `rag_query_board_history()` — retrieves precedents from past board minutes
- `draft_resolution()` — LLM-assisted resolution language

**Output Format**: Structured JSON + Markdown → converted to board deck template

---

### 2.3 Strategy Copilot

**Mission**: Support the CPO and leadership team with competitive intelligence, strategic option modeling, and market opportunity analysis.

**Capabilities**:
- Competitive Landscape Analysis (web-scraped + LLM-synthesized)
- Market Opportunity Sizing (TAM/SAM/SOM)
- Strategic Option Evaluation (decision matrix with scoring)
- OKR Review and Alignment Check
- Build vs Buy vs Partner Recommendations

**Tools**:
- `analyze_competitive_landscape(sector)` — RAG + web search synthesis
- `size_market_opportunity(segment)` — top-down + bottom-up modeling
- `evaluate_strategic_options(options[])` — weighted decision matrix
- `review_okr_alignment()` — checks product roadmap vs stated OKRs

---

### 2.4 Financial Copilot

**Mission**: Serve the CFO and Finance team with deep financial analysis, cash flow modeling, and capital allocation intelligence.

**Capabilities**:
- P&L Analysis (actual vs budget vs forecast)
- Cash Runway Calculation
- Unit Economics Analysis (CAC Payback, LTV:CAC, Gross Margin by segment)
- Revenue Attribution (by channel, agent type, tenant tier)
- Capital Allocation Recommendations

**Tools**:
- `analyze_pnl(period)` — fetches billing ledger + cost data
- `calculate_runway(burn_rate, cash_balance)` — runway in months
- `compute_unit_economics(segment)` — CAC Payback, LTV:CAC
- `generate_financial_narrative()` — LLM-generated CFO commentary

**Key Formulas**:
```
CAC = total_sales_marketing_cost / new_customers_acquired
LTV = ARPU × gross_margin_rate / churn_rate
LTV:CAC Ratio = LTV / CAC (target: >3.0)
CAC Payback Period = CAC / (ARPU × gross_margin_rate) (target: <12 months)
Rule of 40 = ARR_growth_rate + FCF_margin (target: >40)
Burn Multiple = net_burn / net_new_ARR (target: <1.0)
```

---

### 2.5 Risk Copilot

**Mission**: Provide the CRO, Board Risk Committee, and CEO with probabilistic risk forecasting, scenario modeling, and early warning signals.

**Capabilities**:
- Risk Registry Maintenance (automated risk identification + scoring)
- Probabilistic Risk Forecasting (Monte Carlo scenarios)
- Early Warning Signal Detection (leading indicators of risks)
- Concentration Risk Analysis (tenant, revenue, geography)
- Regulatory Compliance Risk Tracking

**Tools**:
- `scan_risk_registry()` — queries all domain agents for risk signals
- `run_monte_carlo(risk_factors[], simulations=10000)` — probabilistic outcomes
- `detect_concentration_risks()` — revenue/tenant concentration analysis
- `check_compliance_posture()` — regulatory adherence snapshot

**Risk Score Formula**:
```
RiskScore = Σ (probability_i × impact_i × velocity_i) / normalization_factor
Where:
  probability: 0.0–1.0 (likelihood in next 90 days)
  impact: 1–5 scale (1=minimal, 5=existential)
  velocity: 1–3 scale (1=slow, 3=fast-moving)
Target: Overall RiskScore < 0.15 (Low Risk Zone)
```

---

## 3. KPI Engine Specification

### 3.1 KPI Taxonomy

#### Business KPIs (Real-time)
| KPI | Source | Refresh | Formula |
|-----|--------|---------|---------|
| ARR | Billing Ledger | 1h | `SUM(mrr) * 12` |
| MRR | Billing Ledger | 1h | `SUM(active_subscriptions.monthly_amount)` |
| NRR | Billing Ledger | 24h | `(ending_arr - new_arr) / beginning_arr` |
| Churn Rate | Billing Ledger | 24h | `churned_mrr / beginning_mrr` |
| CAC | Billing + CRM | 7d | `total_acq_cost / new_customers` |
| LTV | Billing + AI | 7d | `ARPU × GM / churn_rate` |
| DAU | Analytics | 1h | `COUNTD(user_id) WHERE date = today` |
| MAU | Analytics | 24h | `COUNTD(user_id) WHERE date >= today - 30` |
| DAU/MAU | Derived | 1h | `DAU / MAU` |
| NPS | Survey | 30d | `(%Promoters - %Detractors)` |

#### Autonomy KPIs (Phase AU specific)
| KPI | Formula | Target |
|-----|---------|--------|
| Autonomy Score | `(autonomous_decisions / total_decisions) × 100` | >60% |
| Agent Utilization | `(agent_task_hours / total_ops_hours) × 100` | >40% |
| Automation Rate | `(auto_resolved_tasks / total_tasks) × 100` | >70% |
| Revenue Impact | `Δ ARR attributed to agent recommendations` | >$500K/month |
| Cost Savings | `ops_cost_before_agents - ops_cost_after_agents` | >$50K/month |
| Resolution Rate | `(auto_resolved_tickets / total_tickets) × 100` | >65% |
| Trust Score | `AVG(tenant_trust_scores)` | >0.85 |
| Risk Score | `weighted_platform_risk_index` | <0.15 |

### 3.2 KPI Computation Pipeline

```
[Source Events] → [ClickHouse Aggregation] → [KPI Engine] → [Redis Cache]
                                                                     │
                                              [Executive Dashboard] ←┘
                                              [Board Reports]
                                              [Executive Copilot]
```

---

## 4. Revenue Forecasting Model

### 4.1 Model Architecture

**Dual-Model Ensemble**:
1. **Statistical Layer**: ARIMA(2,1,2) on MRR time series (last 24 months)
2. **Intelligence Layer**: GPT-4o with structured business context (pipeline, churn signals, agent recommendations)
3. **Ensemble**: `forecast = 0.6 × arima_forecast + 0.4 × llm_forecast`

### 4.2 Forecast Horizons
- **30-day**: High confidence (σ ≤ 5%), used for cash management
- **60-day**: Medium confidence (σ ≤ 12%), used for resource planning
- **90-day**: Strategic confidence (σ ≤ 20%), used for board reporting

### 4.3 Input Signals
```json
{
  "historical_mrr": [...],
  "pipeline_arr": 850000,
  "avg_sales_cycle_days": 45,
  "churn_risk_signals": 3,
  "expansion_agent_opportunities": 12,
  "seasonal_adjustments": { "Q3": -0.05, "Q4": +0.12 }
}
```

---

## 5. Service Contracts

### 5.1 Executive Copilot Service

```typescript
interface ExecutiveCopilotService {
  generateExecutiveBrief(period: DateRange): Promise<ExecutiveBrief>;
  queryKPIs(metrics: KPIName[]): Promise<KPISnapshot>;
  detectAnomalies(threshold?: number): Promise<AnomalyAlert[]>;
  getRecommendations(context: BusinessContext): Promise<Recommendation[]>;
}

interface ExecutiveBrief {
  brief_id: string;
  generated_at: string;
  period: DateRange;
  headline_metrics: Record<KPIName, MetricValue>;
  ai_insights: string[];
  risks: string[];
  recommendations: string[];
  autonomy_snapshot: AutonomySnapshot;
}
```

### 5.2 KPI Engine Service

```typescript
interface KPIEngineService {
  computeKPI(name: KPIName, period?: DateRange): Promise<KPIResult>;
  computeAllKPIs(): Promise<KPIDashboard>;
  getKPITrend(name: KPIName, lookback: number): Promise<TrendData>;
  detectKPIAnomalies(): Promise<AnomalyAlert[]>;
}
```

### 5.3 Revenue Forecast Service

```typescript
interface RevenueForecastService {
  forecast(horizon: 30 | 60 | 90): Promise<RevenueForecast>;
  getConfidenceInterval(horizon: number): Promise<ConfidenceInterval>;
  explainForecast(forecast_id: string): Promise<ForecastExplanation>;
}
```

---

## 6. Integration Points

| Integration | Method | Data |
|-------------|--------|------|
| Billing Ledger | Supabase direct query | MRR, ARR, Churn |
| ClickHouse | REST API | DAU, MAU, Events |
| Agent Activity | `autonomous.agent_activity` table | Utilization, Resolution |
| Decision Engine | Event subscription | Decision counts |
| OpenAI API | LLM Gateway (existing) | Narrative generation |
| Risk Engine | Service-to-service | Risk scores |

---

## 7. Autonomy Level: AI Recommended

All executive intelligence outputs are:
- **Generated autonomously** by the copilot agents
- **Presented as recommendations** to the executive consumer
- **Logged** in `decision_logs` with `autonomy_level = 'AI_RECOMMENDED'`
- **Human-approved** before any action is taken on recommendations

Escalation to `AGENT_APPROVED` requires explicit governance vote from Board AI Committee.
