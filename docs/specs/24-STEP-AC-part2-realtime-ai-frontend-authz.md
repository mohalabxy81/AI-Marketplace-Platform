# STEP AC — ENGINEERING CONSTITUTION: PART 2
# Sections 5–8: Realtime · AI · Frontend · Authorization Contracts

> **Parent Document**: [23-STEP-AC-engineering-constitution.md](file:///home/mohal665544/pr1/docs/specs/23-STEP-AC-engineering-constitution.md)  
> **Version**: 1.0.0 | **Date**: 2026-05-30

---

# SECTION 5 — REALTIME CONTRACTS

## 5.0 Realtime Infrastructure Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     REALTIME DELIVERY STACK                     │
│                                                                 │
│  PostgreSQL WAL ──► Supabase Realtime ──► WebSocket Clients     │
│                                                                 │
│  Kafka Events  ──► Realtime Bridge   ──► Broadcast Channels     │
│                                                                 │
│  Presence      ──► Phoenix PubSub    ──► Presence Channels      │
└─────────────────────────────────────────────────────────────────┘
```

### 5.0.1 Channel Naming Conventions
All channels follow strict naming conventions for tenant isolation:

```
tenant:{tenant_id}:feed           — Personalized feed updates
tenant:{tenant_id}:notifications  — In-app notification delivery
tenant:{tenant_id}:moderation     — Moderation status updates
tenant:{tenant_id}:analytics      — Live analytics streams
tenant:{tenant_id}:billing        — Billing alerts
conversations:{conversation_id}   — Direct messaging threads
admin:platform                    — Super Admin broadcasts
admin:moderation                  — Super Admin moderation queue updates
platform:announcements            — Global platform announcements
presence:tenant:{tenant_id}       — Workspace user presence
```

**Isolation Rule**: Clients can ONLY subscribe to channels whose `tenant_id` matches their JWT claim. The gateway validates this on subscription request — any mismatch returns `403 FORBIDDEN` and closes the socket.

### 5.0.2 WebSocket Connection Protocol
```
1. Client connects: wss://realtime.platform.io/socket
2. Client sends: { "type": "JOIN", "token": "{jwt}", "channels": [...] }
3. Server validates JWT, extracts tenant_id, authorizes channels
4. Server sends: { "type": "JOINED", "channels_authorized": [...] }
5. Server sends: periodic PING every 30s
6. Client sends: PONG within 10s (otherwise connection dropped)
7. On disconnect: Server queues missed events for 5 min (client can replay on reconnect)
```

### 5.0.3 Reconnection Strategy
- **Exponential backoff**: 1s → 2s → 4s → 8s → 16s → 32s (max 32s)
- **Jitter**: ±500ms random jitter on each retry interval
- **Max attempts**: 10 before surfacing connection error to user
- **State recovery**: On reconnect, client sends `last_event_id`; server replays missed events (max 5-minute window)
- **Stale state detection**: Server sends `SYNC_REQUIRED` if client has been offline > 5 minutes; client performs REST refresh

---

## 5.1 Channel: Notifications

**Channel Name**: `tenant:{tenant_id}:notifications`

**Publisher**: Notification Service (writes to `notifications.notification_records` → WAL triggers broadcast)

**Subscribers**: Authenticated users within the tenant workspace

**Authorization Rules**:
- JWT required on subscribe
- `tenant_id` in channel name must match JWT claim
- Users only receive their own notifications (`user_id` filter applied server-side)

**Payload Contract**:
```json
{
  "type": "NOTIFICATION",
  "notification_id": "uuid",
  "notification_type": "LEAD_RECEIVED" | "LISTING_APPROVED" | "BILLING_ALERT" | "SYSTEM",
  "title": "string",
  "body": "string",
  "action_url": "string | null",
  "severity": "info" | "success" | "warning" | "error",
  "is_read": false,
  "created_at": "ISO-8601 UTC"
}
```

**Unread Count Update** (delivered after each new notification):
```json
{
  "type": "UNREAD_COUNT_UPDATE",
  "unread_count": 7
}
```

**Reconnection Rules**:
- On reconnect: Client calls `GET /api/v1/notifications?read=false` to refresh count
- Missed notifications: Delivered via next REST fetch (not replayed over socket)

**Scaling Strategy**:
- Supabase Realtime horizontal scaling (Elixir/Phoenix nodes)
- Each node handles 10,000 concurrent WebSocket connections
- Load balanced by consistent hash of `tenant_id`

---

## 5.2 Channel: Messaging

**Channel Name**: `conversations:{conversation_id}`

**Publisher**: Messaging Service (writes to `messages` table → WAL triggers broadcast)

**Subscribers**: Conversation participants only (2–20 participants per conversation)

**Authorization Rules**:
- JWT required
- User must be a participant in `conversations.participants` — validated at subscription time
- Server-side filter: Only participants receive messages for this conversation

**Payload Contracts**:

New Message:
```json
{
  "type": "MESSAGE_CREATED",
  "message_id": "uuid",
  "conversation_id": "uuid",
  "sender": {
    "user_id": "uuid",
    "name": "string",
    "avatar_url": "string | null"
  },
  "content": "string",
  "content_type": "text" | "file",
  "media_url": "string | null",
  "sent_at": "ISO-8601 UTC",
  "status": "delivered"
}
```

Read Receipt:
```json
{
  "type": "MESSAGE_READ",
  "conversation_id": "uuid",
  "reader_user_id": "uuid",
  "last_read_message_id": "uuid",
  "read_at": "ISO-8601 UTC"
}
```

Typing Indicator (ephemeral, NOT stored in DB):
```json
{
  "type": "TYPING",
  "conversation_id": "uuid",
  "user_id": "uuid",
  "is_typing": true,
  "expires_at": "ISO-8601 UTC (+3 seconds)"
}
```

Message Moderation Flag:
```json
{
  "type": "MESSAGE_FLAGGED",
  "message_id": "uuid",
  "flagged_at": "ISO-8601 UTC",
  "visible_to_sender_only": true
}
```

**Reconnection Rules**:
- On reconnect: Client calls `GET /api/v1/conversations/{id}/messages?before_message_id={last_seen_id}&limit=50`
- In-flight messages: Client tracks sent messages locally; reconciles on reconnect

**Scaling Strategy**:
- Conversation channels are lightweight (2-20 subscribers)
- Partitioned by `conversation_id` hash across Realtime nodes

---

## 5.3 Channel: Activity Feeds

**Channel Name**: `tenant:{tenant_id}:feed`

**Publisher**: Search Service (emits feed updates when new highly-ranked listings appear) + Listing Service (new listings in followed categories)

**Subscribers**: Authenticated users viewing the marketplace feed

**Authorization Rules**:
- JWT required; tenant_id match enforced
- Feed updates are tenant-scoped (never cross-tenant)

**Payload Contracts**:

New Listing Alert (for saved searches):
```json
{
  "type": "NEW_LISTING_MATCH",
  "saved_search_id": "uuid | null",
  "listing": {
    "listing_id": "uuid",
    "title": "string",
    "price_cents": 29900,
    "currency": "usd",
    "media_url": "string",
    "category": { "id": "uuid", "name": "string" },
    "company": { "id": "uuid", "name": "string", "verified": true }
  },
  "match_score": 0.94,
  "published_at": "ISO-8601 UTC"
}
```

Feed Refresh Signal (instructs client to refresh feed):
```json
{
  "type": "FEED_REFRESH_SIGNAL",
  "reason": "NEW_LISTINGS" | "PRICE_CHANGE" | "TRENDING_UPDATE",
  "affected_category_ids": ["uuid"],
  "new_listing_count": 3
}
```

Listing Status Change (for listings user has favorited):
```json
{
  "type": "FAVORITED_LISTING_UPDATED",
  "listing_id": "uuid",
  "change_type": "PRICE_CHANGE" | "STATUS_CHANGE" | "NEW_REVIEW",
  "old_value": "29900",
  "new_value": "24900",
  "currency": "usd"
}
```

**Reconnection Rules**:
- On reconnect: Perform `POST /api/v1/feed` to refresh current feed state
- Missed updates: Not replayed; client refreshes via REST

**Scaling Strategy**:
- Feed channels are write-heavy (new listings trigger many channel broadcasts)
- Batched broadcast: Batch new listing events into 5-second windows before broadcast
- Fan-out limit: Max 10,000 concurrent feed channel subscribers per Realtime node

---

## 5.4 Channel: Analytics Streams

**Channel Name**: `tenant:{tenant_id}:analytics`

**Publisher**: Analytics Service (publishes real-time metric updates every 30 seconds)

**Subscribers**: Authenticated tenant dashboard users with analytics permissions

**Authorization Rules**:
- JWT required; tenant_id match enforced
- Required permission: `analytics:read_realtime`
- Available only on Growth+ plan tiers

**Payload Contract**:
```json
{
  "type": "ANALYTICS_UPDATE",
  "window": "last_5_minutes",
  "metrics": {
    "feed_generations": 142,
    "searches": 89,
    "clicks": 234,
    "ctr": 0.31,
    "new_leads": 7,
    "active_users": 48
  },
  "updated_at": "ISO-8601 UTC"
}
```

Live Search Query Stream (throttled, 1 event/second):
```json
{
  "type": "LIVE_SEARCH_QUERY",
  "query": "string (anonymized — no PII)",
  "result_count": 23,
  "category_matched": "string | null",
  "timestamp": "ISO-8601 UTC"
}
```

**Reconnection Rules**:
- On reconnect: Client calls `GET /api/v1/analytics/dashboard` for full state
- Live stream: Not replayed; resumes from reconnection point only

**Scaling Strategy**:
- Analytics channels are low-subscriber, low-frequency
- Backend aggregates metrics before broadcasting (never fan-out raw clickstream events)

---

## 5.5 Channel: Moderation Streams

**Channel Name**: `admin:moderation`

**Publisher**: Moderation Service (new cases, AI decisions, human decisions)

**Subscribers**: Super Admin users and platform moderators only

**Authorization Rules**:
- JWT required
- Required role: `super_admin` OR `moderator`
- This channel is NOT tenant-scoped — it is platform-wide

**Payload Contracts**:

New Case:
```json
{
  "type": "MODERATION_CASE_OPENED",
  "case_id": "uuid",
  "content_type": "LISTING" | "MESSAGE" | "MEDIA",
  "content_id": "uuid",
  "tenant_id": "uuid",
  "priority": "HIGH",
  "ai_flags": ["SPAM", "MISLEADING"],
  "ai_confidence": 0.89,
  "sla_due_at": "ISO-8601 UTC",
  "created_at": "ISO-8601 UTC"
}
```

AI Decision:
```json
{
  "type": "MODERATION_AI_DECISION",
  "case_id": "uuid",
  "decision": "APPROVE" | "REJECT" | "ESCALATE",
  "confidence": 0.94,
  "reasoning_summary": "string (max 200 chars)",
  "requires_human_review": false
}
```

Queue Statistics (every 60 seconds):
```json
{
  "type": "MODERATION_QUEUE_STATS",
  "total_open": 42,
  "high_priority": 7,
  "sla_breached": 2,
  "avg_resolution_time_minutes": 18
}
```

**Scaling Strategy**:
- Low subscriber count (internal use only)
- No horizontal scaling needed; single Realtime node handles admin traffic

---

## 5.6 Channel: Billing Streams

**Channel Name**: `tenant:{tenant_id}:billing`

**Publisher**: Billing Service (quota alerts, payment events, campaign updates)

**Subscribers**: Tenant owner and admin users

**Authorization Rules**:
- JWT required; tenant_id match enforced
- Required role: owner or admin

**Payload Contracts**:

Quota Warning:
```json
{
  "type": "QUOTA_WARNING",
  "resource": "ai_tokens",
  "display_name": "AI Tokens",
  "current_usage": 850000,
  "limit": 1000000,
  "utilization_pct": 85.0,
  "days_remaining_in_period": 12,
  "projected_overage_usd": 12.50
}
```

Payment Event:
```json
{
  "type": "PAYMENT_EVENT",
  "event": "INVOICE_PAID" | "PAYMENT_FAILED" | "SUBSCRIPTION_CHANGED",
  "invoice_id": "uuid | null",
  "amount_cents": 9900,
  "message": "string",
  "action_url": "string | null"
}
```

Campaign Update:
```json
{
  "type": "CAMPAIGN_UPDATE",
  "campaign_id": "uuid",
  "event": "ACTIVATED" | "BUDGET_50_PCT" | "BUDGET_EXHAUSTED" | "PAUSED",
  "budget_spent_cents": 5000,
  "budget_total_cents": 10000,
  "impressions_delivered": 14200
}
```

**Reconnection Rules**:
- On reconnect: Client calls `GET /api/v1/billing/usage` to refresh quota state

---

## 5.7 Channel: Admin Streams

**Channel Name**: `admin:platform`

**Publisher**: Super Admin Service, Trust Service, Monitoring Service

**Subscribers**: Super Admin users only

**Authorization Rules**:
- JWT required; role MUST be `super_admin`

**Payload Contracts**:

Platform Health Update (every 60s):
```json
{
  "type": "PLATFORM_HEALTH",
  "timestamp": "ISO-8601 UTC",
  "services": {
    "api_gateway": { "status": "healthy", "latency_p95_ms": 45 },
    "search_engine": { "status": "healthy", "latency_p95_ms": 38 },
    "ai_gateway": { "status": "degraded", "latency_p95_ms": 4200 },
    "billing_service": { "status": "healthy" },
    "realtime": { "status": "healthy", "connections": 12400 }
  },
  "active_tenants_last_5min": 842,
  "open_incidents": 1
}
```

Fraud Alert (immediate):
```json
{
  "type": "FRAUD_ALERT",
  "trust_event_id": "uuid",
  "tenant_id": "uuid",
  "org_name": "string",
  "risk_score": 0.94,
  "signals": ["RAPID_LISTING_CREATION", "UNUSUAL_PRICE_PATTERN"],
  "recommended_action": "IMMEDIATE_REVIEW",
  "auto_action_applied": "QUARANTINE"
}
```

Global Announcement Published:
```json
{
  "type": "ANNOUNCEMENT_PUBLISHED",
  "announcement_id": "uuid",
  "severity": "WARNING",
  "title": "string",
  "target_tenant_count": 4821
}
```

---

# SECTION 6 — AI CONTRACTS

## 6.0 AI Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        AI INFRASTRUCTURE                            │
│                                                                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────────────┐   │
│  │  AI Gateway  │──►│ Token Guard  │──►│ Semantic Cache       │   │
│  │  (single     │   │ (leaky bucket│   │ (cosine similarity   │   │
│  │   entry pt)  │   │  per tenant) │   │  ≥0.96 threshold)    │   │
│  └──────┬───────┘   └──────────────┘   └──────────────────────┘   │
│         │                                                           │
│         ▼                                                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │               PRIORITY QUEUE SCHEDULER                       │  │
│  │  HIGH: User-facing chat, search re-ranking                   │  │
│  │  LOW: Background embedding, moderation scans, enrichment     │  │
│  └───────────────────────┬──────────────────────────────────────┘  │
│                          │                                          │
│          ┌───────────────┼───────────────┐                         │
│          ▼               ▼               ▼                         │
│   [OpenAI API]    [Anthropic API]  [Local Models]                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 6.1 Embedding Pipeline Contract

**Purpose**: Generate 1536-dimensional text embeddings for all searchable content (listings, queries, user profiles, messages)

**Model**: `text-embedding-3-small` (OpenAI) — primary
**Fallback Model**: `text-embedding-ada-002` (OpenAI) — secondary
**Dimensions**: 1536 (fixed; stored as `vector(1536)` in PostgreSQL pgvector)

**Inputs**:
| Entity Type | Input Fields | Max Tokens | Priority |
|:-----------|:-------------|:-----------|:---------|
| Listing | title + description + tags (concatenated) | 8192 | LOW |
| Search Query | normalized query text | 512 | HIGH |
| User Profile | category names weighted by affinity score | 2048 | LOW (batch) |
| Message | message content | 1024 | LOW |
| Company | name + description | 2048 | LOW |

**Processing Pipeline**:
```
1. Receive embedding request (entity_type, entity_id, text)
2. Normalize text: lowercase, remove HTML, truncate to model max tokens
3. Check semantic cache (request_hash lookup in Redis)
   → HIT: return cached vector, skip model call
   → MISS: continue
4. Route to Priority Queue (HIGH for queries, LOW for listings)
5. Call embedding model API with retry (3 attempts, 5s/15s/45s backoff)
6. Store result in ai_ops.semantic_cache (TTL: 7 days)
7. Store vector in entity table (listings.embedding_vector, etc.)
8. Emit ai.embedding_generated event
9. Update entity embedding_status = 'READY'
```

**Storage**:
- PostgreSQL pgvector: `listings.embedding_vector vector(1536)` with HNSW index
- Index config: `ef_construction=200, m=16` (balanced precision/speed)
- Redis semantic cache: Hash by `{model}:{sha256(normalized_text)}` → TTL 7 days

**Latency Targets**:
- Cache hit: <5ms
- HIGH priority (query embedding): <500ms P95
- LOW priority (listing embedding): <30s P95 (batch-processed)

**Failure Strategy**:
- API timeout (>10s): Queue for retry with exponential backoff
- Model unavailable: Mark entity `embedding_status: FAILED`, alert monitoring
- Retry exhausted (3 attempts): Dead-letter queue; daily retry cron

**Observability**:
- Metric: `ai.embedding.latency_ms` (histogram, by cache_hit)
- Metric: `ai.embedding.queue_depth` (gauge, by priority)
- Metric: `ai.embedding.success_rate` (counter)
- Alert: Embedding queue depth > 10,000 items for >15 min → P2

---

## 6.2 Semantic Search Contract

**Purpose**: Convert natural language queries into ranked listing results using vector similarity search

**Pipeline Integration**: Feeds Stage 1 of the 4-stage Discovery pipeline

**Inputs**:
```json
{
  "query_text": "string (raw user query, max 500 chars)",
  "tenant_id": "uuid",
  "user_id": "uuid | null",
  "filters": {
    "category_id": "uuid | null",
    "price_min_cents": "integer | null",
    "price_max_cents": "integer | null",
    "tags": ["string"] | null,
    "listing_type": ["string"] | null
  },
  "candidate_limit": 500,
  "session_context": {
    "preference_vector": [0.015, -0.024, ...] | null,
    "recent_clicks": ["listing_id"] | null
  }
}
```

**Outputs**:
```json
{
  "search_id": "uuid",
  "candidates": [
    {
      "listing_id": "uuid",
      "vector_similarity": 0.892,
      "distance": 0.108,
      "rank_position": 1
    }
  ],
  "query_embedding_latency_ms": 180,
  "vector_search_latency_ms": 12,
  "total_latency_ms": 195
}
```

**Vector Query**:
```sql
SELECT
  listing_id,
  (embedding_vector <=> $1::vector) AS distance,
  1 - (embedding_vector <=> $1::vector) AS similarity
FROM search_index.search_candidates
WHERE
  tenant_id = $2
  AND status = 'ACTIVE'
  AND ($3::uuid IS NULL OR category_path @> ARRAY[$3::uuid])
  AND ($4::integer IS NULL OR price_cents >= $4)
  AND ($5::integer IS NULL OR price_cents <= $5)
ORDER BY distance ASC
LIMIT 500;
```

**Models**: Query embedding: `text-embedding-3-small`

**Storage**: pgvector with HNSW index (ef_search=100 for <15ms queries)

**Latency Targets**:
- Query embedding: <200ms (cached: <5ms)
- Vector search (Stage 1): <15ms P95
- Combined: <220ms → fed into ranking pipeline

**Failure Strategy**:
- pgvector unavailable: Fall back to PostgreSQL full-text search (`tsvector`)
- Query embedding timeout: Use keyword-based matching only; flag result as `DEGRADED`

---

## 6.3 Recommendation Engine Contract

**Purpose**: Generate personalized listing recommendations using collaborative filtering, item-based similarity, and behavioral preference alignment

**Sub-Systems**:

### 6.3.1 User-Based Recommendations (Collaborative Filtering)
- **Model**: Matrix factorization on user-listing interaction matrix
- **Input**: User interaction history (views, clicks, favorites, purchases) from `personalization.interaction_history`
- **Update Frequency**: Batch nightly + real-time preference vector update (fast loop)
- **Output**: Top-25 recommended listing IDs with scores

### 6.3.2 Item-Based Similarity (Content + Collaborative)
- **Model**: Cosine similarity between listing embedding vectors + co-interaction signals
- **Input**: `search_index.search_candidates.embedding_vector` + `search_index.search_signals`
- **Update Frequency**: Recomputed weekly (listing similarity) + on new listing publish
- **Output**: Top-20 related listings per listing (stored in `recommendations.related_listings`)

### 6.3.3 Trending Engine
- **Model**: Exponential weighted moving average of engagement signals
- **Formula**: `score(t) = Σ (event_weight * e^(-λ * age_hours))`
  - `λ = 0.04` (24h half-life)
  - weights: click=1.0, favorite=2.0, lead=5.0, purchase=10.0
- **Update Frequency**: Hourly (hourly trending), daily (daily/weekly)
- **Output**: Top-50 trending listings per category + platform-wide

**Inputs** (unified):
```json
{
  "user_id": "uuid",
  "tenant_id": "uuid",
  "recommendation_type": "for_you" | "similar" | "trending" | "cross_sell",
  "context_listing_id": "uuid | null",
  "limit": 25,
  "exclude_listing_ids": ["uuid"],
  "surface": "homepage" | "detail_page" | "email"
}
```

**Outputs**:
```json
{
  "recommendations": [
    {
      "listing_id": "uuid",
      "score": 0.94,
      "score_components": {
        "collaborative_filter": 0.72,
        "content_similarity": 0.88,
        "freshness": 0.91,
        "trust_boost": 0.05
      },
      "reason_code": "SIMILAR_TO_VIEWED" | "POPULAR_IN_CATEGORY" | "TRENDING" | "RECENTLY_ADDED"
    }
  ],
  "model_version": "v2.3.1",
  "generated_at": "ISO-8601 UTC"
}
```

**Storage**: Snapshots in `recommendations.recommendation_snapshots` + Redis sorted sets for hot cache

**Latency Targets**:
- Cached snapshot retrieval: <10ms
- Fresh generation: <500ms (triggered when snapshot stale > 4h)

**Events Produced**: `recommendation.snapshot_generated`

**Failure Strategy**: Return trending listings as fallback when personalized recommendations unavailable

---

## 6.4 Ranking Engine Contract

**Purpose**: 4-stage candidate ranking pipeline for the Discovery feed

### Stage 1 — Vector Retrieval (see §6.2 Semantic Search)
Output: 500 candidates sorted by cosine distance

### Stage 2 — Light Ranking
**Model**: Deterministic scoring formula (no ML model — pure computation)

**Formula**:
```
light_score = (1 - vector_distance)
            × trust_score_tenant       [range: 0.2–1.0]
            × (1 + log(1 + bid_cpc))   [sponsored boost]
            × freshness_decay           [e^(-0.1 × age_days)]
            × quality_score             [range: 0.0–1.0]
```

**Inputs** (pre-computed in `search_index.ranking_feature_store`):
- `vector_similarity_precomputed` — from Stage 1
- `bid_modifier` — from active campaigns in Billing
- `trust_modifier` — from Trust Service trust scores
- `freshness_decay` — computed from listing `published_at`
- `quality_score` — AI-computed listing quality (0.0–1.0)

**Output**: Top 100 candidates with `light_score`

**Latency Target**: <10ms (all data pre-computed)

### Stage 3 — Neural Re-Ranking
**Model**: Cross-Encoder scoring model (fine-tuned `cross-encoder/ms-marco-MiniLM-L-12-v2`)

**Input**: 
- User preference vector (from Redis fast-loop cache)
- Top-100 light-ranked candidates with embeddings

**Computation**:
```
neural_score = cosine_similarity(user_preference_vector, listing_embedding_vector)
final_score = 0.6 × neural_score + 0.4 × light_score
```

**Output**: Top-25 candidates with `final_score`

**Latency Target**: <20ms P95
**Degradation**: If user preference vector unavailable → use category popularity

### Stage 4 — Exploration/Exploitation (ε-Greedy)
- **ε = 0.10**: 10% of feed slots (2–3 items per 25-item page) allocated to exploration
- Exploration candidates: New listings (<24h old) OR under-served categories (low impression share)
- MAB state: `search_index.exploration_bandit_state` updated on each feed generation
- **Regret bound**: O(√(nT)) where n = arm count, T = time periods

**Combined Pipeline Latency Budget**:
| Stage | Budget | Breach Action |
|:------|:-------|:-------------|
| Stage 1 (vector) | 15ms | Use keyword fallback |
| Stage 2 (light rank) | 10ms | Must not breach (deterministic) |
| Stage 3 (neural) | 20ms | Skip → use Stage 2 scores |
| Stage 4 (exploration) | 5ms | Must not breach (deterministic) |
| **Total P99** | **50ms** | **Return DEGRADED result** |

---

## 6.5 Personalization Engine Contract

**Purpose**: Maintain and update per-user preference vectors that drive the personalized discovery experience

### Fast Loop (Online — Sub-Second Updates)
**Trigger**: User click, view >3s, hover >1s, favorite, lead submission, purchase

**Update Formula**:
```
V_user(t) = α × V_user(t-1) + (1 - α) × V_item
```
- `α = 0.85` (decay rate — recent interactions weighted more)
- `V_item` = listing embedding vector (1536 dims)

**Implementation**:
1. Client sends interaction event to `POST /api/v1/interactions`
2. Event queued to Kafka `interactions` topic
3. Fast-loop consumer reads event, fetches listing embedding from cache
4. Computes update formula
5. Writes updated vector to Redis: `tenant:{tenant_id}:user:{user_id}:preference_vector` (TTL: 24h)

**Latency**: <200ms end-to-end (async; does not block feed response)

### Slow Loop (Offline — Daily Batch)
**Trigger**: Daily cron at 02:00 UTC

**Processing**:
1. Read interaction history from `personalization.interaction_history` (last 90 days)
2. Apply weighted averaging with category affinity normalization
3. Compute explicit preference overrides (multiply by 1.5× for user-declared preferences)
4. Store updated vector in `personalization.user_behavior_profiles`
5. Pre-warm Redis cache for active users (last 7 days)

**Outputs**:
- Persistent preference vector (PostgreSQL) — 1536 dims
- Category affinity scores (JSONB) — weighted scores per category
- Price range preference — {min, max, currency}
- Feature affinities — weighted scores per listing feature

**Events Produced**: `personalization.profile_updated`

---

## 6.6 Insight Generation Contract

**Purpose**: AI-powered business insights for tenant dashboard — listing performance analysis, market opportunity detection, competitor gap analysis

**Trigger**: On-demand request via API + scheduled weekly batch

**Inputs**:
- Tenant's listing catalog + performance metrics
- Market-wide aggregated signals (anonymized, no cross-tenant PII)
- AI model: `gpt-4o-mini` (cost-optimized for bulk insights)

**Output Contract**:
```json
{
  "insight_id": "uuid",
  "tenant_id": "uuid",
  "generated_at": "ISO-8601 UTC",
  "insights": [
    {
      "type": "LISTING_QUALITY" | "MARKET_OPPORTUNITY" | "PRICING" | "ENGAGEMENT",
      "priority": "HIGH" | "MEDIUM" | "LOW",
      "title": "string",
      "summary": "string (max 300 chars)",
      "detail": "string (max 2000 chars, markdown)",
      "action_items": ["string"],
      "affected_listing_ids": ["uuid"],
      "estimated_impact": "string | null",
      "confidence": 0.82
    }
  ],
  "model_used": "gpt-4o-mini",
  "tokens_consumed": 4200
}
```

**Latency Targets**: 
- On-demand: <15 seconds (user waits)
- Scheduled batch: <60 minutes for all active tenants

**Failure Strategy**: Return cached insights from last successful generation; never block dashboard load

---

## 6.7 Lead Scoring Contract

**Purpose**: AI-powered lead quality scoring to help agents prioritize follow-up

**Trigger**: `lead.created` event

**Model**: `gpt-4o-mini` with structured output (JSON schema)

**Inputs**:
```json
{
  "lead_message": "string",
  "listing_type": "string",
  "listing_price_cents": 29900,
  "buyer_history": {
    "previous_leads_count": 2,
    "conversion_rate": 0.5,
    "account_age_days": 120
  },
  "contact_completeness": {
    "has_phone": true,
    "has_company": false
  },
  "utm_source": "string | null"
}
```

**Output Contract**:
```json
{
  "lead_id": "uuid",
  "score": 0.83,
  "score_tier": "HOT" | "WARM" | "COLD",
  "scoring_factors": {
    "message_intent_clarity": 0.9,
    "buyer_credibility": 0.7,
    "contact_completeness": 0.8,
    "price_budget_alignment": 0.85
  },
  "recommended_action": "CALL_WITHIN_2H" | "EMAIL_TODAY" | "NURTURE",
  "key_signals": ["Mentions specific budget", "Has company email", "Asks technical questions"]
}
```

**Latency Target**: <5 seconds (user sees score within 5s of lead submission)

**Storage**: Written to `marketplace.leads.score` and `marketplace.leads.score_details`

**Events Produced**: `lead.scored`

---

## 6.8 Risk Scoring Contract

**Purpose**: Behavioral risk assessment for tenant accounts, companies, and users — feeding Trust Service

**Trigger**: Periodic (every 6 hours per active entity) + event-driven on anomaly signals

**Model**: Deterministic rule engine + `gpt-4o-mini` for pattern narration

**Risk Signals Evaluated**:
| Signal | Weight | Trigger |
|:-------|:-------|:--------|
| Login from new country | 0.2 | identity.user_login_success |
| Rapid listing creation (>20/hour) | 0.4 | listing.created |
| Unusual price patterns (>3σ from category median) | 0.3 | listing.created |
| Multiple failed payments | 0.35 | billing.invoice_payment_failed |
| High moderation rejection rate (>30%) | 0.5 | moderation.decision_made |
| Cross-account similarity detection | 0.6 | Periodic |
| Abnormal API usage volume | 0.25 | Quota monitoring |

**Scoring Formula**:
```
risk_score = min(1.0, Σ (signal_weight × signal_present × recency_decay))
```

**Output**:
```json
{
  "entity_id": "uuid",
  "entity_type": "TENANT" | "USER" | "COMPANY",
  "risk_score": 0.74,
  "risk_tier": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "active_signals": ["RAPID_LISTING_CREATION", "UNUSUAL_PRICE_PATTERN"],
  "recommended_action": "MANUAL_REVIEW" | "AUTO_QUARANTINE" | "IMMEDIATE_SUSPEND",
  "computed_at": "ISO-8601 UTC"
}
```

**Thresholds**:
- `risk_score < 0.3` → LOW (no action)
- `0.3 ≤ risk_score < 0.6` → MEDIUM (monitoring alert)
- `0.6 ≤ risk_score < 0.8` → HIGH (manual review queue)
- `risk_score ≥ 0.8` → CRITICAL (auto-quarantine + immediate admin alert)

---

## 6.9 Fraud Detection Contract

**Purpose**: Real-time multi-signal fraud detection to protect marketplace integrity

**Detection Methods**:

### Method 1: Velocity Rules (Real-Time)
- Listing creation: >20 listings/hour per tenant → FLAG
- Lead submission: >10 leads/hour from same IP → BLOCK
- API key usage: >1000 req/minute → RATE_LIMIT + ALERT
- Account creation: >5 accounts from same IP in 24h → BLOCK

### Method 2: Behavioral Fingerprinting (Near Real-Time, 5-min lag)
- Device fingerprint reuse across multiple tenant accounts
- Overlapping listing content similarity (>0.95 cosine between listings from different tenants)
- Coordinated pricing patterns (multiple accounts with identical price change timestamps)

### Method 3: AI Pattern Analysis (Async, 1-hour lag)
- Input: 7-day behavioral summary per entity
- Model: `gpt-4o-mini` + structured risk report
- Use case: Detect sophisticated fraud that rule engines miss

**Output**:
```json
{
  "fraud_detection_id": "uuid",
  "detection_method": "VELOCITY_RULE" | "BEHAVIORAL_FINGERPRINT" | "AI_PATTERN",
  "entity_id": "uuid",
  "entity_type": "TENANT" | "USER",
  "fraud_type": "FAKE_LISTINGS" | "REVIEW_MANIPULATION" | "PAYMENT_FRAUD" | "ACCOUNT_FARMING",
  "confidence": 0.91,
  "evidence": [ { "signal": "string", "value": "string" } ],
  "auto_action": "NONE" | "QUARANTINE" | "SUSPEND",
  "requires_human_review": true
}
```

**Events Produced**: `trust.fraud_detected`

---

## 6.10 Moderation Assistance Contract

**Purpose**: AI-first content moderation pre-screening — classify content before human review

**Trigger**: `listing.created`, `media.uploaded`, `messaging.message_sent`

**Model**: `gpt-4o-mini` with structured safety classification

**Content Classification Schema**:
```json
{
  "content_id": "uuid",
  "content_type": "LISTING_TEXT" | "IMAGE" | "MESSAGE",
  "classification": {
    "is_safe": true,
    "confidence": 0.97,
    "categories": {
      "spam": { "detected": false, "score": 0.02 },
      "misleading": { "detected": true, "score": 0.78 },
      "prohibited_item": { "detected": false, "score": 0.01 },
      "explicit_content": { "detected": false, "score": 0.00 },
      "violence": { "detected": false, "score": 0.00 },
      "hate_speech": { "detected": false, "score": 0.00 },
      "prompt_injection": { "detected": false, "score": 0.00 }
    }
  },
  "decision": "APPROVE" | "REJECT" | "ESCALATE_TO_HUMAN",
  "decision_reason": "string (max 200 chars)",
  "policy_violations": ["string"],
  "requires_human_review": false,
  "latency_ms": 840
}
```

**Decision Thresholds**:
- Any category score > 0.85 AND confidence > 0.90 → `REJECT` (automatic)
- Any category score 0.60–0.85 → `ESCALATE_TO_HUMAN`
- All categories < 0.60 → `APPROVE` (automatic)

**Image Safety**:
- Uses OpenAI Vision API with safety system prompt
- Additional: Hash-based matching against known CSAM/prohibited image hash lists

**Latency Targets**:
- Text classification: <2s P95
- Image classification: <5s P95

**Events Produced**: `moderation.ai_scan_completed`

---

# SECTION 7 — FRONTEND CONTRACTS

## 7.0 Frontend Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FRONTEND APPLICATIONS                           │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐ │
│  │  Marketplace Web │  │ Tenant Dashboard │  │  Super Admin     │ │
│  │  (Next.js SSR)   │  │ (Next.js SPA)    │  │  Console         │ │
│  │  marketplace.io  │  │ app.platform.io  │  │  admin.platform  │ │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘ │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Mobile Applications (React Native)              │  │
│  │                  iOS + Android (shared codebase)             │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### 7.0.1 Shared Technical Standards
- **Framework**: Next.js 15 (App Router) for all web applications
- **State Management**: Zustand (client state) + TanStack Query (server state)
- **Realtime Client**: Supabase Realtime JS client (managed connection pooling)
- **Auth Client**: Supabase Auth JS + custom JWT refresh middleware
- **Type Safety**: Full TypeScript strict mode; generated types from Supabase and OpenAPI schemas
- **Design System**: Shared component library across all 3 web apps (monorepo)
- **Testing**: Vitest (unit), Playwright (E2E), React Testing Library (component)

---

## 7.1 Application: Marketplace Web

**Domain**: `marketplace.platform.io`
**Rendering Strategy**: Hybrid SSR + ISR + CSR

### Pages Inventory

| Page | Route | Rendering | Auth |
|:-----|:------|:----------|:-----|
| Homepage / Feed | `/` | SSR + ISR (60s) | Optional |
| Search Results | `/search` | SSR (no cache) | Optional |
| Listing Detail | `/listings/{slug}` | ISR (120s) | Optional |
| Company Profile | `/companies/{slug}` | ISR (300s) | Optional |
| Category Browse | `/categories/{slug}` | ISR (300s) | Optional |
| Saved Searches | `/account/saved-searches` | CSR | Required |
| Favorites | `/account/favorites` | CSR | Required |
| Notifications Inbox | `/account/notifications` | CSR | Required |
| Lead Submission | `/listings/{slug}/contact` | CSR | Optional |
| Conversation Thread | `/messages/{id}` | CSR | Required |
| Registration | `/register` | CSR | None |
| Login | `/login` | CSR | None |
| Plan Selection | `/pricing` | SSG | None |

### Required APIs (per page)

**Homepage**:
- `POST /api/v1/feed` — personalized/anonymous feed
- `GET /api/v1/recommendations/trending` — trending sidebar
- `GET /api/v1/categories` — navigation categories
- `GET /api/v1/notifications` — unread count (if authenticated)

**Search Results**:
- `GET /api/v1/search` — search results
- `GET /api/v1/search/suggestions` — typeahead (debounced 150ms)

**Listing Detail**:
- `GET /api/v1/listings/{id}` — listing data
- `GET /api/v1/listings/{id}/related` — related listings
- `GET /api/v1/recommendations/for-you` — personalized recommendations widget

**Required Realtime Channels**:
- `tenant:{tenant_id}:notifications` — unread badge count (if authenticated)
- `tenant:{tenant_id}:feed` — saved search match alerts (if authenticated)

**Required Permissions**: All pages accessible to anonymous; authenticated features require JWT

**Caching Strategy**:
| Content | Cache Layer | TTL | Invalidation |
|:--------|:-----------|:----|:-------------|
| Category tree | CDN + ISR | 1 hour | On Super Admin update |
| Listing detail (anonymous) | CDN + ISR | 2 minutes | On listing update |
| Search results (anonymous) | CDN | 30 seconds | No |
| Feed (authenticated) | No cache | — | — |

**Offline Strategy**:
- Service Worker: Cache shell (header, navigation, fonts, icons)
- Offline fallback: Cached listing cards from last feed (stale-while-revalidate)
- PWA manifest: Installable; push notifications via FCM Web

**Error Handling**:
- Network error: Show cached content with stale indicator
- 404 Listing: Show "This listing is no longer available" + similar listings
- 500 API: Show skeleton with retry button; fallback to trending

**Core Web Vitals Targets**:
- LCP: <2.5s (homepage hero)
- INP: <200ms (feed interactions)
- CLS: <0.1 (layout stability during feed load)

---

## 7.2 Application: Tenant Dashboard

**Domain**: `app.platform.io` (or custom tenant domain)
**Rendering Strategy**: Full CSR SPA (no public SEO requirement)

### Modules Inventory

| Module | Route | Required APIs | Permissions |
|:-------|:------|:-------------|:------------|
| Dashboard Overview | `/dashboard` | `/analytics/dashboard` | viewer+ |
| Listing Manager | `/listings` | `/listings`, `/categories` | viewer+ |
| Listing Create/Edit | `/listings/new`, `/listings/{id}/edit` | `/listings`, `/media/upload-url` | editor+ |
| Lead Manager | `/leads` | `/leads` | editor+ |
| CRM Contacts | `/crm` | `/crm/contacts` | editor+ |
| Analytics | `/analytics` | `/analytics/*` | viewer+ |
| Campaigns | `/campaigns` | `/billing/campaigns` | admin+ |
| Team Members | `/team` | `/tenants/{id}/members` | admin+ |
| Billing | `/billing` | `/billing/*` | owner+ |
| Notifications | `/notifications` | `/notifications` | any |
| Messages | `/messages` | `/conversations` | any |
| Settings | `/settings` | `/tenants/{id}`, `/users/me` | admin+ |
| API Keys | `/settings/api-keys` | `/api-keys` | owner+ |

### Required Realtime Channels
- `tenant:{tenant_id}:notifications` — all authenticated users
- `tenant:{tenant_id}:analytics` — analytics dashboard (growth+ plan)
- `tenant:{tenant_id}:billing` — owner/admin users
- `tenant:{tenant_id}:moderation` — editor+ users (listing status updates)
- `conversations:{id}` — per conversation (messaging module)

### Required Permissions Matrix
| Module | Min Role | Plan Gate |
|:-------|:---------|:---------|
| Analytics basic | viewer | starter+ |
| Analytics advanced | viewer | growth+ |
| Analytics realtime | viewer | growth+ |
| AI Insights | editor | professional+ |
| Campaigns | admin | professional+ |
| API Keys | owner | starter+ |
| Custom Domain | owner | professional+ |

**Caching Strategy**:
- Analytics dashboard: TanStack Query staleTime=30s, refetchInterval=60s
- Listing list: staleTime=10s (frequent mutations)
- Billing data: staleTime=5m (slow-changing)
- Team members: staleTime=5m

**Offline Strategy**:
- Service Worker: Cache app shell; no offline data (dashboard requires live data)
- On network loss: Show connectivity banner; disable mutation actions

**Error Handling**:
- 401: Auto-refresh token; if refresh fails → redirect to `/login`
- 403: Show permission denied with role requirement explanation
- 429 Quota Exceeded: Show usage meter with upgrade CTA
- 500: Show retry toast; log to error monitoring

---

## 7.3 Application: Super Admin Console

**Domain**: `admin.platform.io` (private, VPN-restricted access)
**Rendering Strategy**: CSR SPA

### Modules Inventory

| Module | Route | Required APIs | Permissions |
|:-------|:------|:-------------|:------------|
| Platform Dashboard | `/` | `/admin/dashboard` | super_admin |
| Tenant List | `/tenants` | `/admin/tenants` | super_admin |
| Tenant Detail | `/tenants/{id}` | `/admin/tenants/{id}` | super_admin |
| Moderation Queue | `/moderation` | `/admin/moderation/queue` | super_admin, moderator |
| Moderation Case | `/moderation/{case_id}` | `/admin/moderation/cases/{id}` | super_admin, moderator |
| Trust & Fraud | `/trust` | `/admin/trust` | super_admin |
| Billing Override | `/billing` | `/admin/billing` | super_admin |
| Support Queue | `/support` | `/admin/support/tickets` | super_admin, support |
| Announcements | `/announcements` | `/admin/announcements` | super_admin |
| System Config | `/config` | `/admin/config` | super_admin |
| Audit Logs | `/audit` | `/admin/audit-logs` | super_admin |
| Analytics (Platform) | `/analytics` | `/admin/analytics` | super_admin |

### Required Realtime Channels
- `admin:platform` — platform health, fraud alerts, system events
- `admin:moderation` — moderation queue updates
- `platform:announcements` — for testing announcements

### Security Requirements for Admin Console
- MFA mandatory (no exceptions — enforced at login)
- Session TTL: 8 hours (reduced from standard 15-min access token, using sliding window)
- IP allowlist: Configurable CIDR ranges
- All actions: Audit logged with admin_user_id + IP + timestamp
- Inactivity timeout: 30 minutes → automatic logout

---

## 7.4 Application: Mobile Applications

**Platforms**: iOS 16+ and Android 10+
**Framework**: React Native (Expo managed workflow)
**Shared Code**: 90% shared with web dashboard via monorepo

### Screen Inventory (Marketplace Experience)

| Screen | Module | Required APIs | Realtime |
|:-------|:-------|:-------------|:---------|
| Onboarding | Auth | `/auth/register`, `/billing/plans` | — |
| Login | Auth | `/auth/login` | — |
| Home Feed | Discovery | `POST /feed` | feed channel |
| Search | Discovery | `GET /search`, `/search/suggestions` | — |
| Listing Detail | Marketplace | `GET /listings/{id}`, `/related` | — |
| Favorites | Marketplace | `GET /favorites` | — |
| Lead Form | Leads | `POST /listings/{id}/leads` | — |
| Messages | Messaging | `GET /conversations`, `/messages` | conversations channel |
| Notifications | Notifications | `GET /notifications` | notifications channel |
| Account | Profile | `GET/PATCH /users/me` | — |
| Dashboard (Tenant) | Analytics | `GET /analytics/dashboard` | analytics channel |
| Manage Listings | Listings | `GET /listings` | — |
| Leads Manager | CRM | `GET /leads` | — |

### Mobile-Specific Requirements

**Push Notifications**:
- Provider: Expo Push Notification Service (wraps FCM + APNs)
- Payload size limit: 4KB
- Notification types: LEAD_RECEIVED, MESSAGE_RECEIVED, LISTING_APPROVED, BILLING_ALERT
- Deep link format: `platform://listings/{id}`, `platform://conversations/{id}`

**Offline Strategy**:
- SQLite local cache: Last 50 feed items, all conversations, all notifications
- Background sync: Every 15 minutes when app is backgrounded
- Conflict resolution: Server-wins on all conflicts

**Performance Targets**:
- App cold start: <2s
- Feed first render: <800ms (from cached data)
- Search typeahead: <300ms (with debounce)

**Realtime on Mobile**:
- WebSocket connection maintained in background (30-min max without user interaction)
- On foreground: Reconnect + replay missed events
- Battery optimization: Reduce heartbeat to 60s when app is backgrounded

---

# SECTION 8 — AUTHORIZATION CONTRACTS

## 8.0 RBAC Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    AUTHORIZATION LAYERS                       │
│                                                              │
│  Layer 1: JWT Claims (role, tenant_id, plan_tier, scopes)   │
│  Layer 2: Role Permissions Matrix (static baseline)         │
│  Layer 3: Plan Feature Gates (dynamic, per plan_tier)       │
│  Layer 4: Resource Ownership (user owns resource?)          │
│  Layer 5: RLS Policies (database-level enforcement)         │
└──────────────────────────────────────────────────────────────┘
```

All 5 layers are evaluated in order. A request is ALLOWED only if it passes all applicable layers.

---

## 8.1 Role: Super Admin

**Scope**: Platform-wide; bypasses tenant isolation

**Permissions**: ALL PERMISSIONS on ALL resources

**JWT Claims**:
```json
{
  "role": "super_admin",
  "tenant_id": null,
  "scopes": ["*"]
}
```

**Allowed APIs**: All `/api/v1/*` and `/api/v1/admin/*` endpoints

**Restricted APIs**: None

**Realtime Access**: All channels including `admin:platform`, `admin:moderation`

**AI Access**: Unlimited (no tenant quota applied)

**Analytics Access**: Platform-wide analytics across all tenants

**Billing Access**: Full read + write; can apply billing overrides

**Additional Constraints**:
- MFA mandatory
- All actions written to `governance.audit_logs`
- Session limited to 8 hours
- Access from IP allowlist only

---

## 8.2 Role: Platform Admin

**Scope**: Platform operations; subset of Super Admin

**Permissions**: Read all tenant data; write moderation decisions; write announcements

**JWT Claims**:
```json
{
  "role": "platform_admin",
  "tenant_id": null,
  "scopes": ["moderation:write", "tenants:read", "announcements:write"]
}
```

**Allowed APIs**:
- `GET /api/v1/admin/tenants`
- `GET /api/v1/admin/moderation/*`
- `POST /api/v1/admin/moderation/cases/{id}/decide`
- `GET /api/v1/admin/analytics`
- `POST /api/v1/admin/announcements`

**Restricted APIs**:
- `POST /api/v1/admin/tenants/{id}/suspend` (super_admin only)
- `GET /api/v1/admin/audit-logs` (super_admin only)
- `POST /api/v1/admin/config` (super_admin only)

**Realtime Access**: `admin:platform` (read-only), `admin:moderation` (full)

**Analytics Access**: Platform-wide read-only

**Billing Access**: None

---

## 8.3 Role: Company Owner

**Scope**: Single tenant workspace; company-level authority

**Permissions**: Full control of company profile, all company listings, lead management, billing

**JWT Claims**:
```json
{
  "role": "owner",
  "tenant_id": "uuid",
  "org_id": "uuid",
  "plan_tier": "professional",
  "scopes": ["tenant:owner"]
}
```

**Allowed APIs**:
- All `GET/POST/PATCH/DELETE /api/v1/listings/*`
- All `GET/POST/PATCH /api/v1/companies/*`
- All `GET/POST/PATCH /api/v1/leads/*`
- All `GET/POST/PATCH/DELETE /api/v1/billing/*`
- `GET/POST/DELETE /api/v1/tenants/{id}/members/*`
- All analytics APIs scoped to their tenant

**Restricted APIs**:
- Any `/api/v1/admin/*` endpoints
- Any other tenant's data

**Realtime Access**: All tenant channels: feed, notifications, analytics, billing, moderation

**AI Access**: Full within plan quota

**Analytics Access**: Full tenant analytics

**Billing Access**: Full read + write (subscription, invoices, campaigns, usage)

---

## 8.4 Role: Company Admin

**Scope**: Single tenant; management access excluding billing ownership

**Permissions**: Manage listings, team members, leads, CRM; read billing

**Allowed APIs**:
- All listing APIs (own tenant)
- All lead and CRM APIs (own tenant)
- `GET` billing APIs (read-only)
- Team member management (cannot remove owner)
- Analytics APIs (own tenant)

**Restricted APIs**:
- `POST /api/v1/billing/subscription/upgrade` — owner only
- `DELETE /api/v1/tenants/{id}/members/{owner_id}` — cannot remove owner
- All `/api/v1/admin/*`

**Realtime Access**: feed, notifications, analytics, billing (read-only alerts), moderation

**Analytics Access**: Full tenant analytics

**Billing Access**: Read-only

---

## 8.5 Role: Manager

**Scope**: Single tenant; team-level content management

**Permissions**: Create/edit/publish listings; manage assigned leads; read analytics

**Allowed APIs**:
- `POST /api/v1/listings` — create
- `PATCH /api/v1/listings/{id}` — edit own listings
- `POST /api/v1/listings/{id}/publish` — publish own listings
- `GET /api/v1/listings` — read all tenant listings
- `GET/PATCH /api/v1/leads/*` — lead management
- `GET /api/v1/analytics/dashboard` — read analytics
- `POST /api/v1/media/upload-url` — media upload

**Restricted APIs**:
- `DELETE /api/v1/listings/{id}` — admin only
- All billing APIs
- Team member management
- Campaign creation

**Plan Gate**: No additional plan gate beyond editor role

---

## 8.6 Role: Agent

**Scope**: Single tenant; assigned lead management and communication

**Permissions**: View assigned listings and leads; reply to conversations

**Allowed APIs**:
- `GET /api/v1/listings` — read tenant listings
- `GET /api/v1/leads` — own assigned leads only
- `PATCH /api/v1/leads/{id}` — own assigned leads only
- `GET/POST /api/v1/conversations/*` — own conversations
- `POST /api/v1/interactions` — track interactions
- `GET /api/v1/notifications` — own notifications

**Restricted APIs**:
- All listing write APIs (cannot create/edit)
- All analytics APIs (no dashboard access)
- All billing APIs
- Team management

---

## 8.7 Role: Staff

**Scope**: Single tenant; read-only operational access

**Permissions**: Read listings, leads (assigned), conversations; no write access

**Allowed APIs** (GET only):
- `GET /api/v1/listings` — read tenant listings
- `GET /api/v1/leads` — assigned leads only
- `GET /api/v1/conversations` — own conversations only
- `GET /api/v1/notifications` — own notifications

**Restricted APIs**: ALL write/mutation APIs

---

## 8.8 Role: Viewer

**Scope**: Single tenant; read-only dashboard access

**Permissions**: View listing performance; read analytics; no operational access

**Allowed APIs** (GET only):
- `GET /api/v1/listings` — read tenant listings
- `GET /api/v1/analytics/*` — read analytics (plan-gated)
- `GET /api/v1/notifications` — own notifications

**Restricted APIs**: ALL write/mutation APIs; ALL lead APIs; ALL billing APIs

---

## 8.9 Role: Customer (Buyer)

**Scope**: Marketplace only; no tenant dashboard access

**Permissions**: Browse listings; submit leads; manage favorites; send/receive messages

**Allowed APIs**:
- All `GET /api/v1/listings/*` — read public listings
- `POST /api/v1/listings/{id}/leads` — submit leads
- `GET/POST /api/v1/favorites` — manage favorites
- `GET/POST /api/v1/conversations` — messaging
- `GET/POST /api/v1/search/*` — search
- `POST /api/v1/feed` — personalized feed
- `POST /api/v1/interactions` — clickstream
- `GET/PATCH /api/v1/users/me` — own profile
- `GET/POST /api/v1/notifications` — own notifications

**Restricted APIs**: ALL tenant dashboard APIs; ALL billing APIs; ALL admin APIs

---

## 8.10 Role: Anonymous

**Scope**: Public marketplace browsing; no authentication

**Permissions**: Read public listing data; submit leads with contact form; browse search

**Allowed APIs** (rate-limited):
- `POST /api/v1/feed` — anonymous feed (category-based, not personalized)
- `GET /api/v1/search` — search results
- `GET /api/v1/search/suggestions` — typeahead
- `GET /api/v1/listings/{id}` — listing detail (public fields only)
- `GET /api/v1/categories` — category tree
- `POST /api/v1/listings/{id}/leads` — lead submission (requires name + email)
- `GET /api/v1/billing/plans` — public pricing
- `GET /api/v1/recommendations/trending` — trending listings
- `POST /api/v1/auth/register` — registration
- `POST /api/v1/auth/login` — login

**Restricted APIs**: ALL authenticated endpoints; ALL analytics; ALL billing; ALL admin

**Realtime Access**: None (no WebSocket connections for anonymous users)

---

## 8.11 Permission Matrix Summary

| Permission | super_admin | platform_admin | owner | admin | manager | agent | staff | viewer | customer | anonymous |
|:-----------|:-----------:|:--------------:|:-----:|:-----:|:-------:|:-----:|:-----:|:------:|:--------:|:---------:|
| **Listings: Create** | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Listings: Read (own tenant)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Listings: Read (public)** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Listings: Edit (own)** | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Listings: Delete** | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Leads: View (own)** | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Leads: Manage** | ✅ | ❌ | ✅ | ✅ | ✅ | ✅* | ❌ | ❌ | ❌ | ❌ |
| **Analytics: Basic** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Analytics: Advanced** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Analytics: Platform** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Billing: Read** | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Billing: Manage** | ✅ | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Team: Manage** | ✅ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Moderation: Decide** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **AI: Chat Completions** | ✅ | ❌ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **AI: Embeddings** | ✅ | ❌ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Admin Console** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Config: System** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Audit Logs** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Suspend Tenant** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Agent manages only assigned leads

---

## 8.12 Plan-Based Feature Gates

| Feature | Free | Starter | Professional | Business | Enterprise |
|:--------|:----:|:-------:|:------------:|:--------:|:----------:|
| Active Listings | 5 | 50 | 500 | 5,000 | Unlimited |
| Seats | 2 | 5 | 20 | 100 | Unlimited |
| AI Tokens/month | 10K | 100K | 1M | 10M | Custom |
| Storage | 1GB | 10GB | 100GB | 1TB | Custom |
| Analytics: Basic | ✅ | ✅ | ✅ | ✅ | ✅ |
| Analytics: Advanced | ❌ | ❌ | ✅ | ✅ | ✅ |
| Analytics: Realtime | ❌ | ❌ | ✅ | ✅ | ✅ |
| Custom Domain | ❌ | ❌ | ✅ | ✅ | ✅ |
| AI Insights | ❌ | ❌ | ✅ | ✅ | ✅ |
| Promoted Campaigns | ❌ | ✅ | ✅ | ✅ | ✅ |
| API Access | ❌ | ✅ | ✅ | ✅ | ✅ |
| Priority Support | ❌ | ❌ | ✅ | ✅ | ✅ |
| SSO/SAML | ❌ | ❌ | ❌ | ✅ | ✅ |
| Dedicated CSM | ❌ | ❌ | ❌ | ❌ | ✅ |
| SLA Guarantee | ❌ | ❌ | ❌ | 99.9% | 99.99% |

---

## 8.13 Database-Level RLS Policies

All tenant-scoped tables implement the following RLS pattern:

```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE marketplace.listings ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policy (applied to ALL tenant-scoped tables)
CREATE POLICY tenant_isolation ON marketplace.listings
  AS PERMISSIVE
  FOR ALL
  TO authenticated_role
  USING (
    tenant_id = NULLIF(
      current_setting('app.current_tenant_id', true), ''
    )::uuid
  );

-- Super Admin bypass policy (applied to governance-read-only tables)
CREATE POLICY super_admin_bypass ON marketplace.listings
  AS PERMISSIVE
  FOR SELECT
  TO super_admin_role
  USING (true);  -- No tenant filter — sees all tenants

-- Owner-only write policy example (listing mutations)
CREATE POLICY listing_owner_write ON marketplace.listings
  AS RESTRICTIVE
  FOR UPDATE, DELETE
  TO authenticated_role
  USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    AND (
      -- Only listing owner or admin can modify
      created_by_user_id = auth.uid()
      OR current_setting('app.current_user_role', true) IN ('admin', 'owner')
    )
  );
```

**Context Setting Protocol** (required on every database connection):
```sql
-- Set at connection time by API gateway middleware
SELECT set_config('app.current_tenant_id', $1, true);
SELECT set_config('app.current_user_id', $2, true);
SELECT set_config('app.current_user_role', $3, true);
```

**RLS Performance Rules**:
1. All `tenant_id` columns are indexed (B-tree)
2. `app.current_tenant_id` is injected from JWT claim at gateway — never computed in DB
3. Complex RLS policies use function-based indexes where possible
4. RLS policies evaluated BEFORE query execution (no full-table scan)
5. Maximum 3 policy conditions per table (prevents nested subquery performance issues)
