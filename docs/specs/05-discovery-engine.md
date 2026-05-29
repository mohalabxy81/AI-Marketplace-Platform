# SPEC 05 — DISCOVERY ENGINE SPECIFICATION

> **Basis**: [PLANNER.md §8](file:///home/mohal665544/pr1/PLANNER.md) — Master Discovery Operating Model
> **Status**: Execution-Ready v2 (Full Depth)
> **Version**: 2.0.0
> **Last Updated**: 2026-05-30

---

## 1. Discovery Pipeline Architecture

The Discovery Engine is the primary competitive differentiator of the platform. It implements a **four-stage multi-armed funnel** that reduces millions of candidate listings into a highly personalized, diversity-enforced feed of exactly 25 items within a sub-50ms latency budget. Every stage has an enforced latency ceiling and a hard fallback path.

### 1.1 System Context

```
┌────────────────────────────────────────────────────────────────────────┐
│                          DISCOVERY ENGINE                              │
│                                                                        │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────┐ │
│  │ Query Layer │───▶│  Retrieval  │───▶│   Ranking   │───▶│ Post-   │ │
│  │ (Intent +   │    │  Stage 1    │    │  Stages 2-3 │    │ Process │ │
│  │  Embedding) │    │  N=500      │    │  N=100→25   │    │ Stage 4 │ │
│  └─────────────┘    └─────────────┘    └─────────────┘    └─────────┘ │
│                                                                        │
│  Latency Budget: <8ms    <15ms            <20ms            <5ms       │
│  Total Budget: <50ms                                                   │
└────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Pipeline Stage Summary

| Stage | Name | Input | Output | Latency Ceiling | Algorithm |
|:------|:-----|:------|:-------|:---------------|:----------|
| 0 | Query Interpretation | Raw query string | Intent + embedding | <8ms | Fast classifier + embedding model |
| 1 | Candidate Retrieval | Embedding + filters | 500 candidates | <15ms | HNSW ANN search (pgvector) |
| 2 | Light Ranking | 500 candidates | 100 candidates | <5ms | Scoring function (in-memory) |
| 3 | Heavy Re-Ranking | 100 candidates | 25 candidates | <20ms | Cross-Encoder / XGBoost |
| 4 | Post-Processing | 25 candidates | 25 final items | <2ms | Diversity + exploration rules |

---

## 2. Query Interpretation Layer (Stage 0)

### 2.1 Intent Classification

Every feed or search request enters the Intent Classifier before reaching the retrieval layer. The classifier determines query semantics to optimize downstream retrieval strategy.

**Intent Types:**

| Intent Class | Description | Retrieval Strategy |
|:-------------|:------------|:------------------|
| `NAVIGATIONAL` | User seeks a specific known entity | Exact match boosted + vector similarity |
| `INFORMATIONAL` | User explores a category or concept | Pure vector similarity, broad category filter |
| `TRANSACTIONAL` | User has purchase intent | Price filter activated, trust score boosted |
| `BROWSE` | No query provided (homepage feed) | Pure personalization vector, collaborative filter |
| `COMPARISON` | User wants to compare options | Category-constrained, diversity maximized |

**Classification Mechanism:**
- For queries with fewer than 5 tokens: heuristic keyword matching against a pre-built dictionary of navigational patterns (exact brand/product names).
- For queries with 5+ tokens: lightweight 4-class softmax classifier (distilled BERT or FastText) running locally on the API node (not through AI Infrastructure Gateway, to preserve latency budget).
- Classifier model updates: offline re-training weekly from query log analytics. Deployed as ONNX runtime artifact.

**Classification Output Schema:**
```
IntentResult {
  intent_class: NAVIGATIONAL | INFORMATIONAL | TRANSACTIONAL | BROWSE | COMPARISON
  confidence: float (0.0–1.0)
  extracted_filters: {
    category_slug: string | null
    price_max: decimal | null
    price_min: decimal | null
    tags: string[]
    sort_signal: RELEVANCE | PRICE | RECENCY | RATING
  }
  normalized_query: string (lowercased, stopwords removed, stemmed)
}
```

### 2.2 Query Embedding Generation

After intent extraction, the normalized query is embedded using the platform's embedding model.

**Embedding Path:**
1. Check Redis for cached embedding: `discovery:query_embed:{sha256(normalized_query)}` — TTL 1 hour.
2. If cache miss: invoke AI Infrastructure Domain via internal gRPC call `AIGateway.Embed(text, model="text-embedding-3-small")`.
3. Store embedding in Redis with TTL.
4. Return `Vector(1536)` for retrieval.

**Embedding Budget Allocation:**
- Query embedding calls are classified as **High-Priority** in the AI Queue.
- If AI Gateway is unavailable (circuit open), fall back to a locally-hosted lightweight sentence-transformer model (`all-MiniLM-L6-v2`, 384 dimensions, separate HNSW indexes pre-built at 384d).
- Failover is automatic, transparent to the caller, and logged as `discovery.embedding_fallback_activated`.

### 2.3 User Context Enrichment

In parallel with query embedding, the Discovery Engine fetches the requesting user's preference vector from cache:

- Primary: Redis key `tenant:{tenant_id}:{user_id}:preference_vector` — O(1) read.
- Secondary: PostgreSQL `vector_store.embeddings` where `entity_type='user_preference'` — if Redis cold.
- Tertiary: Zero vector (cold start) — triggers exploration mode with `ε=0.25` (higher than normal 0.10).

The final retrieval query blends query embedding and user preference vector using a weighted combination:
```
query_blend_vector = (0.6 × query_embedding) + (0.4 × user_preference_vector)
```
Blend weights are configurable per tenant via `tenant_config.feature_flags` key `discovery.query_blend_weights`.

---

## 3. Stage 1: Candidate Retrieval

### 3.1 Vector Similarity Search

**Mechanism:** Approximate Nearest Neighbor (ANN) search on HNSW index built with pgvector extension.

**Query Specification:**
```sql
SELECT
  s.listing_id,
  s.status,
  s.trust_score,
  s.sponsored_bid_cpc,
  s.freshness_decay,
  s.category_id,
  s.price,
  s.company_id,
  (e.embedding <=> :blend_vector::vector) AS cosine_distance
FROM search_index.search_candidates s
INNER JOIN vector_store.embeddings e
  ON e.entity_id = s.listing_id AND e.entity_type = 'listing'
WHERE
  s.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  AND s.status = 'active'
  AND (:category_id IS NULL OR s.category_id = :category_id)
  AND (:price_max IS NULL OR s.price <= :price_max)
  AND (:price_min IS NULL OR s.price >= :price_min)
ORDER BY e.embedding <=> :blend_vector::vector
LIMIT 500;
```

**Index Configuration:**
- HNSW index on `vector_store.embeddings` table:
  - `m = 16` (connections per node)
  - `ef_construction = 200` (build quality)
  - `ef_search = 100` (query-time quality, configurable)
  - Distance metric: cosine (`vector_cosine_ops`)
- Composite B-Tree index on `search_candidates(tenant_id, status, category_id)` for pre-filter selectivity.

**Latency Enforcement:**
- Statement timeout set to `15ms` for all retrieval queries via PgBouncer connection parameter.
- If query returns in `>12ms`, emit `discovery.retrieval_slow_warning` metric to observability.
- If query times out, return empty candidate set and serve from `search_index.fallback_cache` (pre-computed top candidates per tenant, refreshed every 5 minutes).

### 3.2 Hard Filter Application

After vector retrieval, apply hard business filters in application memory (not SQL) to avoid slow subquery execution:

| Filter | Logic | Source |
|:-------|:------|:-------|
| Quarantine exclusion | Exclude `listing_id` in `trust_registry.quarantined_items` (cached set in Redis) | Redis SET: `trust:quarantine:{tenant_id}` |
| Blocked tenants | Exclude listings from tenants with `trust_score < 0.20` | Cached in memory, refreshed on `trust.trust_score_updated` event |
| Duplicate exclusion | Exclude listings shown in user's last 3 feed generations | Session cache: `discovery:seen:{user_id}` |
| Geographic restriction | Apply geo-fence filters based on tenant configuration | Feature flag: `discovery.geo_filter_enabled` |

### 3.3 Candidate Pool Composition

If the vector search returns fewer than 500 candidates (sparse tenant catalog), apply **catalog backfill**:
1. Fill remaining slots with global trending listings (cross-tenant, anonymized): query `search_index.ranking_features` ordered by `global_engagement_score DESC`.
2. These backfill items are tagged `source=GLOBAL_BACKFILL` and deprioritized in Stage 2 by applying a `0.8x` score multiplier.
3. Maximum backfill fraction: 40% of the 500-slot pool.

---

## 4. Stage 2: Light Ranking

### 4.1 Scoring Function

Light Ranking reduces 500 candidates to 100 using a deterministic, in-memory scoring formula. All required signals are retrieved as part of the Stage 1 SQL result set (no additional I/O).

**Scoring Formula:**
```
Score_light = (1.0 - cosine_distance)
            × trust_score
            × (1.0 + log(1.0 + bid_cpc))
            × freshness_decay
            × source_multiplier
            × category_affinity_score
```

**Signal Definitions:**

| Signal | Type | Range | Source | Update Frequency |
|:-------|:-----|:------|:-------|:----------------|
| `cosine_distance` | Float | 0.0–2.0 | Stage 1 HNSW | Per query |
| `trust_score` | Float | 0.20–1.00 | Redis: `trust:scores:{entity_id}` | On `trust.trust_score_updated` event |
| `bid_cpc` | Float | 0.00–∞ | Monetization: active campaign bids, cached in Redis | Every 60 seconds |
| `freshness_decay` | Float | 0.10–1.00 | Computed: `exp(-λ × age_days)` where λ=0.05 | Computed inline |
| `source_multiplier` | Float | 0.80–1.00 | 0.80 for GLOBAL_BACKFILL, 1.00 for tenant catalog | From Stage 1 tag |
| `category_affinity_score` | Float | 0.50–1.50 | Redis: `discovery:cat_affinity:{user_id}:{category_id}` | On `discovery.item_clicked` event |

**Freshness Decay Formula:**
```
freshness_decay = exp(-0.05 × age_days)
```
- Age 0 days → 1.00 (no penalty)
- Age 14 days → 0.50 (50% weight)
- Age 60 days → 0.05 (5% weight)
- Minimum floor: 0.10 (very old listings not completely hidden)

**Ad Bid Contribution:**
- `log(1.0 + bid_cpc)` provides diminishing returns to prevent unlimited ad dominance.
- Maximum ad boost at $100 CPC bid: `log(101) ≈ 4.6x` base multiplier capped at `2.0x`.
- Sponsored items tagged as `is_sponsored: true` in the final feed response.

**Category Affinity:**
- Cold start: affinity = 1.00 for all categories (neutral).
- Warm: Updated using exponential moving average on category click history:
  ```
  affinity[cat] = 0.9 × affinity[cat] + 0.1 × 1.0  (on click in category)
  affinity[cat] = 0.99 × affinity[cat]              (decay on each feed generation)
  ```

### 4.2 Light Ranking Execution

- Implemented as a pure in-memory sort on the JVM (or Node.js) application layer.
- No database calls during this stage.
- Target execution time: `<5ms` for 500 candidates.
- Output: Top 100 items sorted by `Score_light` descending, with scores attached.

---

## 5. Stage 3: Heavy Re-Ranking (Personalization)

### 5.1 Architecture Decision: Cross-Encoder vs. XGBoost

| Model | Accuracy | Latency | Cost | When to Use |
|:------|:---------|:--------|:-----|:-----------|
| Cross-Encoder (BERT-based) | Highest | 15–25ms | High AI tokens | Tenants with Premium/Enterprise plan |
| XGBoost Gradient Boost | High | 1–3ms | Near-zero | Tenants with Starter/Growth plan |
| Linear Scoring Boost | Medium | <1ms | Zero | Fallback if AI Gateway unavailable |

- Tenant plan determines which re-ranker is activated. Feature flag: `discovery.reranker_model`.
- Default for all plans: XGBoost (deployed as ONNX runtime, no external call).
- Cross-Encoder route: calls AI Infrastructure Gateway with `priority=HIGH` and 20ms timeout.

### 5.2 Feature Vector Construction

For each of the 100 candidates, construct a feature vector at scoring time:

| Feature | Computation | Dimension |
|:--------|:-----------|:----------|
| User-Item cosine similarity | `dot(user_pref_vector, listing_embedding)` | 1 scalar |
| User-Category affinity | From Redis cache | 1 scalar |
| Item historical CTR (7d) | From `search_index.search_signals` | 1 scalar |
| Item historical CVR (30d) | From `search_index.search_signals` | 1 scalar |
| Item rating average | From `marketplace.reviews` aggregate (cached) | 1 scalar |
| Item review count (log) | `log(1 + review_count)` | 1 scalar |
| Hour of day (sin/cos) | Cyclical encoding of request hour | 2 scalars |
| Day of week (sin/cos) | Cyclical encoding of request weekday | 2 scalars |
| Device type | One-hot: `mobile=1`, `desktop=0` | 1 scalar |
| Light ranking score | `Score_light` from Stage 2 | 1 scalar |
| Listing age bucket | One-hot: `new(<7d)`, `recent(<30d)`, `established` | 3 scalars |
| Is sponsored | Boolean | 1 scalar |

**Total feature vector dimensions: 16**

### 5.3 XGBoost Model Governance

- Model trained offline using 30 days of click/conversion data from ClickHouse.
- Training target: **probability of conversion** (purchase or trial activation within 24 hours of impression).
- Retraining frequency: weekly (Saturdays, low-traffic window).
- Model artifact stored in S3: `s3://platform-ml-models/discovery/reranker/xgb-v{version}.onnx`.
- Active version tracked in `ai_cache.model_registry` where `model_id = 'discovery_reranker'`.
- Canary deployment: new model served to 5% of traffic for 48 hours before full promotion.
- Rollback trigger: if CTR drops more than 3% relative vs. control group over 24h window.

### 5.4 Re-Ranking Execution

1. Fetch all required signals from Redis in a single pipeline batch (`MGET` of pre-computed signal keys).
2. Construct feature vectors for all 100 candidates (in-memory, no further I/O).
3. Call ONNX runtime locally for XGBoost scoring (batch inference of 100 rows).
4. Sort by predicted conversion probability descending.
5. Return top 25 items with probability scores.
6. Emit `discovery.ranking_completed` event to Event Mesh.

---

## 6. Stage 4: Post-Processing

### 6.1 Epsilon-Greedy Exploration

**Strategy:** Epsilon-Greedy with dynamic epsilon adjustment.

| Scenario | ε Value | Rationale |
|:---------|:--------|:----------|
| Cold start user (< 5 interactions) | 0.25 | Need rapid exploration to build preference model |
| Normal returning user | 0.10 | Standard exploration budget |
| User with strong preference signal (>50 interactions) | 0.05 | Exploit well-understood preferences |

**Implementation:**
- From the final 25 slots, reserve ⌊25 × ε⌋ slots for exploration items.
- Exploration items are selected from the **501–600 candidates** returned by a secondary retrieval pass with diversity bias (query vector rotated 15° toward random unused category embedding).
- These exploration items are tagged `exploration_candidate: true` in the internal ranking object (not exposed to API clients).
- If no exploration candidates available, exploration slots are filled by the next ranked items from Stage 3.

### 6.2 Diversity Enforcement Rules

Applied sequentially after exploration injection:

| Rule | Constraint | Enforcement |
|:-----|:-----------|:-----------|
| Category cap | Max 3 items from same category in top 10 | Post-sort deduplication pass |
| Company cap | Max 2 items from same company in top 10 | Post-sort deduplication pass |
| Price range diversity | Must include at least 1 item in each of: <$20, $20–$100, >$100 (if catalog allows) | Slot injection from ranked overflow |
| Sponsored cap | Max 3 sponsored items in any 25-item feed | Hard cap; demote excess sponsored to lower positions |

**Deduplication Pass Algorithm:**
1. Iterate through ranked 25 items in order.
2. For each item, check category/company occurrence count in already-accepted set.
3. If limit exceeded: swap item with the highest-scored eligible item from positions 26–50 of Stage 3 output.
4. Maximum 3 swaps per feed generation (limit prevents excessive quality degradation).

### 6.3 Feed Assembly

Final feed response is assembled with full enrichment:

| Field | Source | Notes |
|:------|:-------|:------|
| `listing_id` | Stage 3 output | |
| `title`, `description`, `media_url` | `marketplace.listings` (cached in Redis) | Cache key: `marketplace:listing:summary:{listing_id}` TTL 15min |
| `score` | Re-ranker probability | Normalized to 0.0–1.0 range |
| `is_sponsored` | Stage 2 ad signal | |
| `explanation_tags` | Generated from top feature contributions | e.g., "Trending", "High match", "New listing" |
| `position` | 1-indexed final rank | Used for impression tracking |

---

## 7. Personalization Loop Integration

### 7.1 Fast Loop (Online — Sub-Second)

**Trigger:** Any of the following user actions:
- Click on listing (`discovery.item_clicked`)
- View duration > 3 seconds (`discovery.item_impressed` with `duration_ms > 3000`)
- Purchase/trial activation (`monetization.payment_received`)
- Explicit save/bookmark (`marketplace.listing_saved`)

**Update Algorithm (Exponential Moving Average):**
```
V_user(t) = α × V_user(t-1) + (1 - α) × V_item
```
Where:
- `α = 0.85` (decay rate, configurable via `feature_flags.discovery.ema_decay`)
- `V_item` = normalized embedding vector of the interacted listing
- `V_user(t)` = new preference vector stored in Redis

**Weight Adjustments by Action Type:**
| Action | EMA Weight `(1-α)` Effective |
|:-------|:------------------------------|
| Purchase | 0.30 (3x amplified) |
| Click | 0.15 (base) |
| Save | 0.20 (1.3x amplified) |
| Long view (>30s) | 0.18 (1.2x amplified) |
| Short view (<2s) | 0.05 (0.3x, implicit negative signal) |

**Storage:** Updated preference vector written to Redis: `tenant:{tenant_id}:{user_id}:preference_vector` with TTL 30 days (refreshed on each update).

### 7.2 Slow Loop (Offline — Daily Batch)

**Schedule:** Daily at 02:00 UTC.

**Process:**
1. Kafka consumer reads all `discovery.item_clicked`, `discovery.item_impressed` events from past 24 hours → writes to ClickHouse.
2. ClickHouse collaborative filtering job computes user-user similarity matrix based on shared interaction history.
3. For users with fewer than 10 interactions: supplement preference vector with weighted average of K=5 most similar users' preference vectors (K-NN collaborative filtering).
4. Batch job rebuilds global HNSW search indexes in background (separate pgvector index, zero downtime swap).
5. On completion, emits `intelligence.index_rebuilt` event, triggering cache warming of top-500 most active user preference vectors.

---

## 8. Feed Caching Strategy

### 8.1 Feed-Level Cache

For browse requests (no query, `intent=BROWSE`): pre-compute personalized feeds for top-1000 most active users daily and cache in Redis.

| Cache Type | Key Pattern | TTL | When Invalidated |
|:-----------|:-----------|:----|:----------------|
| Pre-computed browse feed | `discovery:feed:precomputed:{user_id}` | 10 minutes | On `marketplace.listing_created/updated`, user interaction |
| Category top listings | `discovery:category:top:{tenant_id}:{cat_id}` | 5 minutes | On `marketplace.listing_status_changed` |
| Trending signals | `discovery:trending:{tenant_id}` | 2 minutes | Continuously updated via stream aggregation |
| User preference vector | `tenant:{tenant_id}:{user_id}:preference_vector` | 30 days | On each user interaction |
| Query embedding | `discovery:query_embed:{query_hash}` | 1 hour | Never (stable) |

### 8.2 Fallback Feed

If all pipeline stages fail (DB unavailable, timeout cascade):
- Return cached pre-computed feed if available.
- If no cache: return global top-25 trending listings (daily-computed, stored in Redis key `discovery:global:trending`).
- Tag response with `metadata.feed_source = 'FALLBACK'`.
- Circuit breaker: open after 3 consecutive failures within 10 seconds per instance.

---

## 9. Discovery Domain Data Contracts

### 9.1 Feed Generation Request

```
POST /api/v1/feed
Authorization: Bearer {jwt_token}
X-Tenant-ID: {tenant_id}

Request Body:
{
  user_id: UUID (required)
  context: {
    query: string | null (null for browse)
    filters: {
      category_id: UUID | null
      price_min: decimal | null
      price_max: decimal | null
      tags: string[] | null
      location_radius_km: integer | null
      location_lat: float | null
      location_lng: float | null
    }
    limit: integer (default 25, max 50)
    offset: integer (default 0, for pagination)
    device_type: MOBILE | DESKTOP | TABLET
    session_id: UUID (for impression deduplication)
  }
  experiment_id: UUID | null (A/B test override)
}
```

### 9.2 Feed Generation Response

```
Response Body:
{
  feed_id: UUID
  generated_at: ISO-8601 UTC
  items: [
    {
      listing_id: UUID
      title: string
      description: string (truncated to 250 chars)
      price: decimal
      currency: string (ISO 4217)
      media_url: string (CDN URL)
      category: { id: UUID, name: string, slug: string }
      company: { id: UUID, name: string, verified: boolean }
      rating: { average: float, count: integer }
      score: float (0.0–1.0, normalized relevance)
      is_sponsored: boolean
      explanation_tags: string[] (max 3, human-readable)
      position: integer (1-indexed)
    }
  ]
  metadata: {
    total_candidates_evaluated: integer
    feed_source: LIVE | CACHED | FALLBACK
    latency_ms: integer
    experiment_variant: string | null
    intent_class: string
    exploration_slots_used: integer
  }
}
```

### 9.3 Search Request

```
GET /api/v1/search?q={query}&category={cat_id}&price_max={price}&sort={sort}&page={page}&limit={limit}
Authorization: Bearer {jwt_token}
```

**Sort values:** `RELEVANCE` (default), `PRICE_ASC`, `PRICE_DESC`, `RATING`, `RECENCY`

### 9.4 Internal gRPC Contracts

```
// Discovery gRPC Service Definition

service DiscoveryService {
  rpc GenerateFeed (FeedRequest) returns (FeedResponse);
  rpc SearchListings (SearchRequest) returns (SearchResponse);
  rpc GetCandidatePool (CandidatePoolRequest) returns (CandidatePoolResponse);
  rpc RankCandidates (RankRequest) returns (RankResponse);
  rpc GetSuggestions (SuggestionRequest) returns (SuggestionResponse);
}

message FeedRequest {
  string tenant_id = 1;
  string user_id = 2;
  bytes query_embedding = 3;         // Pre-computed 1536-dim vector
  bytes user_preference_embedding = 4; // 1536-dim user vector
  FeedFilters filters = 5;
  int32 limit = 6;
  string experiment_variant = 7;
}

message CandidatePoolRequest {
  string tenant_id = 1;
  bytes blend_vector = 2;
  FeedFilters filters = 3;
  int32 pool_size = 4;  // Default 500
}

message RankRequest {
  string user_id = 1;
  repeated Candidate candidates = 2;
  UserContext context = 3;
}
```

---

## 10. Discovery Event Catalog (Detailed)

### 10.1 Events Published by Discovery Domain

| Event | Trigger | Kafka Topic | Retention | Key Payload Fields |
|:------|:--------|:-----------|:---------|:-------------------|
| `discovery.feed_generated` | Feed request completed | `discovery.feeds` | 30 days | `feed_id`, `user_id`, `candidate_count`, `selected_ids`, `latency_ms`, `feed_source` |
| `discovery.ranking_completed` | Stage 3 completes | `discovery.rankings` | 30 days | `feed_id`, `top_25_ids`, `scores`, `model_used`, `latency_ms` |
| `discovery.search_executed` | Search query processed | `discovery.searches` | 90 days | `query`, `intent_class`, `result_count`, `latency_ms` |
| `discovery.item_clicked` | Client-reported click | `discovery.interactions` | 90 days | `listing_id`, `feed_id`, `position`, `user_id`, `session_id` |
| `discovery.item_impressed` | Client-reported view | `discovery.interactions` | 90 days | `listing_id`, `feed_id`, `position`, `duration_ms`, `viewport_percent` |
| `discovery.retrieval_slow_warning` | Stage 1 > 12ms | `discovery.metrics` | 7 days | `tenant_id`, `latency_ms`, `candidate_count` |
| `discovery.embedding_fallback_activated` | AI Gateway unavailable | `discovery.metrics` | 7 days | `tenant_id`, `fallback_model`, `reason` |

### 10.2 Events Consumed by Discovery Domain

| Event | Producer | Action Triggered |
|:------|:---------|:----------------|
| `marketplace.listing_created` | Marketplace | Add to candidate pool, trigger embedding request |
| `marketplace.listing_updated` | Marketplace | Update search_candidates metadata, trigger re-embedding |
| `marketplace.listing_deleted` | Marketplace | Remove from candidate pool, invalidate related caches |
| `marketplace.listing_status_changed` | Marketplace | Toggle active/inactive in candidate pool |
| `ai.embedding_generated` | AI Infrastructure | Store embedding in vector index, update candidate readiness |
| `trust.trust_score_updated` | Trust & Safety | Update trust_score in search_candidates, invalidate ranking caches |
| `intelligence.personalization_updated` | Intelligence | Refresh user preference vector in Redis |
| `monetization.ad_auction_completed` | Monetization | Update bid_cpc for affected listings in Redis |

---

## 11. Discovery Telemetry & Observability

### 11.1 Metrics (Prometheus)

| Metric Name | Type | Labels | Description |
|:-----------|:-----|:-------|:------------|
| `discovery_feed_latency_ms` | Histogram | `tenant_id`, `intent_class`, `feed_source` | End-to-end feed generation time |
| `discovery_stage_latency_ms` | Histogram | `stage`, `tenant_id` | Per-stage latency |
| `discovery_candidate_count` | Gauge | `tenant_id`, `stage` | Candidates at each stage |
| `discovery_cache_hit_rate` | Counter | `cache_type`, `tenant_id` | Cache effectiveness |
| `discovery_ranking_model_used` | Counter | `model`, `tenant_id` | Model usage distribution |
| `discovery_exploration_rate` | Gauge | `tenant_id` | Actual exploration percentage |
| `discovery_fallback_activations` | Counter | `fallback_type`, `tenant_id` | Fallback frequency |

### 11.2 Distributed Trace Spans

Each feed generation request generates the following trace spans (OpenTelemetry):

| Span Name | Parent | Attributes |
|:---------|:-------|:---------|
| `discovery.feed_generation` | Root | `tenant_id`, `user_id`, `intent_class` |
| `discovery.query_interpretation` | feed_generation | `query_length`, `intent_class`, `confidence` |
| `discovery.query_embedding` | query_interpretation | `cache_hit`, `model`, `latency_ms` |
| `discovery.user_vector_fetch` | feed_generation | `cache_hit`, `vector_source` |
| `discovery.stage1_retrieval` | feed_generation | `candidate_count`, `latency_ms` |
| `discovery.stage2_light_ranking` | feed_generation | `input_count`, `output_count`, `latency_ms` |
| `discovery.stage3_reranking` | feed_generation | `model`, `input_count`, `latency_ms` |
| `discovery.stage4_postprocessing` | feed_generation | `exploration_slots`, `diversity_swaps` |
| `discovery.feed_enrichment` | feed_generation | `cache_hits`, `db_lookups` |

### 11.3 SLOs

| SLO | Target | Measurement Window | Alert Threshold |
|:----|:-------|:------------------|:---------------|
| Feed generation P50 latency | <30ms | 5-minute rolling | Alert if P50 > 35ms for 2 consecutive windows |
| Feed generation P99 latency | <50ms | 5-minute rolling | Alert if P99 > 60ms for 1 window |
| Feed error rate | <0.1% | 1-hour rolling | Alert if error rate > 0.5% |
| Stage 1 timeout rate | <0.01% | 1-hour rolling | Alert if timeout rate > 0.05% |
| Cache hit rate (user vectors) | >85% | 1-hour rolling | Alert if < 70% |

---

## 12. Scaling Architecture

### 12.1 Horizontal Scaling Thresholds

| Trigger | Metric | Threshold | Action |
|:--------|:-------|:---------|:-------|
| API node scale-out | CPU utilization | >70% for 3 minutes | Add 2 API nodes |
| pgvector IOPS | DB CPU / IOPS | >40% | Migrate to dedicated vector cluster (Milvus/Pinecone) |
| Redis memory | Memory usage | >80% | Scale Redis to cluster mode |
| Feed cache miss rate | Cache hit < 60% | Sustained 10 min | Pre-warm top-500 users immediately |

### 12.2 Extraction Trigger

**Condition:** When Stage 1 retrieval consistently exceeds 12ms on 95th percentile (indicating pgvector saturation).

**Extraction Target:**
- Deploy dedicated Milvus cluster (or Pinecone index).
- Migrate `vector_store.embeddings` data to Milvus via Kafka Sink Connector.
- Update `DiscoveryService` to call Milvus gRPC instead of pgvector query.
- Run dual-write for 7 days (pgvector + Milvus) before cutover.
- Cutover is feature-flag-gated: `discovery.vector_backend = PGVECTOR | MILVUS | PINECONE`.

---

## 13. A/B Testing Integration

### 13.1 Experiment Hook Points

| Hook | Stage | Experiment Types Supported |
|:-----|:------|:--------------------------|
| Query interpretation | Stage 0 | Different intent classifiers |
| Blend weights | Stage 0 | Query vs. user vector weight ratios |
| Retrieval pool size | Stage 1 | 200 vs 500 vs 1000 candidates |
| Light ranking formula | Stage 2 | Different signal weights |
| Re-ranker model | Stage 3 | XGBoost vs Cross-Encoder vs Linear |
| Exploration rate (ε) | Stage 4 | 0.05 vs 0.10 vs 0.15 |
| Diversity rules | Stage 4 | Strict vs relaxed category caps |

### 13.2 Variant Assignment

- `ExperimentService.AssignVariant(user_id, experiment_id)` called before Stage 0.
- Variant assignment cached for 24 hours in Redis.
- All downstream stages receive `experiment_variant` tag.
- All feed events include `experiment_variant` in payload for Analytics cohort analysis.
