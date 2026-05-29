# SPEC 08 — EVENT CONTRACT SPECIFICATION

> **Basis**: [PLANNER.md §4](file:///home/mohal665544/pr1/PLANNER.md) — Master Event Taxonomy
> **Status**: Execution-Ready v2 (Full Depth)
> **Version**: 2.0.0
> **Last Updated**: 2026-05-30

---

## 1. Event Architecture Principles

### 1.1 Fundamental Rules

The platform's event mesh is the backbone of all cross-domain communication. It enforces **Strict Eventual Consistency** without distributed transactions.

| Principle | Enforcement Mechanism |
|:----------|:---------------------|
| **Transactional Outbox** | Local state + outbox entry written in same DB transaction |
| **Schema Registry Validation** | All events validated against JSON Schema before Kafka publication |
| **Idempotency** | All consumers track `event_id` (UUID v7, monotonically ordered) to detect replays |
| **Tenant Context** | Every event includes `tenant_id` — no event exists without tenant scope |
| **Correlation Tracing** | Every event carries `correlation_id` (trace ID) propagated from origin HTTP request |
| **Ordered Delivery (per-entity)** | Kafka partition key = `tenant_id + entity_id` for within-entity ordering |
| **At-Least-Once Delivery** | Consumers handle duplicate events via idempotent processing |
| **Immutable Events** | Published events are never modified. Corrections are new events (e.g., `listing_deleted` after `listing_created`) |

### 1.2 Event Mesh Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         EVENT MESH                                  │
│                                                                    │
│  ┌─────────────┐    ┌─────────────────┐    ┌──────────────────┐  │
│  │  Outbox     │───▶│  Outbox         │───▶│   Kafka Broker   │  │
│  │  (DB Table) │    │  Collector      │    │   Cluster        │  │
│  │  per domain │    │  (WAL listener  │    │                  │  │
│  │             │    │   or polling)   │    │  Topics per      │  │
│  └─────────────┘    └─────────────────┘    │  domain          │  │
│                                            │                  │  │
│  Consumer Groups:                          │  Retention:      │  │
│  - Discovery Consumer                      │  Per-topic rules  │  │
│  - Intelligence Consumer                   │                  │  │
│  - Monetization Consumer                   └──────────────────┘  │
│  - Trust Consumer                                                  │
│  - Analytics Consumer (universal)                                  │
│  - Realtime Consumer                                               │
│  - Governance Consumer                                             │
└────────────────────────────────────────────────────────────────────┘
```

---

## 2. Event Envelope Standard

### 2.1 Canonical Envelope Schema

Every event published to the Event Mesh MUST conform to this envelope:

```json
{
  "event_id": "019485ab-3b7d-7abc-9bdd-2b0d7b3dcb6d",
  "event_type": "domain.entity_action",
  "schema_version": 1,
  "producer_domain": "marketplace",
  "tenant_id": "7b9dcb3d-4bad-3b7d-9bdd-2b0d7b3dcb6d",
  "actor_id": "usr_9b1deb4d-3b7d-4bad",
  "actor_type": "USER",
  "timestamp": "2026-05-30T00:05:00.000Z",
  "correlation_id": "corr_3b7d-4bad-9bdd-trace-span",
  "causation_id": "event_id_of_triggering_event_or_null",
  "payload": {},
  "metadata": {
    "source": "API",
    "environment": "PRODUCTION",
    "schema_version": 1,
    "producer_service": "marketplace-api",
    "producer_version": "1.4.2"
  }
}
```

### 2.2 Envelope Field Specifications

| Field | Type | Required | Description |
|:------|:-----|:---------|:------------|
| `event_id` | UUID v7 | REQUIRED | Monotonically ordered UUID. Unique across the entire platform. Used for deduplication |
| `event_type` | string | REQUIRED | Dot-notation: `{domain}.{entity}_{action}`. Example: `marketplace.listing_created` |
| `schema_version` | integer | REQUIRED | Version of the event's payload schema. Starts at 1 |
| `producer_domain` | string | REQUIRED | Source domain: `marketplace`, `discovery`, `ai_infra`, `billing`, `trust`, `identity`, `tenant`, `intelligence`, `analytics`, `governance` |
| `tenant_id` | UUID | REQUIRED | Tenant scope. MUST be present even for system-level events (use platform tenant ID) |
| `actor_id` | string | REQUIRED | Identity of action originator: `usr_{uuid}`, `svc_{service_name}`, `sys_scheduler` |
| `actor_type` | string | REQUIRED | `USER`, `SERVICE`, `SYSTEM`, `ADMIN` |
| `timestamp` | ISO-8601 UTC | REQUIRED | Event creation time with millisecond precision |
| `correlation_id` | string | REQUIRED | Distributed trace ID from origin HTTP request |
| `causation_id` | UUID | OPTIONAL | `event_id` of the event that caused this event (for event chains) |
| `payload` | object | REQUIRED | Domain-specific payload object |
| `metadata.source` | string | REQUIRED | `API`, `WEBHOOK`, `SYSTEM`, `BATCH`, `MIGRATION` |
| `metadata.environment` | string | REQUIRED | `PRODUCTION`, `STAGING`, `DEVELOPMENT` |
| `metadata.producer_service` | string | REQUIRED | Service name and version |

### 2.3 Kafka Partitioning Strategy

| Topic | Partition Key | Rationale |
|:------|:-------------|:---------|
| `marketplace.*` | `tenant_id + listing_id` | Ensure per-listing event ordering |
| `discovery.*` | `tenant_id + user_id` | Ensure per-user feed ordering |
| `ai.*` | `tenant_id` | Batch AI operations by tenant |
| `trust.*` | `tenant_id + entity_id` | Ensure per-entity trust ordering |
| `monetization.*` | `tenant_id` | Ensure per-tenant billing ordering |
| `identity.*` | `user_id` | Ensure per-user auth ordering |
| `intelligence.*` | `tenant_id + user_id` | Ensure per-user preference ordering |
| `analytics.*` | Random (high-throughput, no ordering needed) | Maximum parallelism |

---

## 3. Complete Event Catalog

### 3.1 Marketplace Domain Events

#### `marketplace.listing_created` (v1)

| Field | Specification |
|:------|:-------------|
| **Kafka Topic** | `marketplace.listings` |
| **Retention** | 7 days |
| **Partition Key** | `tenant_id:listing_id` |
| **Producers** | Marketplace API |
| **Consumers** | Trust & Safety (pre-publish scan), AI Infrastructure (embedding), Discovery (add to candidate pool) |

**Payload Schema:**
```json
{
  "listing_id": "UUID",
  "tenant_id": "UUID",
  "title": "string (max 300 chars)",
  "description": "string (max 10,000 chars)",
  "price": "decimal",
  "currency": "string (ISO 4217)",
  "category_id": "UUID",
  "category_slug": "string",
  "company_id": "UUID | null",
  "developer_id": "UUID | null",
  "tags": ["string"],
  "listing_type": "AGENT | TOOL | DATASET | SERVICE | TEMPLATE",
  "status": "PENDING_REVIEW",
  "media_urls": ["string"],
  "attributes": {"key": "value"},
  "initial_price_model": "SUBSCRIPTION | ONE_TIME | FREEMIUM | USAGE_BASED"
}
```

#### `marketplace.listing_updated` (v1)

**Trigger:** Any field on listing changes (title, description, price, category, attributes).
**Consumers:** AI Infrastructure (re-embed if content changed), Discovery (update candidate metadata), Trust (re-scan if content changed).

**Payload Schema:**
```json
{
  "listing_id": "UUID",
  "tenant_id": "UUID",
  "changed_fields": ["title", "description", "price"],
  "previous_values": {"title": "old title", "price": 29.99},
  "new_values": {"title": "new title", "price": 39.99},
  "content_hash_changed": "boolean",
  "updated_by": "USER | SYSTEM"
}
```

#### `marketplace.listing_deleted` (v1)

**Payload Schema:**
```json
{
  "listing_id": "UUID",
  "tenant_id": "UUID",
  "deletion_type": "SOFT | HARD",
  "deleted_by": "USER | ADMIN | TRUST_SYSTEM",
  "reason": "string | null"
}
```

#### `marketplace.listing_status_changed` (v1)

**Trigger:** Status transition occurs in listing lifecycle.

**Status State Machine:**
```
DRAFT → PENDING_REVIEW → ACTIVE → ARCHIVED
                    ↓
               QUARANTINED → REJECTED
                         ↓
                      PENDING_REVIEW (re-review)
```

**Payload Schema:**
```json
{
  "listing_id": "UUID",
  "tenant_id": "UUID",
  "old_status": "PENDING_REVIEW",
  "new_status": "ACTIVE",
  "transition_reason": "string",
  "triggered_by": "TRUST_SYSTEM | USER | ADMIN",
  "effective_at": "ISO-8601 UTC"
}
```

#### `marketplace.agent_registered` (v1)

**Payload Schema:**
```json
{
  "agent_id": "UUID",
  "tenant_id": "UUID",
  "listing_id": "UUID",
  "agent_type": "CHAT | WORKFLOW | AUTONOMOUS | INTEGRATION",
  "capability_description": "string",
  "api_endpoint": "string | null",
  "supported_models": ["string"],
  "pricing_model": "FREE | PAID | METERED"
}
```

#### `marketplace.category_updated` (v1)

**Payload Schema:**
```json
{
  "category_id": "UUID",
  "parent_category_id": "UUID | null",
  "name": "string",
  "slug": "string",
  "action": "CREATED | UPDATED | DEACTIVATED",
  "embedding_invalidated": "boolean"
}
```

#### `marketplace.listing_saved` (v1)

**Payload Schema:**
```json
{
  "listing_id": "UUID",
  "user_id": "UUID",
  "tenant_id": "UUID",
  "action": "SAVED | UNSAVED",
  "saved_at": "ISO-8601 UTC"
}
```

---

### 3.2 Discovery Domain Events

#### `discovery.feed_generated` (v1)

| Field | Specification |
|:------|:-------------|
| **Kafka Topic** | `discovery.feeds` |
| **Retention** | 30 days |
| **Consumers** | Analytics, Intelligence (for engagement baseline) |

**Payload Schema:**
```json
{
  "feed_id": "UUID",
  "user_id": "UUID",
  "tenant_id": "UUID",
  "session_id": "UUID",
  "query": "string | null",
  "intent_class": "NAVIGATIONAL | INFORMATIONAL | TRANSACTIONAL | BROWSE | COMPARISON",
  "intent_confidence": "float",
  "candidate_count_stage1": "integer",
  "candidate_count_stage2": "integer",
  "selected_listing_ids": ["UUID"],
  "exploration_slots_used": "integer",
  "diversity_swaps_applied": "integer",
  "feed_source": "LIVE | CACHED | FALLBACK",
  "reranker_model_used": "string",
  "latency_ms": "integer",
  "experiment_variant": "string | null"
}
```

#### `discovery.ranking_completed` (v1)

**Payload Schema:**
```json
{
  "feed_id": "UUID",
  "user_id": "UUID",
  "tenant_id": "UUID",
  "ranked_count": "integer",
  "top_listing_id": "UUID",
  "ranking_scores": {
    "UUID": "float"
  },
  "model_used": "XGBOOST | CROSS_ENCODER | LINEAR",
  "feature_importance": {
    "user_item_similarity": "float",
    "historical_ctr": "float",
    "trust_score": "float"
  },
  "latency_ms": "integer"
}
```

#### `discovery.search_executed` (v1)

**Payload Schema:**
```json
{
  "search_id": "UUID",
  "user_id": "UUID",
  "tenant_id": "UUID",
  "query": "string",
  "normalized_query": "string",
  "intent_class": "string",
  "filters_applied": {"category_id": "UUID", "price_max": 100},
  "result_count": "integer",
  "top_result_listing_id": "UUID | null",
  "latency_ms": "integer",
  "vector_backend_used": "PGVECTOR | MILVUS | PINECONE"
}
```

#### `discovery.item_clicked` (v1)

| Field | Specification |
|:------|:-------------|
| **Kafka Topic** | `discovery.interactions` |
| **Retention** | 90 days |
| **Consumers** | Intelligence (fast-loop preference update), Analytics (CTR tracking), Monetization (CPC billing) |

**Payload Schema:**
```json
{
  "interaction_id": "UUID",
  "listing_id": "UUID",
  "feed_id": "UUID",
  "user_id": "UUID",
  "tenant_id": "UUID",
  "session_id": "UUID",
  "position": "integer (1-indexed)",
  "is_sponsored": "boolean",
  "click_type": "DETAIL_VIEW | PURCHASE | TRIAL | EXTERNAL_LINK",
  "device_type": "MOBILE | DESKTOP | TABLET",
  "clicked_at": "ISO-8601 UTC"
}
```

#### `discovery.item_impressed` (v1)

**Payload Schema:**
```json
{
  "impression_id": "UUID",
  "listing_id": "UUID",
  "feed_id": "UUID",
  "user_id": "UUID",
  "tenant_id": "UUID",
  "position": "integer",
  "duration_ms": "integer",
  "viewport_percent": "float (0.0–1.0, how much of item was visible)",
  "is_sponsored": "boolean",
  "impressed_at": "ISO-8601 UTC"
}
```

---

### 3.3 AI & Vector Domain Events

#### `ai.inference_completed` (v1)

| Field | Specification |
|:------|:-------------|
| **Kafka Topic** | `ai.usage` |
| **Retention** | 90 days |
| **Consumers** | Monetization (billing deduction), Analytics (AI usage reporting) |

**Payload Schema:**
```json
{
  "inference_id": "UUID",
  "tenant_id": "UUID",
  "user_id": "UUID | null",
  "model_id": "string",
  "provider": "string",
  "task_type": "CHAT | EMBEDDING | VISION | FUNCTION",
  "priority": "HIGH | LOW",
  "prompt_name": "string | null",
  "input_tokens": "integer",
  "output_tokens": "integer",
  "total_tokens": "integer",
  "cost_usd": "decimal (8 decimal places)",
  "cache_hit": "boolean",
  "is_fallback": "boolean",
  "fallback_from_model": "string | null",
  "latency_ms": "integer",
  "finish_reason": "string"
}
```

#### `ai.embedding_generated` (v1)

**Payload Schema:**
```json
{
  "embedding_id": "UUID",
  "entity_id": "UUID",
  "entity_type": "string",
  "tenant_id": "UUID",
  "embedding_model": "string",
  "dimensions": "integer",
  "source_text_hash": "string",
  "quality_score": "float | null",
  "generation_latency_ms": "integer",
  "trigger_reason": "CONTENT_CREATED | CONTENT_UPDATED | MODEL_UPGRADE | MANUAL"
}
```

#### `ai.cache_hit` (v1)

**Payload Schema:**
```json
{
  "cache_event_id": "UUID",
  "tenant_id": "UUID",
  "model_id": "string",
  "prompt_hash_prefix": "string",
  "cache_layer": "L1_REDIS | L2_PGVECTOR",
  "similarity_score": "float",
  "saved_tokens_estimated": "integer",
  "saved_cost_usd_estimated": "decimal"
}
```

#### `ai.provider_fallback` (v1)

**Payload Schema:**
```json
{
  "fallback_event_id": "UUID",
  "tenant_id": "UUID",
  "primary_model_id": "string",
  "fallback_model_id": "string",
  "failure_reason": "TIMEOUT | HTTP_ERROR | RATE_LIMIT | CIRCUIT_OPEN",
  "primary_latency_ms": "integer",
  "error_code": "string | null"
}
```

#### `ai.budget_warning` (v1)

**Payload Schema:**
```json
{
  "warning_id": "UUID",
  "tenant_id": "UUID",
  "resource": "MONTHLY_TOKENS | DAILY_TOKENS | CREDITS",
  "current_usage": "integer",
  "limit": "integer",
  "pct_consumed": "float",
  "warning_threshold_pct": "float",
  "estimated_depletion_hours": "float | null"
}
```

#### `vector.embedding_stored` (v1)

**Payload Schema:**
```json
{
  "embedding_id": "UUID",
  "tenant_id": "UUID",
  "entity_type": "string",
  "entity_id": "UUID",
  "model_version": "string",
  "is_new": "boolean",
  "previous_version_id": "UUID | null"
}
```

#### `vector.index_rebuilt` (v1)

**Payload Schema:**
```json
{
  "index_id": "UUID",
  "entity_type": "string",
  "model_version": "string",
  "total_vectors_indexed": "integer",
  "build_duration_ms": "integer",
  "index_algorithm": "HNSW | IVFFlat",
  "triggered_by": "SCHEDULED | THRESHOLD | MANUAL | MODEL_UPGRADE"
}
```

---

### 3.4 Trust & Safety Domain Events

#### `trust.fraud_detected` (v1)

| Field | Specification |
|:------|:-------------|
| **Kafka Topic** | `trust.alerts` |
| **Retention** | 1 year |
| **Consumers** | Realtime (admin alert push), Governance (audit log), Tenant (account state update) |

**Payload Schema:**
```json
{
  "fraud_event_id": "UUID",
  "tenant_id": "UUID",
  "actor_id": "string",
  "actor_type": "TENANT | USER | LISTING",
  "risk_score": "float (0.0–1.0)",
  "risk_tier": "LOW | MEDIUM | HIGH | CRITICAL",
  "signal_categories": [
    "RAPID_LISTING_SPIKE",
    "UNUSUAL_PRICE_PATTERN",
    "BEHAVIORAL_ANOMALY",
    "CONTENT_INJECTION",
    "ACCOUNT_TAKEOVER_PATTERN"
  ],
  "triggered_rule_ids": ["string"],
  "evidence_snapshot": {
    "action_count_24h": "integer",
    "price_deviation_pct": "float | null",
    "similarity_to_known_fraud_clusters": "float | null"
  },
  "recommended_action": "MONITOR | SOFT_LOCK | HARD_LOCK | QUARANTINE | BAN",
  "auto_action_taken": "string | null",
  "review_required": "boolean"
}
```

#### `trust.trust_score_updated` (v1)

**Payload Schema:**
```json
{
  "score_event_id": "UUID",
  "target_entity_type": "TENANT | USER | LISTING",
  "target_entity_id": "UUID",
  "tenant_id": "UUID",
  "previous_score": "float (0.0–1.0)",
  "new_score": "float (0.0–1.0)",
  "score_delta": "float",
  "contributing_factors": {
    "fraud_signal_penalty": "float",
    "review_rating_component": "float",
    "age_bonus": "float",
    "verification_bonus": "float"
  },
  "recalculation_trigger": "FRAUD_DETECTED | REVIEW_SUBMITTED | MANUAL | SCHEDULED"
}
```

#### `trust.content_quarantined` (v1)

**Payload Schema:**
```json
{
  "quarantine_id": "UUID",
  "listing_id": "UUID",
  "tenant_id": "UUID",
  "quarantine_reason": "TOXICITY | SPAM | POLICY_VIOLATION | FRAUD | MANUAL",
  "toxicity_score": "float | null",
  "policy_violations": ["string"],
  "quarantined_by": "AI_MODERATION | HUMAN_REVIEWER | ADMIN",
  "review_required": "boolean",
  "estimated_review_hours": "integer | null"
}
```

#### `trust.content_approved` (v1)

**Payload Schema:**
```json
{
  "approval_id": "UUID",
  "listing_id": "UUID",
  "tenant_id": "UUID",
  "approved_by": "AI_MODERATION | HUMAN_REVIEWER | ADMIN",
  "reviewer_id": "UUID | null",
  "moderation_duration_ms": "integer",
  "scan_results": {
    "toxicity_score": "float",
    "policy_check_passed": "boolean"
  }
}
```

#### `trust.escalation_created` (v1)

**Payload Schema:**
```json
{
  "escalation_id": "UUID",
  "listing_id": "UUID | null",
  "tenant_id": "UUID",
  "escalation_type": "HIGH_RISK_FRAUD | HUMAN_REVIEW_REQUESTED | POLICY_DISPUTE",
  "priority": "URGENT | HIGH | NORMAL",
  "escalated_to": "TRUST_TEAM | PLATFORM_ADMIN | LEGAL",
  "notes": "string | null"
}
```

---

### 3.5 Monetization Domain Events

#### `monetization.quota_exceeded` (v1)

| Field | Specification |
|:------|:-------------|
| **Kafka Topic** | `monetization.quotas` |
| **Retention** | 30 days |
| **Consumers** | AI Gateway (block inference), Realtime (user notification), Analytics |

**Payload Schema:**
```json
{
  "quota_event_id": "UUID",
  "tenant_id": "UUID",
  "resource_name": "INFERENCE_TOKENS | LISTINGS | SEATS | STORAGE_GB | API_CALLS",
  "current_usage": "integer",
  "limit_amount": "integer",
  "overage_amount": "integer",
  "reset_at": "ISO-8601 UTC",
  "upgrade_suggested_plan": "string | null"
}
```

#### `monetization.event_recorded` (v1)

**Payload Schema:**
```json
{
  "ledger_event_id": "UUID",
  "tenant_id": "UUID",
  "resource_type": "INFERENCE_TOKENS | STORAGE | API_CALL | VECTOR_OPERATION",
  "quantity": "decimal",
  "unit_price": "decimal",
  "total_amount": "decimal",
  "currency": "USD",
  "billing_period": "string (YYYY-MM)",
  "source_event_id": "UUID (causation)",
  "source_event_type": "string"
}
```

#### `monetization.subscription_changed` (v1)

**Payload Schema:**
```json
{
  "change_event_id": "UUID",
  "tenant_id": "UUID",
  "old_plan": "starter | growth | premium | enterprise | null",
  "new_plan": "starter | growth | premium | enterprise",
  "change_type": "UPGRADE | DOWNGRADE | CANCELLATION | REACTIVATION",
  "effective_at": "ISO-8601 UTC",
  "proration_credit_usd": "decimal | null",
  "stripe_subscription_id": "string"
}
```

#### `monetization.invoice_generated` (v1)

**Payload Schema:**
```json
{
  "invoice_id": "UUID",
  "tenant_id": "UUID",
  "billing_period_start": "ISO-8601 date",
  "billing_period_end": "ISO-8601 date",
  "subtotal_usd": "decimal",
  "tax_usd": "decimal",
  "total_usd": "decimal",
  "status": "DRAFT | OPEN | PAID | VOID",
  "stripe_invoice_id": "string | null",
  "line_item_count": "integer"
}
```

#### `monetization.payment_received` (v1)

**Payload Schema:**
```json
{
  "payment_id": "UUID",
  "tenant_id": "UUID",
  "invoice_id": "UUID",
  "amount_usd": "decimal",
  "payment_method": "CARD | BANK_TRANSFER | CREDITS",
  "stripe_payment_intent_id": "string | null",
  "received_at": "ISO-8601 UTC"
}
```

#### `monetization.ad_auction_completed` (v1)

**Payload Schema:**
```json
{
  "auction_id": "UUID",
  "tenant_id": "UUID",
  "winning_campaign_id": "UUID",
  "winning_bid_cpc": "decimal",
  "charged_cpc": "decimal (runner-up + $0.01)",
  "keyword_or_vector_category": "string",
  "auction_participant_count": "integer",
  "feed_id": "UUID (the feed this auction was for)"
}
```

---

### 3.6 Identity Domain Events

#### `identity.session_started` (v1)

**Payload Schema:**
```json
{
  "session_id": "UUID",
  "user_id": "UUID",
  "tenant_id": "UUID",
  "auth_method": "EMAIL_PASSWORD | MAGIC_LINK | OAUTH | SSO | API_KEY",
  "ip_address": "string (hashed)",
  "user_agent": "string (browser fingerprint)",
  "device_type": "MOBILE | DESKTOP | API",
  "started_at": "ISO-8601 UTC"
}
```

#### `identity.session_ended` (v1)

**Payload Schema:**
```json
{
  "session_id": "UUID",
  "user_id": "UUID",
  "tenant_id": "UUID",
  "end_reason": "USER_LOGOUT | EXPIRY | REVOKED | SECURITY",
  "session_duration_seconds": "integer"
}
```

#### `identity.user_registered` (v1)

**Payload Schema:**
```json
{
  "user_id": "UUID",
  "tenant_id": "UUID",
  "email_hash": "string (SHA-256, not raw email)",
  "registration_method": "EMAIL | OAUTH_GOOGLE | OAUTH_GITHUB | INVITATION",
  "mfa_enrolled": "boolean",
  "referral_code": "string | null"
}
```

#### `identity.mfa_enrolled` (v1)

**Payload Schema:**
```json
{
  "user_id": "UUID",
  "tenant_id": "UUID",
  "mfa_type": "TOTP | SMS | HARDWARE_KEY",
  "enrolled_at": "ISO-8601 UTC"
}
```

---

### 3.7 Tenant Domain Events

#### `tenant.provisioned` (v1)

| Field | Specification |
|:------|:-------------|
| **Kafka Topic** | `tenant.lifecycle` |
| **Retention** | Indefinite |
| **Consumers** | All domains (initialize tenant-scoped resources) |

**Payload Schema:**
```json
{
  "organization_id": "UUID",
  "tenant_id": "UUID",
  "plan_tier": "starter | growth | premium | enterprise",
  "workspace_id": "UUID",
  "custom_domain": "string | null",
  "admin_user_id": "UUID",
  "provisioning_template": "DEFAULT | CUSTOM",
  "provisioned_at": "ISO-8601 UTC"
}
```

#### `tenant.plan_upgraded` (v1)

**Payload Schema:**
```json
{
  "tenant_id": "UUID",
  "old_plan": "string",
  "new_plan": "string",
  "new_limits": {
    "monthly_ai_tokens": "integer",
    "max_listings": "integer",
    "max_seats": "integer",
    "storage_gb": "integer"
  },
  "effective_at": "ISO-8601 UTC"
}
```

#### `tenant.suspended` (v1)

**Payload Schema:**
```json
{
  "tenant_id": "UUID",
  "suspension_reason": "PAYMENT_FAILED | POLICY_VIOLATION | ADMIN_ACTION",
  "suspended_by": "BILLING_SYSTEM | TRUST_SYSTEM | ADMIN",
  "suspended_at": "ISO-8601 UTC",
  "reinstatement_instructions": "string | null"
}
```

#### `tenant.feature_flag_updated` (v1)

**Payload Schema:**
```json
{
  "tenant_id": "UUID",
  "flag_key": "string",
  "old_value": "any",
  "new_value": "any",
  "updated_by": "ADMIN | SYSTEM",
  "updated_at": "ISO-8601 UTC"
}
```

---

### 3.8 Intelligence Domain Events

#### `intelligence.personalization_updated` (v1)

**Payload Schema:**
```json
{
  "update_id": "UUID",
  "user_id": "UUID",
  "tenant_id": "UUID",
  "update_type": "FAST_LOOP | SLOW_LOOP_BATCH",
  "interaction_source": "discovery.item_clicked | discovery.item_impressed | marketplace.listing_saved",
  "vector_dimensions": "integer",
  "ema_alpha": "float",
  "preference_strength": "float (L2 norm, indicates confidence in preference vector)",
  "updated_at": "ISO-8601 UTC"
}
```

#### `intelligence.segment_recalculated` (v1)

**Payload Schema:**
```json
{
  "segment_id": "UUID",
  "tenant_id": "UUID",
  "segment_name": "string",
  "segment_criteria": {"interest_category": "LLM", "budget_tier": "HIGH"},
  "member_count_change": "integer",
  "total_members": "integer",
  "recalculated_at": "ISO-8601 UTC"
}
```

---

### 3.9 Governance Domain Events

#### `governance.config_changed` (v1)

**Payload Schema:**
```json
{
  "config_key": "string",
  "old_value": "any",
  "new_value": "any",
  "changed_by_admin_id": "UUID",
  "change_reason": "string",
  "requires_restart": "boolean"
}
```

#### `governance.tenant_impersonated` (v1)

**Payload Schema:**
```json
{
  "admin_id": "UUID",
  "impersonated_tenant_id": "UUID",
  "impersonation_reason": "string",
  "session_id": "UUID",
  "started_at": "ISO-8601 UTC"
}
```

---

### 3.10 Infrastructure Events

#### `infrastructure.health_degraded` (v1)

**Payload Schema:**
```json
{
  "component": "POSTGRESQL | REDIS | KAFKA | VECTOR_DB | AI_GATEWAY",
  "severity": "WARNING | CRITICAL",
  "health_check_result": {
    "latency_ms": "integer",
    "error_message": "string | null",
    "connection_pool_pct": "float | null"
  },
  "degraded_at": "ISO-8601 UTC"
}
```

#### `infrastructure.connection_pool_exhausted` (v1)

**Payload Schema:**
```json
{
  "service": "string",
  "pool_name": "string",
  "max_connections": "integer",
  "active_connections": "integer",
  "queued_requests": "integer",
  "detected_at": "ISO-8601 UTC"
}
```

---

## 4. Event Processing Implementation

### 4.1 Outbox Pattern Implementation

**Transaction Pattern (every domain service):**

```
BEGIN TRANSACTION;

  -- 1. Business state mutation
  INSERT INTO {domain_schema}.{entity_table}
  VALUES ({business_data});

  -- 2. Outbox entry (SAME transaction)
  INSERT INTO event_outbox.outbox_events (
    event_id,
    event_type,
    schema_version,
    producer_domain,
    tenant_id,
    actor_id,
    actor_type,
    timestamp,
    correlation_id,
    causation_id,
    payload,
    metadata
  ) VALUES (
    gen_random_uuid(),
    'marketplace.listing_created',
    1,
    'marketplace',
    :tenant_id,
    :actor_id,
    'USER',
    NOW(),
    :correlation_id,
    NULL,
    :payload_json,
    :metadata_json
  );

COMMIT;
-- Either both succeed or both fail. No partial state.
```

### 4.2 Outbox Collector Service

**Polling Mode (Phase 1–4):**
- Runs as a separate service instance.
- Polls `event_outbox.outbox_events WHERE published = false ORDER BY created_at LIMIT 100`.
- Publishes batch to Kafka.
- Marks as `published = true` after Kafka ack.
- Poll interval: 100ms.
- Concurrency: 3 collector threads, each processing different domains (to prevent head-of-line blocking).

**WAL Streaming Mode (Phase 5+):**
- Uses PostgreSQL logical replication slot with `pgoutput` plugin.
- Debezium connector streams WAL changes to Kafka in near-real-time (<50ms lag).
- Eliminates polling overhead.
- Setup: `CREATE PUBLICATION event_outbox_pub FOR TABLE event_outbox.outbox_events;`

### 4.3 Consumer Idempotency Implementation

All consumers maintain a deduplication table:

```sql
-- In consumer's own schema
CREATE TABLE {consumer_schema}.processed_events (
  event_id    UUID      PRIMARY KEY,
  event_type  VARCHAR(200) NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Retention: 7 days (events replayed older than 7 days are extremely unlikely)
-- Partitioned by created_at (daily) for efficient pruning
```

**Consumer Processing Pattern:**
```
1. Receive Kafka message
2. Check: SELECT 1 FROM processed_events WHERE event_id = :event_id
   ├─ EXISTS → Skip (already processed, log as duplicate)
   └─ NOT EXISTS → Continue

3. Execute business logic (idempotent operations only)

4. BEGIN TRANSACTION:
   INSERT INTO processed_events (event_id, event_type, processed_at) VALUES (...);
   {apply business state change}
   COMMIT;

5. Commit Kafka offset
```

---

## 5. Event Versioning & Schema Evolution

### 5.1 Versioning Rules

| Rule | Specification |
|:-----|:------------|
| **Additive changes only** | Adding new optional fields to a payload is non-breaking. Allowed without version bump |
| **Breaking changes require new version** | Removing fields, renaming fields, or changing field types requires `schema_version + 1` |
| **Dual publish during migration** | Producer emits BOTH v1 and v2 events during migration window |
| **Consumer upgrade window** | Consumers have 30 days to upgrade to new event version |
| **Schema immutability** | Once a schema version is live in production, its JSON Schema definition is locked in the Schema Registry |
| **Backward compatibility validation** | CI pipeline validates that new event payload is compatible with v1 consumers |

### 5.2 Schema Registry

All event schemas are registered in `governance.event_schemas`:

| Column | Type | Description |
|:-------|:-----|:------------|
| `schema_id` | UUID | PRIMARY KEY |
| `event_type` | VARCHAR(200) | |
| `schema_version` | INTEGER | |
| `json_schema` | JSONB | Full JSON Schema definition |
| `is_active` | BOOLEAN | |
| `deprecated_at` | TIMESTAMPTZ | NULL if not deprecated |
| `breaking_from_version` | INTEGER | NULL if backward compatible |
| `created_at` | TIMESTAMPTZ | |

### 5.3 Kafka Topic Configuration

| Topic | Partitions | Replication Factor | Retention | Cleanup Policy |
|:------|:----------|:------------------|:---------|:--------------|
| `marketplace.listings` | 12 | 3 | 7 days | delete |
| `marketplace.reviews` | 6 | 3 | 30 days | delete |
| `discovery.feeds` | 24 | 3 | 30 days | delete |
| `discovery.interactions` | 48 | 3 | 90 days | delete |
| `ai.usage` | 12 | 3 | 90 days | delete |
| `ai.embeddings` | 12 | 3 | 30 days | delete |
| `ai.metrics` | 6 | 3 | 7 days | delete |
| `trust.alerts` | 6 | 3 | 365 days | delete |
| `trust.moderation` | 6 | 3 | 90 days | delete |
| `monetization.quotas` | 12 | 3 | 30 days | delete |
| `monetization.billing` | 6 | 3 | 365 days | delete |
| `identity.sessions` | 6 | 3 | 30 days | delete |
| `tenant.lifecycle` | 3 | 3 | indefinite | compact |
| `intelligence.preferences` | 24 | 3 | 30 days | delete |
| `analytics.clickstream` | 48 | 3 | 7 days | delete |
| `governance.audit` | 6 | 3 | 365 days | delete |
| `infrastructure.health` | 3 | 3 | 7 days | delete |

---

## 6. Event Replay & Recovery

### 6.1 Replay Scenarios

| Scenario | Replay Mechanism | Scope |
|:---------|:----------------|:------|
| Consumer service outage | Resume from last committed Kafka offset | Automatic |
| Data corruption | Re-process events from specific timestamp | Manual operator action |
| New consumer deployment | Start from earliest offset or specific date | Operator-specified |
| Outbox collector crash | Re-publish unpublished outbox events | Automatic (idempotent) |

### 6.2 Dead Letter Queue

Events that fail consumer processing after 3 retries are routed to the DLQ:
- Topic: `{original_topic}.dlq`
- DLQ events include original event + failure metadata (error message, attempt count, timestamps).
- Governance Dashboard shows DLQ depth per topic.
- Operators can: replay from DLQ, skip event, or mark as permanently failed.

### 6.3 Event Ordering Guarantees

| Guarantee Level | Scope | Mechanism |
|:---------------|:------|:---------|
| Ordered within entity | Same `listing_id` events are processed in order | Kafka partition key = `entity_id` |
| Ordered within tenant | Same `tenant_id` events for same entity | Kafka partition key = `tenant_id:entity_id` |
| No ordering guarantee | Cross-entity, cross-tenant | Consumers designed to handle out-of-order |

**Out-of-Order Handling Example:**
If `listing_updated` arrives before `listing_created` (edge case during startup replay):
- Consumer checks if listing exists in its local state.
- If not found: store event in pending buffer for 30 seconds.
- If `listing_created` arrives within 30 seconds: process both in order.
- If not: log warning, process `listing_updated` idempotently (upsert semantics).
