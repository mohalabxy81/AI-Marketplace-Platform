# Spec 48 — STEP AU.2: Revenue Autonomy

> **Phase**: AU.2 (Autonomous Enterprise)
> **Status**: Active
> **Scope**: Revenue Agent · Pricing Agent · Subscription Optimization Agent · Expansion Agent · Retention Agent
> **Autonomy Level**: AI Recommended (default) → Agent Approved (on policy unlock)

---

## 1. Executive Summary

The Revenue Autonomy layer deploys five specialized revenue agents that continuously monitor, analyze, and act on revenue signals. Together they form a closed-loop revenue management system: acquisition, expansion, pricing optimization, subscription conversion, and churn prevention.

```
         ┌──────────────────────────────────────────────────────────┐
         │                   REVENUE AUTONOMY LAYER                 │
         │                                                          │
         │  [Revenue Agent]  [Pricing Agent]  [Subscription Agent]  │
         │  [Expansion Agent]               [Retention Agent]       │
         └──────────────────────┬───────────────────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   Decision Engine     │
                    │  (AI_RECOMMENDED)     │
                    └───────────────────────┘
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
       [Billing Ledger]  [Agent Activity]  [Executive Copilot]
```

---

## 2. Revenue Agent

**Mission**: Continuously optimize total platform revenue through cross-signal analysis and coordinated agent interventions.

**Responsibilities**:
- Aggregate revenue signals from all 4 sub-agents
- Prioritize revenue interventions by expected impact
- Report revenue attribution per agent action
- Emit `revenue.opportunity_detected` events to Decision Engine

**Decision Boundary**:
- Can recommend price changes (requires human approval at AI_RECOMMENDED)
- Can autonomously trigger expansion outreach sequences (AGENT_APPROVED after policy gate)
- Cannot modify billing contracts without CFO approval

**Revenue Attribution Model**:
```
ΔRevenue_attributed = Σ(action_outcomes where agent_id = revenue_agent)
Attribution confidence = cosine_similarity(action_timestamp, mrr_change_timestamp)
```

---

## 3. Pricing Agent

**Mission**: Maintain optimal pricing across all tenant tiers, dynamically adjusting based on competitive signals, willingness-to-pay data, and market positioning.

**Capabilities**:
- Real-time price sensitivity analysis (via A/B test data)
- Competitive price benchmarking (web-scraped + LLM-synthesized)
- Plan tier optimization (feature gating recommendations)
- Usage-based pricing recommendations (overage thresholds)
- Promotional offer generation (time-limited discounts)

**Pricing Optimization Formula**:
```
OptimalPrice = argmax(price) [ expected_conversion(price) × price × (1 - churn_elasticity(price)) ]
Where:
  expected_conversion = logistic_model(price, competitor_prices, features)
  churn_elasticity = ∂churn_rate / ∂price_increase (measured from A/B tests)
```

**Decision Boundary**:
- Price changes ≤ 5%: `AGENT_APPROVED` (autonomous)
- Price changes 5–15%: `AI_RECOMMENDED` (CFO reviews)
- Price changes >15%: `HUMAN_DECISION` (Board approval)

**Tools**:
```typescript
tools: [
  'query_current_pricing()',
  'fetch_competitor_prices()',
  'run_price_elasticity_model(segment, price_range)',
  'compute_willingness_to_pay(cohort)',
  'generate_pricing_recommendation()',
  'simulate_price_change_impact(new_price)'
]
```

---

## 4. Subscription Optimization Agent

**Mission**: Maximize subscription value by identifying plan-fit mismatches, upgrade opportunities, and downgrade risks.

**Capabilities**:
- Usage vs Plan Gap Analysis (over-provisioned / under-provisioned tenants)
- Upgrade Trigger Detection (usage approaching plan limits)
- Downgrade Risk Scoring (tenants with consistently low utilization)
- Annual vs Monthly Conversion (identify monthly payers ready to commit annually)
- Trial Conversion Optimization (personalized trial-to-paid nudges)

**Key Signals**:
```typescript
interface SubscriptionSignal {
  tenant_id: string;
  current_plan: PlanTier;
  usage_percentile: number;        // 0–100, usage vs plan limit
  feature_adoption_score: number;  // 0–1, features used / features available
  billing_frequency: 'monthly' | 'annual';
  mrr: number;
  months_on_plan: number;
  last_login_days_ago: number;
  support_ticket_count_30d: number;
}
```

**Intervention Thresholds**:
| Signal | Threshold | Recommended Action |
|--------|-----------|-------------------|
| `usage_percentile > 85` | Plan limit approaching | Proactive upgrade nudge |
| `feature_adoption_score < 0.20` | Low feature adoption | Success agent intervention |
| `usage_percentile < 15 AND months_on_plan > 3` | Chronic underuse | Downgrade risk flag |
| `billing_frequency = monthly AND months_on_plan > 6` | Annual ready | Annual offer |

---

## 5. Expansion Agent

**Mission**: Identify and execute revenue expansion opportunities within the existing customer base (land-and-expand).

**Capabilities**:
- Cross-sell Signal Detection (usage patterns indicating adjacent product need)
- Upsell Opportunity Scoring (readiness for higher tier)
- Account Expansion Sequencing (multi-touch playbooks)
- Whitespace Analysis (features not yet adopted by account)
- Executive Sponsor Identification (decision-maker mapping)

