# SPEC 06 — AI SYSTEMS SPECIFICATION

> **Basis**: [PLANNER.md §7](file:///home/mohal665544/pr1/PLANNER.md) — Master AI Operating Model
> **Status**: Execution-Ready v2 (Full Depth)
> **Version**: 2.0.0
> **Last Updated**: 2026-05-30

---

## 1. AI Infrastructure System Architecture

The AI Infrastructure Domain is the platform's **Cognitive Kernel** — a unified, resource-governed gateway that abstracts all model inference, embedding generation, and AI-driven operations from the rest of the system. It operates with the discipline of an OS kernel: quota enforcement, priority scheduling, semantic caching, provider circuit-breaking, and comprehensive telemetry.

### 1.1 Architectural Overview

```
┌────────────────────────────────────────────────────────────────────────────┐
│                         AI INFRASTRUCTURE DOMAIN                           │
│                                                                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐ │
│  │   Inference │  │   Token     │  │  Semantic   │  │  Queue           │ │
│  │   Gateway   │  │   Guard     │  │  Cache      │  │  Scheduler       │ │
│  │  (Router)   │  │  (Budgets)  │  │  (Redis)    │  │  (Priority)      │ │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └────────┬─────────┘ │
│         │                │                │                   │           │
│         └────────────────┴────────────────┴───────────────────┘           │
│                                     │                                      │
│                          ┌──────────▼──────────┐                          │
│                          │   Model Registry     │                          │
│                          │   Prompt Registry    │                          │
│                          │   Policy Engine      │                          │
│                          │   Telemetry Bus      │                          │
│                          └──────────────────────┘                          │
└────────────────────────────────────────────────────────────────────────────┘
          │                    │                    │
    ┌─────▼─────┐       ┌──────▼──────┐     ┌──────▼──────┐
    │  OpenAI   │       │  Anthropic  │     │  Local LLM  │
    │  API      │       │  API        │     │  (Ollama/   │
    │           │       │             │     │   vLLM)     │
    └───────────┘       └─────────────┘     └─────────────┘
```

### 1.2 Core Component Responsibilities

| Component | Primary Responsibility | Failure Mode |
|:----------|:----------------------|:------------|
| Inference Gateway | Route inference requests to optimal provider | Activate fallback chain |
| Token Guard | Enforce per-tenant token budgets | Reject with HTTP 429, emit quota event |
| Semantic Cache | Return cached responses for semantically similar prompts | Bypass cache, call provider directly |
| Queue Scheduler | Prioritize inference jobs; prevent noisy-neighbor starvation | Shed low-priority jobs, protect high-priority |
| Model Registry | Track available models, capabilities, health, costs | Disable unhealthy models, activate alternates |
| Prompt Registry | Manage versioned prompt templates | Serve last-known-good version |
| Policy Engine | Enforce AI usage policies (content filters, output restrictions) | Reject non-compliant requests |
| Telemetry Bus | Emit usage events, trace spans, billing signals | Log to disk buffer, retry on recovery |

---

## 2. Model Registry Specification

### 2.1 Model Registry Table: `ai_cache.model_registry`

| Column | Type | Constraints | Description |
|:-------|:-----|:-----------|:------------|
| `model_id` | VARCHAR(100) | PRIMARY KEY | Platform identifier (e.g., `gpt-4o`, `claude-3-5-sonnet`) |
| `display_name` | VARCHAR(200) | NOT NULL | Human-readable name |
| `provider` | VARCHAR(50) | NOT NULL | `openai`, `anthropic`, `google`, `local`, `azure` |
| `provider_model_name` | VARCHAR(200) | NOT NULL | Provider's actual model identifier |
| `capabilities` | JSONB | NOT NULL | Array: `chat`, `embedding`, `vision`, `function_calling`, `json_mode` |
| `context_window_tokens` | INTEGER | NOT NULL | Maximum context length |
| `max_output_tokens` | INTEGER | NOT NULL | Maximum completion length |
| `embedding_dimensions` | INTEGER | NULL | Only for embedding models |
| `cost_per_1k_input_tokens` | DECIMAL(10,6) | NOT NULL | USD cost for input/prompt tokens |
| `cost_per_1k_output_tokens` | DECIMAL(10,6) | NOT NULL | USD cost for output/completion tokens |
| `cost_per_1k_embeddings` | DECIMAL(10,6) | NULL | USD cost per 1K embedding requests |
| `avg_latency_p50_ms` | INTEGER | NULL | Observed median latency (tracked by telemetry) |
| `avg_latency_p99_ms` | INTEGER | NULL | Observed P99 latency |
| `status` | VARCHAR(20) | NOT NULL | `active`, `degraded`, `offline`, `deprecated` |
| `fallback_model_id` | VARCHAR(100) | FK → model_registry | Model to use if this fails |
| `rate_limit_rpm` | INTEGER | NULL | Provider rate limit (requests per minute) |
| `rate_limit_tpm` | INTEGER | NULL | Provider rate limit (tokens per minute) |
| `min_plan_tier` | VARCHAR(20) | NOT NULL | `starter`, `growth`, `premium`, `enterprise` |
| `is_semantic_cacheable` | BOOLEAN | NOT NULL DEFAULT true | Whether responses can be cached |
| `output_filter_required` | BOOLEAN | NOT NULL DEFAULT false | Whether output must pass content filter |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

### 2.2 Model Lifecycle States

```
OFFLINE ──▶ ACTIVE ──▶ DEGRADED ──▶ OFFLINE
                 │                      │
                 ▼                      ▼
            DEPRECATED            (remove after
                 │                 90-day grace)
                 ▼
          (delete registry entry)
```

**State Transitions:**
- `OFFLINE → ACTIVE`: Manual operator promotion or automated health check recovery.
- `ACTIVE → DEGRADED`: When provider health check fails 3 consecutive checks (30-second interval).
- `DEGRADED → OFFLINE`: When degraded for > 5 minutes without recovery.
- `ACTIVE → DEPRECATED`: Manual operator action when newer model replaces it.

### 2.3 Provider Health Monitoring

**Health Check Protocol:**
- Every 30 seconds, the AI Gateway issues a minimal inference request to each `ACTIVE` model.
- Health check request: 5-token prompt ("ping"), 5-token max output.
- Timeout: 3 seconds.
- If timeout or non-2xx response: mark as health check failure.
- 3 consecutive failures → status set to `DEGRADED`, fallback activated.
- Recovery: 2 consecutive successes after `DEGRADED` → restore to `ACTIVE`.

**Provider Health Tracking Table: `ai_cache.provider_health`**

| Column | Type | Description |
|:-------|:-----|:------------|
| `provider` | VARCHAR(50) | Provider identifier |
| `model_id` | VARCHAR(100) | Specific model |
| `last_check_at` | TIMESTAMPTZ | Last health check timestamp |
| `is_healthy` | BOOLEAN | Current health state |
| `consecutive_failures` | INTEGER | Streak counter |
| `avg_latency_24h_ms` | INTEGER | Rolling 24-hour average |
| `error_rate_1h_pct` | DECIMAL(5,2) | 1-hour error percentage |

---

## 3. Prompt Registry Specification

### 3.1 Prompt Registry Table: `ai_cache.prompt_registry`

| Column | Type | Constraints | Description |
|:-------|:-----|:-----------|:------------|
| `prompt_id` | UUID | PRIMARY KEY | |
| `prompt_name` | VARCHAR(200) | NOT NULL | Identifier (e.g., `trust_moderation_v1`) |
| `version` | INTEGER | NOT NULL | Monotonically increasing |
| `domain` | VARCHAR(50) | NOT NULL | Owner domain (e.g., `trust`, `discovery`, `marketplace`) |
| `template` | TEXT | NOT NULL | Handlebars-style template with `{{variable}}` placeholders |
| `system_prompt` | TEXT | NULL | Optional system role prefix |
| `default_model_id` | VARCHAR(100) | FK → model_registry | Recommended model |
| `parameters_schema` | JSONB | NOT NULL | JSON Schema of required template variables |
| `max_input_tokens` | INTEGER | NOT NULL | Maximum allowed input token budget |
| `max_output_tokens` | INTEGER | NOT NULL | Maximum allowed output token budget |
| `temperature` | DECIMAL(3,2) | NOT NULL DEFAULT 0.7 | Default sampling temperature |
| `output_format` | VARCHAR(20) | NOT NULL | `text`, `json`, `structured` |
| `output_schema` | JSONB | NULL | JSON Schema for structured output validation |
| `is_active` | BOOLEAN | NOT NULL DEFAULT true | |
| `created_by` | VARCHAR(100) | NOT NULL | Platform operator who created |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `deprecated_at` | TIMESTAMPTZ | NULL | When deprecated |

### 3.2 Platform Prompt Catalog

| Prompt Name | Domain | Purpose | Output Format |
|:-----------|:-------|:--------|:-------------|
| `trust_content_moderation_v1` | Trust & Safety | Analyze listing content for policy violations | JSON: `{violation_found, categories, risk_score, reasoning}` |
| `trust_fraud_analysis_v1` | Trust & Safety | Analyze behavioral pattern for fraud signals | JSON: `{fraud_probability, indicators, recommended_action}` |
| `marketplace_listing_enhancement_v1` | Marketplace | Suggest improved listing title/description | JSON: `{enhanced_title, enhanced_description, suggested_tags}` |
| `discovery_query_intent_v1` | Discovery | Classify search query intent (fallback model) | JSON: `{intent_class, confidence, extracted_filters}` |
| `discovery_explanation_generation_v1` | Discovery | Generate human-readable feed item explanations | text: explanation string |
| `ai_qa_response_v1` | Marketplace | Answer user questions about a listing | text: answer |
| `ai_compare_listings_v1` | Discovery | Compare multiple listings side-by-side | JSON: `{comparison_table, recommendation}` |
| `support_ticket_triage_v1` | Governance | Categorize support tickets | JSON: `{category, priority, suggested_response}` |

### 3.3 Prompt Versioning Rules

- Prompts are **immutable once deployed** (`is_active = true`).
- To update a prompt: create a new record with `version + 1`, `is_active = false` initially.
- Canary promotion: activate new version for 10% of traffic via feature flag for 48 hours.
- If error rate or output quality degrades: rollback by setting new version `is_active = false`.
- Old versions remain readable for auditability. `deprecated_at` set when fully replaced.

---

## 4. Inference Gateway Specification

### 4.1 Request Lifecycle

```
[Inference Request]
        │
        ▼
[1. Token Guard Pre-Check]
   └─ Quota remaining?
   ├─ YES → Continue
   └─ NO → Return 429, emit monetization.quota_exceeded
        │
        ▼
[2. Policy Engine Check]
   └─ Request compliant with tenant AI policy?
   ├─ YES → Continue
   └─ NO → Return 403, log policy violation
        │
        ▼
[3. Semantic Cache Lookup]
   └─ Cache hit (cosine similarity ≥ 0.96)?
   ├─ HIT → Return cached response, emit ai.cache_hit
   └─ MISS → Continue to inference
        │
        ▼
[4. Queue Scheduler Assignment]
   └─ Assign to HIGH or LOW priority queue
   └─ Apply per-tenant concurrency limit
        │
        ▼
[5. Model Selection]
   └─ Select optimal model per routing rules
   └─ Check model health status
        │
        ▼
[6. Provider API Call]
   └─ Execute with timeout
   ├─ SUCCESS → Continue
   └─ FAILURE → Execute fallback chain (max 2 fallbacks)
        │
        ▼
[7. Output Filter]
   └─ Apply content policy filter if required
        │
        ▼
[8. Cache Write]
   └─ Store embedding + response in semantic cache
        │
        ▼
[9. Telemetry Emit]
   └─ Write usage to outbox (ai.inference_completed)
   └─ Update token deduction in Token Guard
        │
        ▼
[Response returned to caller]
```

### 4.2 Model Routing Rules

**Routing Priority Order (applied sequentially):**

1. **Explicit model override**: If caller specifies `model` in request AND tenant plan permits that model → use it.
2. **Prompt registry default**: If `prompt_name` provided → use `prompt_registry.default_model_id`.
3. **Task-type routing**: Route by `task_type` field:
   - `EMBEDDING` → Always use `text-embedding-3-small` (cost-optimized).
   - `CHAT_FAST` → Prefer `gpt-4o-mini` or `claude-3-haiku` (low latency).
   - `CHAT_QUALITY` → Prefer `gpt-4o` or `claude-3-5-sonnet` (high quality).
   - `VISION` → Prefer `gpt-4o` (vision capability required).
   - `FUNCTION_CALLING` → Prefer `gpt-4o` (reliable structured output).
4. **Cost optimization**: If no quality requirement specified → route to cheapest model with sufficient capability.
5. **Load balancing**: If multiple eligible models → round-robin with health-weighting.

### 4.3 Fallback Chain

```
Primary Model (e.g., gpt-4o)
    │
    ├─ Timeout (3s) or Error → Fallback 1 (e.g., gpt-4o-mini)
    │
    └─ Fallback 1 Timeout/Error → Fallback 2 (e.g., local Llama-3-8B via Ollama)
                │
                └─ All fail → Return 503, emit ai.provider_all_failed
```

**Fallback Rules:**
- Maximum 2 fallback levels.
- Total request timeout (including fallbacks): 10 seconds for HIGH priority, 30 seconds for LOW priority.
- Fallback model must match the original request's required capabilities (e.g., cannot fallback from vision model to text-only model).
- Each fallback attempt is logged separately in `token_usage_log` with `is_fallback = true`.

---

## 5. Token Guard Engine Specification

### 5.1 Budget Architecture

The Token Guard implements a **hierarchical quota system** with three budget levels:

| Budget Level | Scope | Reset Frequency | Storage |
|:------------|:------|:---------------|:--------|
| Monthly Platform Budget | Per tenant, per plan | Monthly billing cycle | PostgreSQL `billing_ledger.usage_meters` |
| Daily Soft Limit | Per tenant | Daily at 00:00 UTC | Redis counter with TTL |
| Per-Request Hard Limit | Per single inference call | Per request | Checked inline |

**Plan Token Budgets:**

| Plan Tier | Monthly AI Token Budget | Daily Soft Limit | Max Tokens per Request |
|:----------|:-----------------------|:----------------|:----------------------|
| `starter` | 500,000 | 25,000 | 4,000 |
| `growth` | 5,000,000 | 250,000 | 16,000 |
| `premium` | 50,000,000 | 2,500,000 | 64,000 |
| `enterprise` | Unlimited (metered) | No daily limit | 128,000 |

### 5.2 Leaky Bucket Implementation

**Algorithm:** Token Bucket (complementary to leaky bucket for burst tolerance)

- **Bucket Capacity:** Equal to plan's daily soft limit.
- **Refill Rate:** `daily_limit / 86400` tokens per second (continuous drip).
- **Deduction:** On each inference completion, deduct `(input_tokens + output_tokens)` from bucket.
- **Pre-flight Check:** Before inference, estimate token cost (input token count × 1.5 heuristic for output). If remaining balance < estimated cost → reject.

**Redis Implementation:**
```
Key: token_guard:{tenant_id}:daily_bucket
Type: Redis HASH
Fields:
  remaining_tokens: integer
  last_refill_at: unix_timestamp
  total_consumed_today: integer
TTL: 86400 seconds (reset daily)
```

**Atomic Deduction (Lua Script):**
- All bucket operations execute as atomic Lua scripts in Redis to prevent race conditions under concurrent inference requests.
- Script: Check remaining, compute refill since last_refill_at, deduct request tokens, return new balance.

### 5.3 Quota Enforcement Decision Tree

```
[Inference Request] → [Pre-flight Check]
    │
    ├─ Per-request token limit exceeded?
    │   YES → Reject with HTTP 400 (request too large)
    │
    ├─ Monthly budget exhausted?
    │   YES → Reject with HTTP 429, emit monetization.quota_exceeded
    │
    ├─ Daily soft limit exceeded?
    │   YES → 
    │     ├─ HIGH priority queue? → Allow with warning header X-Quota-Warning
    │     └─ LOW priority queue? → Reject with HTTP 429
    │
    └─ All checks pass → Allow inference
```

### 5.4 Credit System Integration

- Tenants can purchase **AI Credits** that extend token budget beyond plan limits.
- Credit balance stored in `billing_ledger.credit_balances`.
- When monthly plan tokens exhausted: Token Guard checks credit balance.
- If credits available: deduct from credits at `$0.002` per 1K tokens (standard rate).
- Credit depletion below 10%: emit `monetization.credit_low` event (triggers user notification).
- Credit depletion to 0: switch to plan quota exhaustion behavior.

---

## 6. Semantic Cache Engine Specification

### 6.1 Cache Architecture

**Two-Layer Cache:**

| Layer | Storage | Scope | TTL | Hit Rate Target |
|:------|:--------|:------|:----|:---------------|
| L1 (Hot) | Redis (in-memory) | Tenant-scoped | 1 hour | >80% for repeated queries |
| L2 (Warm) | pgvector `inference_cache` table | Tenant-scoped | 7 days | >60% for similar queries |

### 6.2 Semantic Similarity Cache Lookup

**Process:**
1. Generate embedding of the incoming prompt: `embed(prompt_text)` → `Vector(1536)`.
2. Search L1 Redis cache using approximate vector similarity (Redis RediSearch or custom approach).
3. If L1 miss, query L2 pgvector: `SELECT response FROM inference_cache WHERE tenant_id = :tid ORDER BY prompt_embedding <=> :query_embedding LIMIT 1` with post-filter: `WHERE distance < 0.04`.
4. If L2 miss: proceed to provider. On response: store in both L1 and L2.

**Similarity Threshold:** Cosine similarity ≥ 0.96 (cosine distance ≤ 0.04).

**Cache Key Architecture:**
- L1 Redis: `ai_cache:l1:{tenant_id}:{model_id}:{sha256(prompt_hash_prefix)}`
- Not stored as a vector in Redis at L1; use exact hash for L1 hits, vector for L2.

**Cache Invalidation Rules:**
- Prompt template version change: invalidate all cache entries with matching `prompt_name`.
- Model version update: invalidate all entries using old model.
- Manual cache flush: Admin API `DELETE /api/v1/admin/ai/cache/{tenant_id}`.
- Automatic TTL expiry.

### 6.3 Cache Governance

| Rule | Specification |
|:-----|:------------|
| Cache bypass | Requests with `bypass_cache: true` skip lookup but still write on response |
| Temperature bypass | Requests with `temperature > 0.2` are not cached (non-deterministic) |
| Max cached response size | 16KB. Larger responses stored in S3 with pointer in cache record |
| Tenant isolation | Cache queries ALWAYS include `tenant_id` filter — no cross-tenant cache hits |
| Content sensitivity | Requests classified as `sensitive` by Policy Engine bypass cache |

---

## 7. Queue Scheduler Specification

### 7.1 Queue Architecture

```
┌─────────────────────────────────────────────────────┐
│                  QUEUE SCHEDULER                     │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │         HIGH PRIORITY QUEUE                    │  │
│  │  - User-facing chat / search interpretation   │  │
│  │  - Active agent invocations                   │  │
│  │  - Real-time moderation (blocking)            │  │
│  │  Worker Pool: 20 threads                      │  │
│  │  SLA: <200ms completion                       │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │         LOW PRIORITY QUEUE                    │  │
│  │  - Batch embedding generation                 │  │
│  │  - Async safety scans                         │  │
│  │  - Offline analytics summarization            │  │
│  │  - Listing enhancement suggestions            │  │
│  │  Worker Pool: 10 threads (spot instances OK)  │  │
│  │  SLA: Best-effort (<5 minutes)                │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 7.2 Priority Assignment Rules

| Request Source | Priority | Rationale |
|:--------------|:---------|:---------|
| `POST /api/v1/ai/chat/completions` (user-facing) | HIGH | User waiting for response |
| `POST /api/v1/ai/embeddings` (query embedding) | HIGH | Blocks search/feed response |
| `trust.content_quarantined` processing | HIGH | Blocks listing activation |
| `marketplace.listing_created` embedding | LOW | Background, non-blocking |
| Batch re-embedding on model update | LOW | Maintenance task |
| Analytics summarization | LOW | Non-interactive |
| Listing enhancement suggestions | LOW | Nice-to-have, no urgency |

### 7.3 Concurrency Limits

Per-tenant concurrency limits prevent noisy-neighbor token starvation:

| Plan Tier | Max Concurrent HIGH | Max Concurrent LOW | Queue Depth Limit |
|:----------|:-------------------|:-------------------|:-----------------|
| `starter` | 2 | 5 | 50 |
| `growth` | 5 | 20 | 200 |
| `premium` | 20 | 50 | 1,000 |
| `enterprise` | 100 | 200 | 10,000 |

**When queue depth limit is reached:** New LOW priority requests return HTTP 429 with `Retry-After: 60`. HIGH priority requests are always accepted (shed LOW jobs if necessary).

### 7.4 Job Expiry

- HIGH priority jobs: expire after 5 seconds in queue (return timeout error if not started).
- LOW priority jobs: expire after 10 minutes in queue (dropped silently, logged as `ai.job_expired`).

---

## 8. AI Policy Engine Specification

### 8.1 Policy Table: `ai_cache.ai_policies`

| Column | Type | Description |
|:-------|:-----|:------------|
| `policy_id` | UUID | PRIMARY KEY |
| `tenant_id` | UUID | FK: applies to specific tenant (NULL = platform default) |
| `policy_name` | VARCHAR(100) | e.g., `content_filter_strict`, `no_vision` |
| `policy_type` | VARCHAR(50) | `MODEL_RESTRICTION`, `CONTENT_FILTER`, `OUTPUT_SCHEMA`, `RATE_OVERRIDE` |
| `config` | JSONB | Policy-specific configuration |
| `priority` | INTEGER | Higher = evaluated first |
| `is_active` | BOOLEAN | |
| `created_at` | TIMESTAMPTZ | |

**Policy Types:**

| Type | Configuration Fields | Effect |
|:-----|:-------------------|:-------|
| `MODEL_RESTRICTION` | `allowed_models: string[]`, `blocked_models: string[]` | Restrict which models tenant can use |
| `CONTENT_FILTER` | `filter_level: STRICT | MODERATE | PERMISSIVE` | Apply output content filtering |
| `OUTPUT_SCHEMA` | `required_schema: jsonb` | Force structured JSON output validation |
| `RATE_OVERRIDE` | `max_rpm: integer`, `max_tpm: integer` | Override default rate limits for tenant |
| `TOPIC_RESTRICTION` | `blocked_topics: string[]` | Block inference on specific topic patterns |

### 8.2 Content Filter Implementation

- **Level: STRICT** (default for starter/growth): Output passed through policy classifier. Topics: adult content, violence, discrimination, illegal activities. If violation detected: request rejected, `ai.output_policy_violation` event emitted.
- **Level: MODERATE** (premium/enterprise default): Filter only explicitly illegal content. Log violations but do not block.
- **Level: PERMISSIVE** (enterprise with signed contract): Minimal filtering. Log-only mode.

---

## 9. AI Experiments Specification

### 9.1 AI Experiments Table: `ai_cache.ai_experiments`

| Column | Type | Description |
|:-------|:-----|:------------|
| `experiment_id` | UUID | PRIMARY KEY |
| `experiment_name` | VARCHAR(200) | |
| `experiment_type` | VARCHAR(50) | `MODEL_COMPARISON`, `PROMPT_COMPARISON`, `TEMPERATURE_SWEEP` |
| `control_config` | JSONB | Control group model/prompt configuration |
| `treatment_config` | JSONB | Treatment group configuration |
| `traffic_split_pct` | INTEGER | Percentage of traffic to treatment (0–50) |
| `tenant_id` | UUID | NULL = platform-wide experiment |
| `metric_primary` | VARCHAR(100) | e.g., `user_satisfaction_score`, `latency_p50_ms` |
| `status` | VARCHAR(20) | `DRAFT`, `RUNNING`, `CONCLUDED`, `ARCHIVED` |
| `started_at` | TIMESTAMPTZ | |
| `concluded_at` | TIMESTAMPTZ | |
| `winner` | VARCHAR(20) | `CONTROL`, `TREATMENT`, `NO_SIGNIFICANT_DIFFERENCE` |
| `conclusion_notes` | TEXT | |

---

## 10. AI Usage Telemetry Specification

### 10.1 Token Usage Log Table: `ai_cache.token_usage_log`

| Column | Type | Constraints | Description |
|:-------|:-----|:-----------|:------------|
| `usage_id` | UUID | PRIMARY KEY | |
| `tenant_id` | UUID | NOT NULL | |
| `user_id` | UUID | NULL | System calls may have no user |
| `model_id` | VARCHAR(100) | NOT NULL | |
| `prompt_name` | VARCHAR(200) | NULL | If prompt registry was used |
| `task_type` | VARCHAR(50) | NOT NULL | `CHAT`, `EMBEDDING`, `VISION`, `FUNCTION` |
| `priority` | VARCHAR(10) | NOT NULL | `HIGH`, `LOW` |
| `input_tokens` | INTEGER | NOT NULL | |
| `output_tokens` | INTEGER | NOT NULL | |
| `total_tokens` | INTEGER | GENERATED | `input_tokens + output_tokens` |
| `cache_hit` | BOOLEAN | NOT NULL | Whether response came from semantic cache |
| `is_fallback` | BOOLEAN | NOT NULL | Whether a fallback model was used |
| `provider` | VARCHAR(50) | NOT NULL | Actual provider used |
| `latency_ms` | INTEGER | NOT NULL | Time from request to response |
| `cost_usd` | DECIMAL(12,8) | NOT NULL | Calculated cost at time of request |
| `correlation_id` | VARCHAR(100) | NOT NULL | Trace ID for distributed tracing |
| `created_at` | TIMESTAMPTZ | NOT NULL | Partitioned column |

**Partitioning:** Range by `created_at` (daily). Rolling 90-day retention in PostgreSQL, then archived to ClickHouse for analytics.

### 10.2 AI Observability Metrics

| Metric | Type | Labels | SLO |
|:-------|:-----|:-------|:----|
| `ai_inference_latency_ms` | Histogram | `model_id`, `provider`, `task_type`, `priority`, `tenant_id` | P50 < 200ms HIGH priority |
| `ai_token_usage_total` | Counter | `model_id`, `tenant_id`, `task_type` | Track for billing |
| `ai_cache_hit_ratio` | Gauge | `tenant_id`, `model_id` | Target > 40% |
| `ai_provider_error_rate` | Counter | `provider`, `model_id`, `error_type` | Alert if > 1% over 5 min |
| `ai_fallback_activation_rate` | Counter | `primary_model`, `fallback_model` | Alert if > 0.5% |
| `ai_quota_rejection_rate` | Counter | `tenant_id`, `rejection_reason` | Track for upsell signals |
| `ai_queue_depth` | Gauge | `queue_priority`, `tenant_id` | Alert if HIGH > 100 jobs |
| `ai_policy_violation_rate` | Counter | `policy_type`, `tenant_id` | Alert if > 0.1% |

---

## 11. AI API Contract Specification

### 11.1 Unified Chat Completion

```
POST /api/v1/ai/chat/completions
Authorization: Bearer {jwt}
Content-Type: application/json

Request:
{
  model: string | null          // Optional override (subject to policy)
  prompt_name: string | null    // From prompt registry
  prompt_variables: object | null // Template variables if using prompt_name
  messages: [                   // Direct messages if not using prompt_name
    { role: "system" | "user" | "assistant", content: string }
  ]
  temperature: float (0.0–2.0, default 0.7)
  max_tokens: integer (subject to plan limit)
  task_type: CHAT_FAST | CHAT_QUALITY | FUNCTION_CALLING | VISION (default CHAT_FAST)
  priority: HIGH | LOW (default HIGH for user-facing)
  bypass_cache: boolean (default false)
  response_format: TEXT | JSON_OBJECT | JSON_SCHEMA
  json_schema: object | null    // If response_format = JSON_SCHEMA
  tools: object[] | null        // Function definitions for tool-use
}

Response (success):
{
  inference_id: UUID
  model_used: string
  provider: string
  cache_hit: boolean
  usage: {
    input_tokens: integer
    output_tokens: integer
    cost_usd: float
  }
  choices: [
    {
      message: { role: "assistant", content: string }
      finish_reason: "stop" | "length" | "tool_calls" | "content_filter"
    }
  ]
  latency_ms: integer
}

Response (quota exceeded):
HTTP 429
{
  error: "QUOTA_EXCEEDED"
  resource: "inference_tokens"
  current_usage: integer
  limit: integer
  reset_at: ISO-8601 UTC
  upgrade_url: string
}
```

### 11.2 Embedding Generation

```
POST /api/v1/ai/embeddings
Authorization: Bearer {jwt}

Request:
{
  input: string | string[]   // Single text or batch (max 100 items)
  model: string | null       // Default: text-embedding-3-small
  dimensions: 1536 | 3072 | null  // Truncation (smaller = cheaper)
  entity_type: "listing" | "user_query" | "category" | "custom"
  entity_id: UUID | null     // If storing embedding for entity
}

Response:
{
  embeddings: [
    {
      object: "embedding"
      index: integer
      embedding: float[]     // Array of embedding_dimensions length
    }
  ]
  model: string
  usage: { input_tokens: integer, cost_usd: float }
}
```

### 11.3 Model List

```
GET /api/v1/ai/models
Authorization: Bearer {jwt}

Response:
{
  models: [
    {
      model_id: string
      display_name: string
      provider: string
      capabilities: string[]
      context_window_tokens: integer
      cost_per_1k_input_tokens: float
      cost_per_1k_output_tokens: float
      status: string
      available_on_plan: boolean
    }
  ]
}
```

### 11.4 Internal gRPC Contracts

```
service AIGateway {
  rpc Infer (InferenceRequest) returns (InferenceResponse);
  rpc Embed (EmbeddingRequest) returns (EmbeddingResponse);
  rpc CheckBudget (BudgetCheckRequest) returns (BudgetCheckResponse);
  rpc GetModelStatus (ModelStatusRequest) returns (ModelStatusResponse);
  rpc FlushCache (CacheFlushRequest) returns (CacheFlushResponse);
}

message InferenceRequest {
  string tenant_id = 1;
  string user_id = 2;
  string model_id = 3;
  string task_type = 4;
  string priority = 5;
  repeated ChatMessage messages = 6;
  float temperature = 7;
  int32 max_tokens = 8;
  bool bypass_cache = 9;
  string correlation_id = 10;
}

message BudgetCheckRequest {
  string tenant_id = 1;
  int32 estimated_tokens = 2;
  string priority = 3;
}

message BudgetCheckResponse {
  bool allowed = 1;
  int32 remaining_tokens = 2;
  string rejection_reason = 3; // Populated if allowed=false
}
```

---

## 12. AI Events Catalog

| Event | Kafka Topic | Trigger | Key Payload | Consumers |
|:------|:-----------|:--------|:-----------|:---------|
| `ai.inference_completed` | `ai.usage` | Successful inference | `model_id`, `tokens_in`, `tokens_out`, `cost_usd`, `latency_ms`, `tenant_id` | Monetization (billing) |
| `ai.embedding_generated` | `ai.embeddings` | Embedding created | `entity_id`, `entity_type`, `model`, `dimensions`, `tenant_id` | Vector Store (upsert), Search (update candidate) |
| `ai.cache_hit` | `ai.metrics` | L1 or L2 cache served | `prompt_hash`, `saved_tokens`, `model_id`, `tenant_id` | Analytics |
| `ai.provider_fallback` | `ai.metrics` | Fallback chain activated | `primary_model`, `fallback_model`, `reason` | Observability (alert) |
| `ai.budget_warning` | `ai.budgets` | Quota at 80% | `tenant_id`, `resource`, `pct_used` | Realtime (user notification) |
| `ai.provider_all_failed` | `ai.alerts` | All providers failed | `tenant_id`, `error_chain` | Observability (P0 alert), Realtime |
| `ai.output_policy_violation` | `ai.compliance` | Content filter triggered | `tenant_id`, `policy_type`, `prompt_hash` | Trust & Safety, Governance |
| `ai.job_expired` | `ai.metrics` | Queue job timed out | `tenant_id`, `priority`, `wait_time_ms` | Analytics |
| `ai.model_degraded` | `ai.health` | Model health check fails | `model_id`, `provider`, `consecutive_failures` | Governance (alert), Gateway (routing update) |

---

## 13. AI Infrastructure Scaling Strategy

### 13.1 Phase 1–4 (Monolith)

- AI Gateway runs as service module within monolith.
- Token Guard uses Redis for all bucket operations.
- Semantic cache uses Redis L1 + pgvector L2.
- Queue scheduler uses Kotlin Coroutines with configurable thread pool sizes.

### 13.2 Phase 5–6 (Gateway Extraction)

**Trigger:** When LLM prompt concurrency causes database connection starvation or inference latency degradation.

**Extraction Target:**
- Deploy standalone AI Gateway service (Rust/Axum or Go for maximum throughput).
- All communication via gRPC from monolith/services.
- Independent Redis cluster for Token Guard (isolated from app cache).
- Dedicated semantic cache pgvector instance.

### 13.3 Phase 7–9 (Global Scale)

- Multi-region AI Gateways with geo-routing (route to nearest gateway).
- Provider-specific gateway instances for latency optimization (e.g., dedicated OpenAI gateway node in us-east-1 close to OpenAI endpoints).
- Model routing intelligence: if specific provider has high latency in a region, auto-route to different provider or regional endpoint.
- Semantic cache replication across regions (eventual consistency, cache miss fallback to provider).
