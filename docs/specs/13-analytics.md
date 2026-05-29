# SPEC 13 — ANALYTICS & REPORTING SPECIFICATION

> **Basis**: [PLANNER.md](file:///home/mohal665544/pr1/PLANNER.md) — Platform Master Architecture  
> **Status**: Execution-Ready v3 (Maximum Depth)  
> **Version**: 3.0.0  
> **Last Updated**: 2026-05-30  
> **Owned By**: Analytics & Intelligence Team

---

## 1. Analytics Architecture Overview

The platform's analytics infrastructure is a **multi-layer, dual-path system** designed to serve three distinct stakeholder tiers simultaneously — without allowing any tier's query load to impact the operational performance of the others.

### 1.1 Stakeholder Tiers

| Tier | Stakeholders | Latency Target | Query Complexity |
|:-----|:-------------|:---------------|:-----------------|
| **Tenant Dashboards** | Tenant Admins, Creators | < 200ms | Pre-aggregated materialized views |
| **Platform Intelligence** | Discovery Engine, Trust Engine | < 50ms | Pre-computed, Redis-cached signals |
| **Platform Administration** | Super Admins, Finance, Product | < 5s | Ad-hoc OLAP on ClickHouse |

### 1.2 Dual-Path Ingestion Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        EVENT PRODUCERS                              │
│  Client Apps  │  API Gateway  │  Discovery Engine  │  AI Gateway   │
└───────┬───────┴───────┬───────┴────────┬───────────┴───────┬───────┘
        │               │                │                   │
        ▼               ▼                ▼                   ▼
┌───────────────────────────────────────────────────────────────────┐
│                  INGESTION API (POST /analytics/events)           │
│  - JWT + Anonymous Session validation                             │
│  - Server-side enrichment (geo, tenant_id, timestamp)             │
│  - Consent gate (drop non-consented analytics events)             │
│  - Batching into 500-event chunks before Kafka publish            │
└──────────────────────────────┬────────────────────────────────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────┐
│                        KAFKA EVENT MESH                          │
│  Topics:                                                         │
│  - analytics.clickstream          (Partition key: tenant_id)     │
│  - analytics.ai_usage             (Partition key: tenant_id)     │
│  - analytics.discovery_events     (Partition key: feed_id)       │
│  - analytics.billing_events       (Partition key: tenant_id)     │
│  - analytics.trust_events         (Partition key: actor_id)      │
└──────────────────┬───────────────────────────┬───────────────────┘
                   │                           │
        ┌──────────▼──────────┐     ┌──────────▼──────────┐
        │    FAST PATH        │     │    SLOW PATH         │
        │  (Apache Flink /    │     │  (Kafka → ClickHouse │
        │   Kafka Streams)    │     │   Kafka Engine)      │
        │                     │     │                      │
        │  - 1-min windows    │     │  - Columnar append   │
        │  - Keyed aggregates │     │  - Partition daily   │
        │  - Redis push       │     │  - Materialized views│
        └──────────┬──────────┘     └──────────┬───────────┘
                   │                           │
                   ▼                           ▼
        ┌──────────────────┐       ┌──────────────────────┐
        │  REALTIME DASH   │       │   DEEP ANALYTICS DB  │
        │  (Redis + WS)    │       │   (ClickHouse)        │
        └──────────────────┘       └──────────────────────┘
```

---

## 2. Event Ingestion Specification

### 2.1 Clickstream Ingestion API Contract

```
Endpoint:  POST /api/v1/analytics/events
Auth:      Bearer JWT (authenticated) OR X-Session-ID: UUID (anonymous)
Rate:      600 requests/min per client IP | 10,000/min per tenant
Body MIME: application/json
```

**Request Schema:**
```
{
  "session_id":        UUID (required)
  "client_timestamp":  ISO-8601 (required, used for clock-skew detection)
  "device_context": {
    "user_agent":          string (required)
    "screen_resolution":   "WxH"
    "platform":            "web" | "ios" | "android"
    "connection_type":     "wifi" | "cellular" | "ethernet" | "unknown"
    "viewport":            { "width": number, "height": number }
    "language":            "en-US"
  }
  "consent": {
    "analytics":  boolean (required — if false, event is dropped at gate)
    "marketing":  boolean
  }
  "events": [
    {
      "event_id":          UUID (client-generated idempotency key)
      "event_type":        enum — see Section 2.2
      "occurred_at":       ISO-8601
      "entity_id":         UUID | null
      "entity_type":       "LISTING" | "CATEGORY" | "AGENT" | "FEED" | null
      "page_url":          string (max 2048 chars)
      "referrer":          string | null
      "properties":        {
        "position_in_feed":  integer (0-indexed)
        "is_sponsored":      boolean
        "feed_id":           UUID
        "search_query":      string | null
        "view_duration_ms":  integer | null
        "scroll_depth_pct":  integer (0-100) | null
        "interaction_type":  "tap" | "click" | "keyboard" | null
        "revenue_amount":    number | null
        "currency_code":     "USD" | "EUR" | ... | null
      }
    }
  ]
}
```

**Response Schema:**
```
HTTP 202 Accepted
{
  "status":         "accepted"
  "events_queued":  integer
  "session_id":     UUID
  "server_timestamp": ISO-8601
}

HTTP 400 Bad Request — Schema validation failure
HTTP 429 Too Many Requests — Rate limit exceeded
```

### 2.2 Canonical Event Type Taxonomy

| Event Type | Category | Triggers Intelligence Feed? | Triggers Trust Scan? |
|:-----------|:---------|:---------------------------|:---------------------|
| `IMPRESSION` | Engagement | Yes (weak signal) | No |
| `VIEW` | Engagement | Yes (view_duration > 3s = strong signal) | No |
| `CLICK` | Engagement | Yes (strong signal) | No |
| `HOVER` | Engagement | Yes (hover > 1s = weak signal) | No |
| `SCROLL_DEPTH` | Engagement | Yes (> 50% = moderate signal) | No |
| `SEARCH` | Intent | Yes (query → embedding → preference update) | No |
| `ADD_TO_FAVORITES` | Intent | Yes (strong signal) | No |
| `SHARE` | Intent | Yes (strong signal) | No |
| `INQUIRY` | Conversion | Yes (strongest signal) | No |
| `PURCHASE` | Conversion | Yes (strongest signal) | No |
| `ABANDON_CART` | Negative | Yes (negative signal) | No |
| `REPORT_LISTING` | Trust | No | Yes |
| `PAGE_VIEW` | Navigation | No | No |
| `APP_OPEN` | Session | No | No |
| `SESSION_END` | Session | No | No |

### 2.3 Server-Side Event Enrichment Pipeline

Before publishing to Kafka, the Ingestion Service enriches each event with the following server-side context. This enrichment runs synchronously before the 202 response is returned:

| Field | Source | Description |
|:------|:-------|:------------|
| `server_timestamp` | System clock | Arrival time; used to detect client clock skew (> 30s skew = flag) |
| `geo_country` | MaxMind GeoLite2 | 2-letter ISO country code from hashed IP |
| `geo_region` | MaxMind GeoLite2 | Region/state code |
| `geo_city` | MaxMind GeoLite2 | City name |
| `ip_hash` | SHA-256(raw_ip + daily_salt) | Hashed for correlation without PII storage |
| `tenant_id` | JWT `app_metadata.tenant_id` | Never trusted from client payload |
| `user_id` | JWT `sub` | Never trusted from client payload |
| `is_bot` | Bot fingerprint heuristics | UA pattern + headless detection |
| `ab_variant_id` | Experimentation middleware | Active experiment variant for session |

---

## 3. Data Warehouse Architecture (ClickHouse)

### 3.1 Technology Selection Rationale

ClickHouse is selected as the primary OLAP engine for the following reasons:

| Requirement | ClickHouse Capability |
|:------------|:----------------------|
| Sub-100ms aggregations on 1B+ rows | Columnar storage + vectorized execution engine |
| Real-time ingestion via Kafka | Native Kafka Engine table integration |
| Tenant-level isolation | Partition pruning on `tenant_id` eliminates cross-tenant scans |
| Materialized views for pre-aggregation | AggregatingMergeTree + SummingMergeTree engines |
| Cost efficiency at scale | Excellent compression ratios (10:1 typical for event data) |

### 3.2 Master Schema: `analytics.clickstream_events`

```sql
CREATE TABLE analytics.clickstream_events
(
    -- Partitioning & Ordering Keys
    tenant_id           UUID,
    event_date          Date,           -- Materialized from event_time
    event_time          DateTime64(3, 'UTC'),

    -- Identity
    event_id            UUID,           -- Client idempotency key
    session_id          UUID,
    user_id             UUID,           -- Nullable for anonymous
    is_authenticated    Bool,

    -- Event Classification
    event_type          Enum8(
                            'IMPRESSION' = 1,
                            'VIEW'       = 2,
                            'CLICK'      = 3,
                            'HOVER'      = 4,
                            'SCROLL_DEPTH' = 5,
                            'SEARCH'     = 6,
                            'ADD_TO_FAVORITES' = 7,
                            'SHARE'      = 8,
                            'INQUIRY'    = 9,
                            'PURCHASE'   = 10,
                            'ABANDON_CART' = 11,
                            'REPORT_LISTING' = 12,
                            'PAGE_VIEW'  = 13,
                            'APP_OPEN'   = 14,
                            'SESSION_END' = 15
                        ),

    -- Entity Context
    entity_id           UUID,
    entity_type         LowCardinality(String),

    -- Engagement Signals
    view_duration_ms    UInt32 DEFAULT 0,
    scroll_depth_pct    UInt8  DEFAULT 0,
    position_in_feed    UInt16 DEFAULT 0,
    is_sponsored        Bool   DEFAULT false,
    feed_id             UUID,
    search_query        String DEFAULT '',

    -- Conversion Signals
    revenue_amount      Decimal(18, 4) DEFAULT 0,
    currency_code       FixedString(3),

    -- Device & Geo Context
    device_platform     LowCardinality(String),
    geo_country         FixedString(2),
    geo_region          String,
    geo_city            String,
    user_agent_family   LowCardinality(String),
    is_bot              Bool DEFAULT false,

    -- A/B Testing
    ab_variant_id       UUID,

    -- Audit
    server_timestamp    DateTime64(3, 'UTC'),
    ingest_latency_ms   UInt32           -- server_timestamp - event_time
)
ENGINE = MergeTree()
PARTITION BY (toYYYYMM(event_date), tenant_id)
ORDER BY (tenant_id, event_date, event_type, session_id, event_time)
SAMPLE BY cityHash64(session_id)
TTL event_date + INTERVAL 365 DAY
    DELETE
SETTINGS index_granularity = 8192;
```

### 3.3 Schema: `analytics.ai_usage_events`

```sql
CREATE TABLE analytics.ai_usage_events
(
    tenant_id           UUID,
    event_date          Date,
    event_time          DateTime64(3, 'UTC'),
    request_id          UUID,
    user_id             UUID,
    model_id            LowCardinality(String),
    provider            LowCardinality(String),
    operation_type      Enum8('CHAT'=1,'EMBEDDING'=2,'MODERATION'=3,'RERANK'=4),
    tokens_input        UInt32,
    tokens_output       UInt32,
    latency_ms          UInt32,
    cost_usd            Decimal(12, 8),
    cache_hit           Bool,
    was_fallback        Bool,
    quota_tier          LowCardinality(String),
    correlation_id      UUID
)
ENGINE = MergeTree()
PARTITION BY (toYYYYMM(event_date), tenant_id)
ORDER BY (tenant_id, event_date, model_id, event_time)
TTL event_date + INTERVAL 365 DAY DELETE;
```

### 3.4 Schema: `analytics.discovery_events`

```sql
CREATE TABLE analytics.discovery_events
(
    tenant_id               UUID,
    event_date              Date,
    event_time              DateTime64(3, 'UTC'),
    feed_id                 UUID,
    user_id                 UUID,
    request_type            Enum8('FEED'=1,'SEARCH'=2,'RECOMMEND'=3),
    stage1_candidates       UInt32,
    stage2_candidates       UInt32,
    stage3_candidates       UInt32,
    final_served            UInt16,
    stage1_latency_ms       UInt16,
    stage2_latency_ms       UInt16,
    stage3_latency_ms       UInt16,
    total_latency_ms        UInt16,
    vector_distance_p50     Float32,
    personalization_score   Float32,
    exploration_injection   Bool,
    ab_variant_id           UUID
)
ENGINE = MergeTree()
PARTITION BY (toYYYYMM(event_date))
ORDER BY (tenant_id, event_date, event_time)
TTL event_date + INTERVAL 180 DAY DELETE;
```

### 3.5 Materialized Views for Pre-Aggregation

**MV 1: Daily Listing Performance Aggregates**
```sql
CREATE MATERIALIZED VIEW analytics.mv_listing_daily
ENGINE = SummingMergeTree()
PARTITION BY (toYYYYMM(event_date))
ORDER BY (tenant_id, entity_id, event_date)
AS
SELECT
    tenant_id,
    entity_id                                    AS listing_id,
    toDate(event_time)                           AS event_date,
    countIf(event_type = 'IMPRESSION')           AS impressions,
    countIf(event_type = 'VIEW')                 AS views,
    countIf(event_type = 'CLICK')                AS clicks,
    countIf(event_type = 'ADD_TO_FAVORITES')     AS favorites,
    countIf(event_type = 'INQUIRY')              AS inquiries,
    countIf(event_type = 'PURCHASE')             AS conversions,
    sumIf(revenue_amount, event_type='PURCHASE') AS revenue,
    sum(view_duration_ms)                        AS total_view_duration_ms,
    uniqHLL12(user_id)                           AS unique_users,
    uniqHLL12(session_id)                        AS unique_sessions,
    countIf(is_sponsored = true)                 AS sponsored_impressions
FROM analytics.clickstream_events
WHERE entity_type = 'LISTING'
GROUP BY tenant_id, listing_id, event_date;
```

**MV 2: Hourly Tenant Activity Aggregates (Real-time Dashboard)**
```sql
CREATE MATERIALIZED VIEW analytics.mv_tenant_hourly
ENGINE = SummingMergeTree()
ORDER BY (tenant_id, event_hour)
AS
SELECT
    tenant_id,
    toStartOfHour(event_time)        AS event_hour,
    count()                          AS total_events,
    countIf(event_type = 'CLICK')    AS clicks,
    countIf(event_type = 'PURCHASE') AS conversions,
    uniqHLL12(user_id)               AS active_users,
    uniqHLL12(session_id)            AS active_sessions
FROM analytics.clickstream_events
WHERE is_bot = false
GROUP BY tenant_id, event_hour;
```

**MV 3: Discovery Engine Performance Aggregates**
```sql
CREATE MATERIALIZED VIEW analytics.mv_discovery_hourly
ENGINE = AggregatingMergeTree()
ORDER BY (tenant_id, event_hour, request_type)
AS
SELECT
    tenant_id,
    toStartOfHour(event_time)           AS event_hour,
    request_type,
    count()                             AS total_requests,
    avgState(total_latency_ms)          AS avg_latency,
    quantilesState(0.5, 0.95, 0.99)(total_latency_ms)  AS latency_quantiles,
    avgState(personalization_score)     AS avg_personalization,
    countIf(exploration_injection)      AS exploration_count
FROM analytics.discovery_events
GROUP BY tenant_id, event_hour, request_type;
```

---

## 4. Platform KPI Framework

### 4.1 Marketplace Health KPIs

| KPI | Calculation | Source | Cadence | Alerting Threshold |
|:----|:------------|:-------|:--------|:-------------------|
| **Gross Merchandise Value (GMV)** | `SUM(revenue_amount) WHERE event_type='PURCHASE'` | `mv_listing_daily` | Daily | Week-over-week decline > 20% |
| **Take Rate** | `Platform Fees / GMV * 100` | Billing + ClickHouse | Daily | Drop below 8% |
| **Active Listings Rate** | `Active Listings / Total Listings * 100` | PostgreSQL + ClickHouse | Hourly | Drop below 70% |
| **Marketplace CTR** | `SUM(clicks) / SUM(impressions) * 100` | `mv_listing_daily` | Daily | Drop below 2.5% |
| **Average Conversion Rate** | `SUM(conversions) / SUM(clicks) * 100` | `mv_listing_daily` | Daily | Drop below 1.5% |
| **Supply Diversity Index** | `Unique Category Count / Total Listings` | ClickHouse | Weekly | Below 0.15 |
| **Time-to-First-Listing** | Minutes from tenant signup to first listing publish | PostgreSQL event log | Weekly | Median > 30 min |
| **Listing Quality Score** | Composite: completeness + media + trust_score | Computed batch | Daily | Platform median < 65 |

### 4.2 Discovery & AI KPIs

| KPI | Calculation | Source | Cadence |
|:----|:------------|:-------|:--------|
| **Feed Relevance Score (FRS)** | Weighted sum: `(CTR * 0.4) + (CVR * 0.4) + (Favorites/Imp * 0.2)` | ClickHouse | Daily |
| **Discovery Personalization Lift** | CTR(personalized) / CTR(non-personalized) | A/B test data | Per experiment |
| **Semantic Cache Hit Rate** | Cache hits / Total AI requests | Redis + ClickHouse | Hourly |
| **Embedding Freshness** | `AVG(NOW() - last_embedding_updated_at)` | PostgreSQL | Daily |
| **Re-Ranking NDCG@10** | Normalized Discounted Cumulative Gain at position 10 | Offline evaluation pipeline | Weekly |
| **Exploration Injection Rate** | Exploration items / Total feed items | `mv_discovery_hourly` | Daily |
| **AI Token Cost per DAU** | Total token cost / Daily Active Users | Billing + ClickHouse | Daily |
| **Provider Fallback Rate** | Fallback requests / Total AI requests | `ai_usage_events` | Hourly |

### 4.3 Revenue & Monetization KPIs

| KPI | Calculation | Source | Cadence |
|:----|:------------|:-------|:--------|
| **Monthly Recurring Revenue (MRR)** | Sum of active subscription values | Billing Ledger | Daily |
| **Annual Recurring Revenue (ARR)** | MRR × 12 | Calculated | Daily |
| **Net Revenue Retention (NRR)** | (Beginning MRR + Expansion - Churn - Contraction) / Beginning MRR | Billing cohort | Monthly |
| **Customer Acquisition Cost (CAC)** | Marketing spend / New paying tenants | Manual input + ClickHouse | Monthly |
| **Average Revenue Per User (ARPU)** | MRR / Active Tenants | Billing + ClickHouse | Monthly |
| **Churn Rate** | Cancelled tenants / Total tenants (30-day rolling) | Billing Ledger | Daily |
| **Expansion Revenue** | Upsell + Overage billing in period | Billing Ledger | Daily |
| **Sponsored Revenue** | Total CPC/CPM bid charges | Billing Ledger | Daily |

---

## 5. Funnel Analysis Specification

### 5.1 Primary Marketplace Conversion Funnel

The canonical marketplace funnel has 5 stages. Each stage is tracked at the `session_id` level to accurately count unique users progressing through each step.

```
Stage 1: IMPRESSION (Listing appears in viewport)
    ↓
Stage 2: VIEW (User spends > 3 seconds on listing)
    ↓
Stage 3: CLICK (User navigates to listing detail page)
    ↓
Stage 4: INQUIRY (User submits a contact/inquiry form)
    ↓
Stage 5: PURCHASE (Transaction completed)
```

**ClickHouse Funnel Query:**
```sql
SELECT
    level,
    count()                                             AS users_at_stage,
    round(count() / first_value(count()) OVER () * 100, 2) AS pct_from_top,
    round(count() / lag(count()) OVER (ORDER BY level) * 100, 2) AS pct_from_prev
FROM (
    SELECT
        session_id,
        windowFunnel(86400 /* 24-hour window */)(
            event_time,
            event_type = 'IMPRESSION',
            event_type = 'VIEW',
            event_type = 'CLICK',
            event_type = 'INQUIRY',
            event_type = 'PURCHASE'
        ) AS level
    FROM analytics.clickstream_events
    WHERE
        tenant_id = :tenant_id
        AND event_date BETWEEN :start_date AND :end_date
        AND entity_type = 'LISTING'
        AND is_bot = false
    GROUP BY session_id
)
WHERE level > 0
GROUP BY level
ORDER BY level;
```

### 5.2 AI Onboarding Funnel

Tracks the tenant journey from signup to first AI feature usage:

```
Stage 1: tenant.provisioned event
    ↓
Stage 2: First listing created
    ↓
Stage 3: First AI moderation scan completed
    ↓
Stage 4: First AI search query executed
    ↓
Stage 5: First AI token usage billing event
```

This funnel is computed in PostgreSQL using event timestamp joins across the `tenant_config`, `marketplace.listings`, `trust_registry`, and `billing_ledger` schemas.

---

## 6. Cohort & Retention Analysis

### 6.1 Cohort Definition

A **cohort** is defined by the `toStartOfMonth(signup_date)` of each tenant. All tenants who signed up in the same calendar month form a cohort.

### 6.2 Tenant Retention Cohort Query

```sql
-- Computes monthly retention rates for each tenant cohort
SELECT
    cohort_month,
    periods_since_signup,
    tenants_active,
    round(tenants_active / cohort_size * 100, 1)  AS retention_rate_pct
FROM (
    SELECT
        toStartOfMonth(signup_date)                AS cohort_month,
        dateDiff('month', signup_date, activity_month) AS periods_since_signup,
        uniqExact(tenant_id)                       AS tenants_active,
        any(cohort_size)                           AS cohort_size
    FROM (
        SELECT
            t.tenant_id,
            t.signup_date,
            a.activity_month
        FROM (
            SELECT tenant_id, min(event_date) AS signup_date
            FROM analytics.clickstream_events
            GROUP BY tenant_id
        ) t
        INNER JOIN (
            SELECT tenant_id, toStartOfMonth(event_date) AS activity_month
            FROM analytics.clickstream_events
            WHERE event_type IN ('CLICK', 'PURCHASE', 'INQUIRY')
            GROUP BY tenant_id, activity_month
        ) a ON t.tenant_id = a.tenant_id
    ) sub
    JOIN (
        SELECT toStartOfMonth(min(event_date)) AS cohort_month,
               uniqExact(tenant_id)             AS cohort_size
        FROM analytics.clickstream_events
        GROUP BY toStartOfMonth(min(event_date))
    ) cohort_info USING (cohort_month)
    GROUP BY cohort_month, periods_since_signup, cohort_size
)
ORDER BY cohort_month, periods_since_signup;
```

### 6.3 User Engagement Retention (DAU/MAU)

| Metric | Calculation | Target |
|:-------|:------------|:-------|
| **DAU** | Distinct `user_id` with any event on day D | Baseline |
| **MAU** | Distinct `user_id` with any event in 30 days | Baseline |
| **DAU/MAU Ratio (Stickiness)** | DAU / MAU | > 25% |
| **7-Day Retention** | Users active on Day 7 / Users active on Day 1 | > 40% |
| **30-Day Retention** | Users active on Day 30 / Users active on Day 1 | > 25% |

---

## 7. Lifetime Value (LTV) Model

### 7.1 LTV Calculation Methodology

The platform uses a **Discounted Cash Flow (DCF) LTV model** segmented by tenant subscription tier.

**Formula:**
```
LTV = ARPU_monthly × (1 / churn_rate_monthly) × gross_margin
```

Where:
- `ARPU_monthly` = Average Monthly Revenue Per Tenant (from billing ledger)
- `churn_rate_monthly` = Monthly churn rate (from billing cohort analysis)
- `gross_margin` = Platform gross margin after infrastructure costs

### 7.2 LTV Segmentation

| Segment | Churn Rate Target | Gross Margin Target | LTV Target |
|:--------|:------------------|:--------------------|:-----------|
| Starter Plan | < 8%/month | 65% | Compute dynamically |
| Growth Plan | < 4%/month | 75% | Compute dynamically |
| Enterprise Plan | < 1.5%/month | 82% | Compute dynamically |

### 7.3 LTV Data Pipeline

```
Source: billing_ledger (PostgreSQL)
    ↓
Daily ETL job (scheduled 06:00 UTC)
    ↓
ClickHouse: analytics.ltv_snapshots table
    ↓
API: GET /api/v1/platform/analytics/ltv?cohort_month=YYYY-MM
```

---

## 8. Attribution Model Specification

### 8.1 Attribution Model Selection

The platform supports **three attribution models** to accommodate different marketing and product analysis needs:

| Model | Description | Primary Use Case |
|:------|:------------|:-----------------|
| **First Touch** | 100% credit to first touchpoint in session | Awareness campaign analysis |
| **Last Touch** | 100% credit to final touchpoint before conversion | Performance marketing |
| **Linear** | Equal credit distributed across all touchpoints | Balanced attribution |

### 8.2 Attribution Data Structure

Attribution chains are tracked per `session_id` in ClickHouse:

```sql
CREATE TABLE analytics.attribution_chains
(
    tenant_id       UUID,
    event_date      Date,
    session_id      UUID,
    user_id         UUID,
    conversion_id   UUID,      -- References purchase event_id
    touchpoints     Array(Tuple(
                        event_type  LowCardinality(String),
                        entity_id   UUID,
                        occurred_at DateTime64(3),
                        source      LowCardinality(String)  -- organic | sponsored | direct
                    )),
    model           Enum8('FIRST_TOUCH'=1,'LAST_TOUCH'=2,'LINEAR'=3),
    attributed_to   UUID,      -- entity_id receiving attribution credit
    attribution_pct Float32    -- 0.0 to 1.0
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (tenant_id, event_date, session_id);
```

### 8.3 Sponsored vs. Organic Attribution

The `is_sponsored` flag on each click event enables platform-level analysis of:
- Revenue attributable to promoted listings vs. organic discovery
- ROI of sponsored placement for tenant advertisers
- Platform dependency risk on paid traffic channels

---

## 9. Discovery Analytics Specification

### 9.1 Ranking Decision Explainability Log

Every ranked feed output is logged in ClickHouse with full feature weights for post-hoc analysis:

```sql
CREATE TABLE analytics.ranking_explanations
(
    feed_id                 UUID,
    tenant_id               UUID,
    event_time              DateTime64(3),
    listing_id              UUID,
    final_rank              UInt8,
    vector_similarity       Float32,
    personalization_score   Float32,
    sponsored_boost_delta   Float32,
    trust_score_penalty     Float32,
    freshness_score         Float32,
    exploration_injected    Bool,
    final_score             Float32
)
ENGINE = MergeTree()
PARTITION BY toDate(event_time)
ORDER BY (feed_id, final_rank)
TTL toDate(event_time) + INTERVAL 30 DAY;
```

### 9.2 Discovery Quality Metrics

| Metric | Calculation | Source | Target |
|:-------|:------------|:-------|:-------|
| **Position Bias Correction** | Measure CTR at each position; normalize for bias | `mv_listing_daily` + position | Ongoing |
| **Fresh Listing Exposure Rate** | Impressions on listings < 7 days old / Total impressions | ClickHouse | > 15% |
| **Diversity Score (ILD)** | Average pairwise distance of embeddings in feed | Discovery engine log | > 0.35 |
| **Coverage** | Unique listings served / Total active listings | Discovery log | > 80% / week |
| **Serendipity Rate** | Clicks on out-of-preference items / Total clicks | ClickHouse | 8-12% |

---

## 10. Tenant Analytics API Specification

### 10.1 Dashboard Summary Endpoint

```
GET /api/v1/analytics/summary
Auth: Bearer JWT (tenant scope)
Params:
  - date_from: YYYY-MM-DD (required)
  - date_to:   YYYY-MM-DD (required, max range: 365 days)
  - listing_id: UUID (optional filter)
  - granularity: "day" | "week" | "month" (default: "day")

Response 200:
{
  "period": { "from": ..., "to": ... },
  "totals": {
    "impressions":   integer,
    "views":         integer,
    "clicks":        integer,
    "inquiries":     integer,
    "conversions":   integer,
    "revenue":       decimal,
    "unique_users":  integer
  },
  "rates": {
    "view_through_rate":  float,   // views / impressions
    "click_through_rate": float,   // clicks / impressions
    "inquiry_rate":       float,   // inquiries / clicks
    "conversion_rate":    float,   // conversions / inquiries
    "revenue_per_click":  float
  },
  "time_series": [
    {
      "date":         "YYYY-MM-DD",
      "impressions":  integer,
      "clicks":       integer,
      "conversions":  integer,
      "revenue":      decimal
    }
  ]
}
```

### 10.2 Listing Leaderboard Endpoint

```
GET /api/v1/analytics/listings/leaderboard
Auth: Bearer JWT (tenant scope)
Params:
  - metric: "impressions" | "clicks" | "conversions" | "revenue" | "ctr"
  - date_from: YYYY-MM-DD
  - date_to:   YYYY-MM-DD
  - limit:     integer (default: 10, max: 50)

Response 200:
{
  "ranked_listings": [
    {
      "rank":         integer,
      "listing_id":   UUID,
      "listing_title": string,
      "metric_value": number,
      "impressions":  integer,
      "clicks":       integer,
      "conversions":  integer,
      "revenue":      decimal,
      "ctr":          float
    }
  ]
}
```

---

## 11. Platform Administration Analytics

### 11.1 Platform-Wide Super Admin Metrics

Super Admins have access to cross-tenant aggregate metrics via the `governance` role. These queries bypass tenant RLS and operate on full ClickHouse datasets.

| Report | Description | Frequency |
|:-------|:------------|:----------|
| **Platform GMV Report** | Total gross transaction value across all tenants | Daily |
| **Top Tenants by Revenue** | Ranked list of tenants by MRR | Weekly |
| **AI Cost Attribution** | Per-tenant AI spend breakdown | Daily |
| **Fraud Signal Heatmap** | Geographic and temporal distribution of trust flags | Daily |
| **Discovery Engine Health** | P50/P95/P99 latency, cache hit rates, exploration rates | Hourly |
| **Content Velocity** | Listings created/day, approval rates, rejection rates | Daily |

---

## 12. Retention & Privacy Compliance

### 12.1 Data Retention Matrix

| Data Type | Storage Layer | Retention Period | Expiry Action |
|:----------|:--------------|:-----------------|:--------------|
| Raw Clickstream Events | Kafka | 7 days | Deleted by Kafka TTL |
| Enriched Events (individual) | ClickHouse | 365 days | TTL deletion |
| Aggregated Daily Stats | ClickHouse | 7 years | Archive to S3 Glacier |
| Attribution Chains | ClickHouse | 90 days | TTL deletion |
| Ranking Explanations | ClickHouse | 30 days | TTL deletion |
| AI Usage Events | ClickHouse | 365 days | TTL deletion |
| LTV Snapshots | ClickHouse | 3 years | Archive to S3 |
| PII-linked records | PostgreSQL | User lifetime | Anonymized on deletion |

### 12.2 GDPR / CCPA Compliance Mechanisms

**Right to be Forgotten:**
1. `DELETE /api/v1/users/{user_id}/data` request received.
2. Asynchronous job queued with 30-day execution window (grace period).
3. Job executes `ALTER TABLE analytics.clickstream_events UPDATE user_id = toUUID('00000000-0000-0000-0000-000000000000') WHERE user_id = :user_id` on all ClickHouse partitions.
4. Completion event logged to `governance.audit_logs`.

**IP Anonymization:**
- Raw IP is NEVER written to disk at any layer.
- `ip_hash = SHA-256(raw_ip + daily_rotating_salt)` is the only stored form.
- Geo-enrichment (country/city) extracted before hashing; raw IP discarded.

**Consent Gate:**
- If `consent.analytics = false` in the event batch payload, the Ingestion API returns `202 Accepted` (to avoid leaking consent state) but drops all events before Kafka publish.
- Consent state is stored in user profile and re-validated on every ingestion request.

**Data Portability:**
- `GET /api/v1/users/{user_id}/data-export` generates a complete JSON export of all events within 72 hours.
- Export includes all clickstream, AI usage, and billing records associated with the user.