**Expansion Score Formula**:
```
ExpansionScore = (
  0.30 × usage_momentum_score +    // Usage growing >10%/month
  0.25 × feature_adoption_score +   // Actively using core features
  0.20 × support_health_score +     // Low ticket volume, satisfied
  0.15 × tenure_score +             // >6 months on platform
  0.10 × payment_reliability_score  // No late payments
)
Target: ExpansionScore > 0.70 → Activate expansion sequence
```

**Decision Boundary**:
- Sending expansion email sequences: `AGENT_APPROVED`
- Offering custom pricing: `AI_RECOMMENDED` (Sales approval)
- Enterprise contract modifications: `HUMAN_DECISION`

---

## 6. Retention Agent

**Mission**: Predict and prevent churn through early intervention, health scoring, and personalized save campaigns.

**Capabilities**:
- Real-time Churn Risk Scoring (updated every 24h per tenant)
- Leading Indicator Detection (30-day early warning signals)
- Automated Save Campaigns (personalized intervention sequences)
- Win-back Sequences (recently churned accounts)
- Churn Reason Analysis (exit survey + behavioral signals)

**Churn Risk Model**:
```
ChurnRisk = sigmoid(
  β₀ +
  β₁ × days_since_last_login +
  β₂ × support_tickets_unresolved +
  β₃ × usage_decline_30d +
  β₄ × payment_failure_count +
  β₅ × feature_adoption_score (negative weight) +
  β₆ × expansion_events_30d (negative weight)
)

Risk Tiers:
  LOW:    ChurnRisk < 0.20
  MEDIUM: 0.20 ≤ ChurnRisk < 0.50
  HIGH:   0.50 ≤ ChurnRisk < 0.75
  CRITICAL: ChurnRisk ≥ 0.75
```

**Intervention Ladder**:
| Risk Tier | Autonomous Action | Escalation |
|-----------|------------------|------------|
| MEDIUM | Email health check, in-app tooltip | Customer Success Agent |
| HIGH | Personalized outreach sequence, free consultation offer | CSM + Account Exec |
| CRITICAL | Executive sponsor outreach, emergency save offer | VP Customer Success |

---

## 7. Service Contracts

```typescript
// Revenue Agent
interface RevenueAgentService {
  scanRevenueOpportunities(): Promise<RevenueOpportunity[]>;
  getRevenueAttribution(period: DateRange): Promise<RevenueAttribution>;
  coordinateInterventions(): Promise<InterventionPlan>;
}

// Pricing Agent
interface PricingAgentService {
  analyzePricingSensitivity(segment: TenantSegment): Promise<PricingAnalysis>;
  getCompetitivePricing(): Promise<CompetitorPriceData[]>;
  recommendPriceChange(tier: PlanTier): Promise<PricingRecommendation>;
  simulatePriceImpact(newPrice: number): Promise<ImpactSimulation>;
}

// Subscription Optimization Agent
interface SubscriptionOptimizationAgentService {
  analyzeSubscriptionHealth(): Promise<SubscriptionHealthReport>;
  getUpgradeOpportunities(): Promise<UpgradeLead[]>;
  getDowngradeRisks(): Promise<DowngradeRisk[]>;
  triggerUpgradeNudge(tenant_id: string): Promise<NudgeResult>;
}

// Expansion Agent
interface ExpansionAgentService {
  scoreExpansionOpportunities(): Promise<ExpansionLead[]>;
  getWhitespaceAnalysis(tenant_id: string): Promise<WhitespaceReport>;
  triggerExpansionSequence(tenant_id: string): Promise<SequenceResult>;
}

// Retention Agent
interface RetentionAgentService {
  computeChurnRisk(tenant_id: string): Promise<ChurnRiskScore>;
  getAllChurnRisks(): Promise<ChurnRiskReport>;
  triggerSaveCampaign(tenant_id: string, risk_tier: RiskTier): Promise<CampaignResult>;
  getRetentionMetrics(): Promise<RetentionMetrics>;
}
```

---

## 8. Event Taxonomy

| Event | Producer | Consumers |
|-------|----------|-----------|
| `revenue.opportunity_detected` | Revenue Agent | Decision Engine, Executive Copilot |
| `pricing.recommendation_ready` | Pricing Agent | Decision Engine, CFO Dashboard |
| `subscription.upgrade_opportunity` | Subscription Agent | Customer Success Agent, Email Service |
| `subscription.downgrade_risk` | Subscription Agent | Customer Success Agent, CSM |
| `expansion.lead_scored` | Expansion Agent | Sales CRM, Customer Success Agent |
| `retention.churn_risk_flagged` | Retention Agent | Customer Success Agent, Decision Engine |
| `retention.save_campaign_triggered` | Retention Agent | Email Service, Analytics |

---

## 9. Revenue Impact Tracking

All revenue agent actions are logged with expected and actual impact:

```sql
INSERT INTO autonomous.agent_activity (
  agent_id, action_type, target_tenant_id,
  expected_impact_usd, actual_impact_usd,
  autonomy_level, outcome_status, created_at
) VALUES (...);
```

Monthly revenue attribution report:
- Total revenue influenced by agents
- Per-agent contribution breakdown
- Conversion rate of agent recommendations
- ROI per agent (revenue impact / compute cost)
