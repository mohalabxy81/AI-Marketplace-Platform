# Spec 50 — STEP AU.4: Marketplace Autonomy

> **Phase**: AU.4 | **Scope**: Listing · Discovery · Matching · Recommendation · Trust · Fraud Agents

---

## 1. Listing Agent

**Mission**: Automate the listing lifecycle — from ingestion and enrichment to publishing, optimization, and archival.

**Autonomous Actions**:
- `AUTONOMOUS_EXECUTION`: Auto-tag listings, generate embeddings, enrich metadata
- `AGENT_APPROVED`: Auto-publish listings that pass all moderation checks
- `AI_RECOMMENDED`: Suggest listing price adjustments, recommend category changes
- `HUMAN_DECISION`: Permanent removal of established listings

**Listing Enrichment Pipeline**:
```
[Raw Listing] → [LLM Enrichment] → [Tag Generation] → [Embedding Computation]
     → [Quality Score] → [Trust Check] → [Auto-publish or Queue for Review]
```

**Listing Quality Score**:
```
QualityScore = (
  0.25 × title_clarity_score +
  0.20 × description_completeness +
  0.20 × media_quality_score +
  0.15 × pricing_market_alignment +
  0.10 × category_accuracy +
  0.10 × seller_trust_score
)
Auto-publish threshold: QualityScore > 0.75 AND trust_check_passed = true
```

---

## 2. Discovery Agent

**Mission**: Continuously optimize the discovery infrastructure — index freshness, ranking calibration, and search quality.

**Responsibilities**:
- HNSW Index Health Monitoring (rebuild triggers, staleness detection)
- Search Quality Evaluation (NDCG, MRR metrics)
- Query Expansion (synonym generation, intent disambiguation)
- Zero-result Query Analysis and Resolution
- A/B Test Orchestration for ranking changes

**Index Health Rules**:
```
TRIGGER index_rebuild WHEN:
  - staleness_rate > 5%  (new listings not indexed within 5 min)
  - ndcg_score < 0.72    (discovery quality degradation)
  - zero_result_rate > 3% (search failures)
```

**Search Quality Dashboard KPIs**:
| Metric | Formula | Target |
|--------|---------|--------|
| NDCG@10 | Normalized Discounted Cumulative Gain | >0.75 |
| MRR | Mean Reciprocal Rank | >0.65 |
| Zero-Result Rate | `zero_results / total_queries` | <2% |
| P50 Latency | Median search response time | <30ms |
| P99 Latency | 99th percentile latency | <150ms |

---

## 3. Matching Agent

**Mission**: Execute autonomous buyer-seller matching, connecting demand signals with the most relevant supply.

**Matching Algorithm**:
```
Stage 1: Intent Extraction
  query → LLM intent parser → { intent_vector, filters, constraints }

Stage 2: Candidate Retrieval (pgvector HNSW)
  intent_vector → cosine search → top 500 candidates

Stage 3: Multi-Signal Ranking
  Score = (
    0.35 × semantic_similarity +
    0.25 × trust_score_weight +
    0.20 × recency_weight +
    0.15 × engagement_rate +
    0.05 × sponsored_boost
  )

Stage 4: Personalization Layer
  final_score = stage3_score × user_preference_alignment_factor

Output: Ranked list of 10-25 matches
```

**Match Quality Tracking**:
```typescript
interface MatchQuality {
  match_id: string;
  query_id: string;
  listing_id: string;
  match_score: number;
  click_through: boolean;
  lead_conversion: boolean;
  time_to_click_ms: number;
}
```

---

## 4. Recommendation Agent

**Mission**: Deliver hyper-personalized recommendations across all discovery surfaces.

**Recommendation Surfaces**:
| Surface | Algorithm | Update Frequency |
|---------|-----------|-----------------|
| Homepage feed | User-item collaborative filter | Real-time |
| Similar listings | Item-item collaborative filter | 1h |
| "Also viewed" | Session-based recommendations | Real-time |
| Email digest | Long-term preference model | 24h |
| Re-engagement | Win-back interest model | 7d |

**Personalization Vector Update**:
```
V_user(t) = α × V_user(t-1) + (1-α) × V_item_interacted
Where α = 0.85 (decay factor, configurable per tenant)
Stored in: Redis key `tenant:{tid}:user:{uid}:preference_vector`
```

**Cold Start Strategy**:
- New user (<5 interactions): Popular items + category-based
- New item (<10 views): Content-based similarity to established items
- Transition: Hybrid blend with decay toward collaborative filter

---

## 5. Trust Agent

**Mission**: Maintain platform trust integrity through continuous monitoring, scoring, and enforcement.

**Trust Score Formula**:
```
TrustScore_tenant = (
  0.30 × listing_quality_score_avg +
  0.25 × transaction_success_rate +
  0.20 × review_sentiment_score +
  0.15 × response_time_score +
  0.10 × account_age_weight
)
Range: 0.0 (untrusted) to 1.0 (fully trusted)
Listing boost: TrustScore_tenant applied as ranking multiplier
```

**Trust Events**:
| Event | Trust Impact | Action |
|-------|-------------|--------|
| Successful transaction | +0.02 | Auto |
| 5-star review received | +0.01 | Auto |
| Dispute filed | -0.05 | Auto + Review Queue |
| DMCA/IP complaint | -0.15 | Suspend + Human Review |
| Fraud signal detected | Score reset to 0.1 | Immediate suspend |

**Decision Boundary**:
- Trust score adjustment: `AUTONOMOUS_EXECUTION`
- Warning notification to tenant: `AGENT_APPROVED`
- Temporary suspension: `AI_RECOMMENDED` (Ops team review)
- Permanent ban: `HUMAN_DECISION`

---

## 6. Fraud Agent

**Mission**: Detect, prevent, and respond to fraudulent behavior across the marketplace in real time.

**Detection Signals**:
```typescript
interface FraudSignal {
  // Account signals
  account_age_days: number;
  ip_reputation_score: number;
  device_fingerprint_anomaly: boolean;
  rapid_account_creation: boolean;

  // Behavioral signals
  listing_velocity: number;           // listings/hour
  price_spike_percentage: number;     // sudden price change %
  review_velocity: number;            // reviews received/day
  click_pattern_anomaly: boolean;     // bot-like click patterns

  // Financial signals
  payment_method_risk: number;
  chargeback_history: number;
  refund_rate: number;
}
```

**Fraud Risk Score**:
```
FraudScore = ensemble(
  random_forest(behavioral_features),
  isolation_forest(anomaly_detection),
  rule_based_flags(hard_rules)
)
Threshold: FraudScore > 0.70 → Immediate quarantine
```

**Hard Rules (Instant Action)**:
- 3+ chargebacks in 30 days → Account freeze
- IP matches known fraud network → Block + alert
- Listing identical to DMCA-flagged content → Auto-quarantine
- Payment velocity >$50K in 24h from new account → Freeze + review

---

## 7. Marketplace Autonomy KPIs

| Metric | Formula | Target |
|--------|---------|--------|
| Auto-Moderation Rate | `auto_approved / total_listings` | >80% |
| Match Quality Score | `avg(lead_conversion_per_match)` | >12% |
| Recommendation CTR | `rec_clicks / rec_impressions` | >8% |
| Discovery Latency P99 | search response time 99th percentile | <150ms |
| Fraud Detection Rate | `fraud_caught / total_fraud` | >92% |
| False Positive Rate | `legit_flagged / total_flagged` | <5% |
| Trust Score Average | `avg(tenant_trust_scores)` | >0.80 |
