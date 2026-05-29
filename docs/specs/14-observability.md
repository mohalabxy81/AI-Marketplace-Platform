# SPEC 14 — OBSERVABILITY & OPERATIONS SPECIFICATION

> **Basis**: [PLANNER.md](file:///home/mohal665544/pr1/PLANNER.md) — Platform Master Architecture  
> **Status**: Execution-Ready v3 (Maximum Depth)  
> **Version**: 3.0.0  
> **Last Updated**: 2026-05-30  
> **Owned By**: Platform Operations & SRE Team

---

## 1. Observability Architecture Overview

The platform implements an **Observability-First** design philosophy. Every architectural decision considers how the resulting behavior will be observed, debugged, and understood in production. This is not an afterthought—it is a first-class system requirement equivalent in priority to correctness and performance.

### 1.1 The Four Pillars of Platform Observability

| Pillar | Technology | Ownership | Primary Purpose |
|:-------|:-----------|:----------|:----------------|
| **Metrics** | Prometheus + Grafana / VictoriaMetrics | SRE Team | SLO tracking, auto-scaling triggers, capacity planning |
| **Traces** | Jaeger / Grafana Tempo (OTel-compatible) | All Teams | Request flow analysis, latency bottleneck identification |
| **Logs** | FluentBit → Loki + Elasticsearch (cold) | All Teams | Debugging, audit, detailed state reconstruction |
| **AI Telemetry** | Custom OTel Semantic Conventions | Intelligence Team | Model performance, cost attribution, quality tracking |

### 1.2 Observability Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                                   │
│  All services emit:                                                         │
│  - Structured JSON logs to stdout                                           │
│  - Prometheus metrics on /metrics endpoint                                  │
│  - OTel traces to OTel Collector sidecar                                    │
└───────────┬──────────────────────┬─────────────────────┬───────────────────┘
            │                      │                     │
            ▼                      ▼                     ▼
┌──────────────────┐  ┌────────────────────┐  ┌─────────────────────────────┐
│   FluentBit      │  │   OTel Collector   │  │  Prometheus Scrape Target   │
│   (DaemonSet)    │  │   (Sidecar/Agent)  │  │  /metrics                   │
│  - Parse JSON    │  │  - Receive traces  │  │  - RED metrics              │
│  - Redact PII    │  │  - Batch export    │  │  - Custom business metrics  │
│  - Route by level│  │  - Sample rules    │  │                             │
└──────┬───────────┘  └────────┬───────────┘  └──────────────┬──────────────┘
       │                       │                              │
  ┌────▼─────┐          ┌──────▼──────┐               ┌──────▼──────┐
  │   Loki   │          │ Jaeger/Tempo│               │ Prometheus  │
  │  (30d)   │          │  (14d)      │               │ Victoria    │
  │          │          │             │               │ Metrics     │
  └────┬─────┘          └──────┬──────┘               └──────┬──────┘
       │                       │                              │
       └───────────────────────┴──────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │     Grafana         │
                    │  - SLO Dashboards   │
                    │  - Alertmanager     │
                    │  - Incident Console │
                    └─────────────────────┘
```

---

## 2. Distributed Tracing Specification

### 2.1 Trace Context Propagation Standard

**Protocol**: W3C Trace Context specification (`traceparent` / `tracestate` HTTP headers).

**Propagation Rules:**
- If an inbound request carries a valid `traceparent`, the service MUST continue the trace by propagating the `trace_id`.
- If no `traceparent` is present, the API Gateway generates a new `trace_id` and injects it before forwarding.
- All internal HTTP calls (service-to-service) MUST include `traceparent` headers.
- All gRPC calls MUST use metadata propagation for trace context.
- All Kafka messages MUST inject trace context into record headers under key `traceparent`.
- All database queries made via OTel-instrumented clients automatically create child spans.

### 2.2 Standard OpenTelemetry Span Attributes

Every span MUST include the following attributes, adhering to OTel semantic conventions:

| Attribute | Type | Description | Example |
|:----------|:-----|:------------|:--------|
| `service.name` | string | Service emitting the span | `discovery-engine` |
| `service.version` | string | Deployed version | `1.4.2` |
| `deployment.environment` | string | `production`, `staging`, `development` | `production` |
| `tenant.id` | UUID string | Current tenant context | `7b9dcb3d-...` |
| `user.id` | UUID string | Authenticated user (if present) | `usr_9b1deb4d-...` |
| `correlation.id` | UUID string | Business-level correlation ID (from event mesh) | `corr_3b7d-...` |
| `http.method` | string | HTTP verb | `GET` |
| `http.route` | string | Route pattern (not URL with params) | `/api/v1/feed` |
| `http.status_code` | integer | Response status | `200` |
| `db.system` | string | Database engine | `postgresql` |
| `db.operation` | string | SQL operation type | `SELECT` |
| `ai.model.id` | string | LLM/embedding model | `text-embedding-3-small` |
| `ai.provider` | string | Provider name | `openai` |
| `ai.tokens.input` | integer | Input tokens consumed | `512` |
| `ai.tokens.output` | integer | Output tokens generated | `256` |

### 2.3 Mandatory Custom Span Definitions

The following critical operations MUST emit explicitly named custom spans. These spans are the primary targets for SLO alerting:

| Span Name | Service | Attributes | SLO Target |
|:----------|:--------|:-----------|:-----------|
| `discovery.stage1.vector_retrieval` | Discovery | `candidate_count`, `index_type`, `vector_distance_p50` | P95 < 15ms |
| `discovery.stage2.light_ranking` | Discovery | `input_count`, `output_count`, `ranking_model_version` | P95 < 5ms |
| `discovery.stage3.neural_reranking` | Discovery | `input_count`, `output_count`, `model_id`, `cache_hit` | P95 < 30ms |
| `ai.inference.request` | AI Gateway | `provider`, `model`, `tokens_in`, `tokens_out`, `cache_hit` | P95 < 1500ms |
| `ai.embedding.generate` | AI Gateway | `model`, `input_text_length`, `dimensions` | P95 < 500ms |
| `ai.semantic_cache.lookup` | AI Gateway | `cache_hit`, `similarity_score` | P95 < 5ms |
| `trust.content_scan.preflight` | Trust Engine | `listing_id`, `scan_result`, `risk_score`, `model_id` | P95 < 30s |
| `trust.behavioral_analysis` | Trust Engine | `actor_id`, `anomaly_detected`, `risk_score` | P99 < 2s |
| `monetization.auction.execute` | Billing | `bid_count`, `winner_id`, `clearing_price` | P99 < 50ms |
| `monetization.ledger.write` | Billing | `entry_count`, `resource_type`, `amount` | P99 < 100ms |
| `event.outbox.publish` | All Services | `event_type`, `event_count`, `lag_ms` | P99 < 1s |

### 2.4 Tail-Based Sampling Strategy

To control the volume of trace data ingested:

| Condition | Sampling Rate | Rationale |
|:----------|:-------------|:----------|
| Traces with errors (any HTTP 5xx / exception) | 100% | Never drop error traces |
| Traces with latency > 2× SLO target | 100% | Capture all SLO breaches |
| Traces involving trust flag events | 100% | Security audit requirement |
| Traces involving billing mutations | 100% | Financial audit requirement |
| All other traces | 5% | Baseline representative sample |

---

## 3. Metrics & SLO Framework

### 3.1 RED Metrics Standard

Every service MUST expose RED metrics on a `/metrics` endpoint in Prometheus text format:

| Metric Name | Type | Labels | Description |
|:------------|:-----|:-------|:------------|
| `requests_total` | Counter | `service`, `method`, `route`, `status_code`, `tenant_id` | Total request count |
| `errors_total` | Counter | `service`, `method`, `route`, `error_code` | Total error count |
| `request_duration_seconds` | Histogram | `service`, `method`, `route` | Request latency; buckets: 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s |

### 3.2 Service Level Objectives (SLOs)

#### Critical Path SLOs

| Service | SLI | SLO Target | Measurement Window | Alert Priority | Consequence of Breach |
|:--------|:----|:-----------|:-------------------|:--------------|:----------------------|
| **API Gateway** | Error Rate (`5xx / total_requests`) | < 0.1% | 5m rolling | **P0** | Immediate incident, auto-scale |
| **API Gateway** | P99 Latency | < 500ms | 5m rolling | **P0** | Immediate investigation |
| **Discovery Engine** | Feed API P95 Latency | < 50ms | 5m rolling | **P1** | Page on-call engineer |
| **Discovery Engine** | Search API P99 Latency | < 100ms | 5m rolling | **P1** | Page on-call engineer |
| **AI Gateway** | Provider Error Rate | < 1.0% | 1m rolling | **P1** | Auto-activate fallback |
| **AI Gateway** | P95 Inference Latency | < 2000ms | 5m rolling | **P2** | Create ticket |
| **Realtime** | WAL-to-Client Message Lag | < 500ms | 5m rolling | **P2** | Create ticket |
| **Trust Engine** | Pre-Publish Scan Completion | < 30s | 1h rolling | **P2** | Create ticket |
| **Billing** | Ledger Write P99 Latency | < 100ms | 10m rolling | **P2** | Create ticket |
| **Kafka** | Consumer Lag (critical topics) | < 10,000 messages | 5m rolling | **P1** | Scale consumers |

#### Error Budget Burn Rate Alerting

Fast burn rate alerts are configured to warn of impending SLO exhaustion before the budget is fully consumed:

| Burn Rate Multiplier | Time to Exhaustion | Alert Action |
|:---------------------|:-------------------|:-------------|
| 14.4× (consuming in 1h) | ~1 hour | **P0** – Page immediately |
| 6× (consuming in 6h) | ~6 hours | **P1** – Page primary on-call |
| 3× (consuming in 3d) | ~3 days | **P2** – Slack alert to team |

### 3.3 Custom Business Metrics (Prometheus Gauges/Counters)

All custom business metrics are exported as Prometheus metrics by dedicated metric exporter services:

| Metric Name | Type | Labels | Description |
|:------------|:-----|:-------|:------------|
| `platform_active_tenants_total` | Gauge | `plan_tier` | Number of active provisioned tenants |
| `platform_active_listings_total` | Gauge | `tenant_id`, `status` | Active marketplace listings count |
| `platform_ai_tokens_consumed_total` | Counter | `tenant_id`, `model`, `provider`, `operation` | Cumulative AI token usage |
| `platform_ai_tokens_cost_usd_total` | Counter | `tenant_id`, `model`, `provider` | Cumulative AI token cost |
| `platform_fraud_events_total` | Counter | `risk_level`, `reason` | Trust fraud event detections |
| `platform_content_quarantine_active` | Gauge | none | Current listings in quarantine |
| `platform_discovery_cache_hit_ratio` | Gauge | `cache_type` | Semantic/Redis cache effectiveness |
| `platform_subscription_mrr_usd` | Gauge | `plan_tier` | Monthly recurring revenue by plan |
| `platform_embedding_staleness_hours` | Histogram | `entity_type` | Age distribution of active embeddings |
| `platform_outbox_lag_seconds` | Gauge | `service`, `topic` | Transactional outbox processing delay |

### 3.4 Grafana Dashboard Inventory

| Dashboard Name | Primary Audience | Panels | Refresh |
|:---------------|:-----------------|:-------|:--------|
| **Platform Health Overview** | SRE, Executives | 24 | 1m |
| **Discovery Engine Deep Dive** | Intelligence Team | 32 | 30s |
| **AI Inference & Cost** | Intelligence + Finance | 18 | 5m |
| **Multi-Tenant Isolation Audit** | Security + SRE | 15 | 5m |
| **Monetization & Revenue** | Finance + Product | 20 | 10m |
| **Trust & Safety Operations** | Trust Team | 16 | 1m |
| **Event Mesh Health (Kafka)** | SRE Team | 22 | 30s |
| **Realtime Infrastructure** | SRE Team | 14 | 30s |
| **Tenant Activity (Per-Tenant)** | Tenant Admins (scoped) | 12 | 5m |

---

## 4. Logging Standards

### 4.1 Mandatory Structured Log Format

All services MUST output logs in JSON format to `stdout`. Log aggregation infrastructure (FluentBit) collects from container stdout. No file-based logging.

**Mandatory JSON Schema:**
```json
{
  "timestamp":    "2026-05-30T01:45:00.123Z",
  "level":        "ERROR",
  "service":      "discovery-engine",
  "version":      "1.4.2",
  "environment":  "production",
  "trace_id":     "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id":      "00f067aa0ba902b7",
  "tenant_id":    "7b9dcb3d-4bad-3b7d-9bdd-2b0d7b3dcb6d",
  "user_id":      "usr_9b1deb4d-3b7d-4bad",
  "correlation_id": "corr_3b7d-4bad-9bdd",
  "message":      "AI Gateway timeout during Stage 3 reranking",
  "error": {
    "code":       "UPSTREAM_TIMEOUT",
    "type":       "GatewayTimeoutException",
    "stack":      "..."
  },
  "context": {
    "feed_id":    "feed_7b9dcb3d-4bad",
    "stage":      "stage3_reranking",
    "attempt":    2,
    "latency_ms": 2048
  }
}
```

### 4.2 Log Level Definitions & Routing

| Level | Production Policy | When to Use | Routing |
|:------|:------------------|:------------|:--------|
| `TRACE` | Disabled (build flag) | Byte-level debugging | Dropped |
| `DEBUG` | Disabled in production | Internal state details | Dropped |
| `INFO` | Enabled | State changes, milestones, successful completions | Loki (30d hot) |
| `WARN` | Enabled | Recoverable errors, degraded mode activation, rate limits approaching | Loki (30d hot) |
| `ERROR` | Enabled + sampled | Operation failures, 5xx responses, integration failures | Loki + Sentry |
| `FATAL` | Enabled (100%) | Process crash, unrecoverable state | Loki + Sentry + PagerDuty |

### 4.3 Mandatory Log Events (Audit-Grade)

The following events MUST be logged at `INFO` level with full context, regardless of log level configuration. These are audit-grade logs that feed the immutable `governance.audit_logs` table:

| Event | Service | Required Context Fields |
|:------|:--------|:------------------------|
| `auth.login_success` | Identity | `user_id`, `ip_hash`, `user_agent`, `mfa_used` |
| `auth.login_failure` | Identity | `email_hash`, `ip_hash`, `failure_reason`, `attempt_count` |
| `auth.token_revoked` | Identity | `user_id`, `revoked_by`, `reason` |
| `tenant.provisioned` | Tenant | `tenant_id`, `plan_tier`, `provisioned_by` |
| `tenant.deleted` | Tenant | `tenant_id`, `deletion_reason`, `deleted_by` |
| `listing.quarantined` | Trust | `listing_id`, `tenant_id`, `risk_score`, `reasons` |
| `listing.approved` | Trust | `listing_id`, `approved_by`, `scan_result` |
| `billing.plan_changed` | Monetization | `tenant_id`, `from_plan`, `to_plan`, `changed_by` |
| `billing.payment_failed` | Monetization | `tenant_id`, `amount`, `failure_code` |
| `user.role_changed` | Identity | `target_user_id`, `from_role`, `to_role`, `changed_by` |
| `api_key.created` | Identity | `tenant_id`, `key_id` (never the key itself), `created_by` |
| `api_key.revoked` | Identity | `tenant_id`, `key_id`, `revoked_by` |
| `superadmin.action` | Governance | `admin_id`, `action_type`, `target_entity_id`, `reason` |

### 4.4 PII & Sensitive Data Masking

A FluentBit Lua filter applies masking BEFORE logs leave the host:

| Data Pattern | Masking Rule | Example |
|:-------------|:-------------|:--------|
| Email addresses | `j***@example.com` | Regex: `[\w.-]+@[\w.]+` |
| Credit card numbers | `****-****-****-4242` | Luhn-pattern regex |
| Phone numbers | `+1-***-***-4567` | E.164 format regex |
| JWT tokens | `[REDACTED_JWT]` | Starts with `eyJ` |
| API keys | `[REDACTED_KEY]` | Pattern: `sk_`, `pk_`, `key_` prefix |
| IP addresses (raw) | `[REDACTED_IP]` | All raw IPs; only ip_hash allowed |
| Passwords | Never logged | Enforced by code review checklist |
| SSNs / Tax IDs | `***-**-####` | Pattern regex |

---

## 5. AI Telemetry Specification

The AI Gateway emits a specialized telemetry schema that goes beyond standard RED metrics, capturing quality, cost, and governance dimensions unique to AI inference.

### 5.1 AI Inference Telemetry Schema

Every inference request produces a telemetry record published to the `analytics.ai_usage_events` ClickHouse table (defined in Spec 13) AND emits the following Prometheus metrics:

| Metric | Type | Description |
|:-------|:-----|:------------|
| `ai_inference_requests_total` | Counter | Labels: `model`, `provider`, `operation`, `cache_hit`, `was_fallback` |
| `ai_inference_latency_seconds` | Histogram | Labels: `model`, `provider`, `operation` |
| `ai_inference_tokens_input_total` | Counter | Labels: `model`, `provider`, `tenant_id` |
| `ai_inference_tokens_output_total` | Counter | Labels: `model`, `provider`, `tenant_id` |
| `ai_inference_cost_usd_total` | Counter | Labels: `model`, `provider`, `tenant_id` |
| `ai_token_guard_rejections_total` | Counter | Labels: `tenant_id`, `rejection_reason` |
| `ai_cache_hit_ratio` | Gauge | Labels: `cache_type` — `semantic` or `exact` |
| `ai_provider_circuit_breaker_state` | Gauge | `0=closed, 1=half-open, 2=open` per provider |

### 5.2 Model Quality Tracking

The Intelligence team runs offline model quality evaluations on a scheduled basis. Results are written to PostgreSQL and exposed via a dedicated admin API:

| Evaluation | Schedule | Metric |
|:-----------|:---------|:-------|
| Embedding model quality (retrieval precision@10) | Weekly | `>= 0.82` |
| Re-ranker NDCG@10 (vs. human labels) | Weekly | `>= 0.75` |
| Content moderation accuracy (precision/recall) | Weekly | Precision `>= 0.95`, Recall `>= 0.90` |
| Prompt injection resistance rate | Per deployment | `>= 0.99` |
| Semantic cache false positive rate (wrong answer served) | Daily | `<= 0.001` |

### 5.3 AI Cost Attribution Dashboard

Every dollar of AI spend must be attributed to a specific tenant and operation. The AI Cost Attribution dashboard (Grafana) displays:
- Real-time per-tenant token consumption burn rate
- Projected monthly cost vs. quota limit per tenant
- Top 10 most expensive prompts (by token count)
- Provider cost breakdown (OpenAI vs. Anthropic vs. local)
- Semantic cache savings (tokens saved × rate per token)

---

## 6. Alerting & Incident Response Specification

### 6.1 Alert Priority Taxonomy

| Priority | Criteria | Response Time | Notification Channel |
|:---------|:---------|:--------------|:---------------------|
| **P0 — Critical** | Total platform outage, data loss, confirmed security breach, sustained 5xx > 1% | Immediate | PagerDuty (wake) + Slack #incidents + SMS all leads |
| **P1 — High** | Core feature degraded (Discovery 500s, Auth failures), SLO burn rate alert | < 15 minutes | PagerDuty (queue) + Slack #incidents |
| **P2 — Medium** | Single-tenant issue, background job failure, localized latency degradation | < 2 hours | Slack #platform-alerts + Jira ticket |
| **P3 — Low** | Capacity warnings (disk > 70%, queue lag > threshold) | < 24 hours | Slack #platform-alerts |
| **P4 — Informational** | Deployment notifications, daily rollup reports | Best effort | Slack #engineering |

### 6.2 Runbook Library

Each automated alert links to a versioned runbook document. Critical runbooks:

**RB-01: Discovery Engine P95 Latency Breach**
```
Trigger: discovery_feed_p95_latency > 50ms for 5 minutes
Immediate Actions:
  1. Check ai_inference_latency metric — is Stage 3 re-ranking slow?
  2. If AI latency high → activate fallback: disable Stage 3, serve Stage 2 only
  3. Check pgvector index health: SELECT * FROM pg_stat_user_indexes WHERE relname='listings_embedding_idx'
  4. Check connection pool saturation: pgbouncer client_active metric
  5. Check Redis cache hit rate: platform_discovery_cache_hit_ratio
Expected Resolution: < 30 minutes
```

**RB-02: AI Provider Complete Outage**
```
Trigger: ai_provider_circuit_breaker_state{provider="openai"} == 2 (OPEN)
Immediate Actions:
  1. Circuit breaker auto-activates Anthropic fallback (automatic)
  2. Verify Anthropic provider is healthy: check ai_provider_circuit_breaker_state{provider="anthropic"}
  3. Alert Intelligence Team to monitor embedding quality (fallback model may have different space)
  4. Set platform-wide semantic cache hit threshold lower (0.93) to use more cached responses
  5. Notify tenant accounts if extended outage (> 30 min)
Expected Resolution: Automatic if fallback healthy; else manual provider re-routing
```

**RB-03: Cross-Tenant Data Leakage Alert**
```
Trigger: Anomaly detection identifies query returning non-matching tenant_id rows
Severity: P0 IMMEDIATE
Actions:
  1. IMMEDIATELY: Suspend all affected services
  2. Activate forensic trace mode (100% sampling)
  3. Notify Security team and legal counsel within 15 minutes
  4. Identify affected tenants and timeline via trace analysis
  5. GDPR breach notification timeline starts
Expected Resolution: Requires Security + SRE joint response
```

### 6.3 Auto-Remediation Webhooks

Certain alert conditions trigger automated remediation before human intervention:

| Trigger | Automated Action |
|:--------|:-----------------|
| AI Provider latency > P95 SLO for > 2 minutes | Mark provider `DEGRADED` in model_registry; activate next-priority provider |
| PostgreSQL connection pool > 85% saturation | Scale PgBouncer pool size +20%; reduce API rate limits -25% |
| Redis memory usage > 90% | Evict lowest-priority semantic cache keys (LRU TTL reduction to 10m) |
| Kafka consumer lag > 10,000 on critical topics | Scale consumer group replicas +2 |
| Outbox table backlog > 5,000 events | Scale outbox relay workers +2; alert SRE |
| Trust scan queue > 500 pending items | Scale Trust Engine workers +2 |

---

## 7. Operational Runbook Index

| Runbook ID | Title | Trigger | Owner |
|:-----------|:------|:--------|:-------|
| RB-01 | Discovery Latency Breach | P95 > 50ms | Intelligence |
| RB-02 | AI Provider Outage | Circuit breaker OPEN | Intelligence |
| RB-03 | Cross-Tenant Leakage | Security anomaly | Security + SRE |
| RB-04 | Kafka Consumer Lag | Lag > 10,000 | SRE |
| RB-05 | PostgreSQL Connection Exhaustion | Pool > 90% | SRE |
| RB-06 | Redis Memory Full | Usage > 90% | SRE |
| RB-07 | Billing Ledger Reconciliation Failure | Double-write detected | Finance + SRE |
| RB-08 | Trust Engine Queue Overflow | Queue > 500 | Trust Team |
| RB-09 | Embedding Index Degradation | HNSW recall drop > 15% | Intelligence |
| RB-10 | Stripe Webhook Failure Cascade | Webhook failure rate > 5% | Platform Core |

---

## 8. Incident Management Workflow

### 8.1 Incident Lifecycle

```
ALERT FIRES
    │
    ▼
AUTO-REMEDIATION (RB attempt — 5 min window)
    │
    ├─ RESOLVED → Post-incident review scheduled
    │
    └─ UNRESOLVED ▼
    
PAGERDUTY ESCALATION
    │
    ▼
ON-CALL ENGINEER ACKNOWLEDGES (< 15 min for P1)
    │
    ▼
INCIDENT CHANNEL OPENED (#incident-YYYY-MM-DD-HH)
    │
    ▼
INCIDENT COMMANDER ASSIGNED
    │
    ▼
ROOT CAUSE IDENTIFIED → FIX DEPLOYED
    │
    ▼
INCIDENT RESOLVED → ALL CLEAR
    │
    ▼
POST-MORTEM DOCUMENT (within 48 hours)
    │
    ▼
ACTION ITEMS ADDED TO BACKLOG
```

### 8.2 Post-Mortem Document Template

Every P0 and P1 incident MUST produce a post-mortem document within 48 hours:

```
Title: [Service] — [Brief Description] — YYYY-MM-DD
Severity: P0 | P1
Duration: HH:MM (detection → resolution)
Affected Tenants: N tenants | Specific list
Impact: Quantified user impact (e.g., "~12,000 feed requests failed")

Timeline (UTC):
  HH:MM — Alert fired / Anomaly detected
  HH:MM — Engineer acknowledged
  HH:MM — Root cause identified
  HH:MM — Fix deployed
  HH:MM — Service restored

Root Cause: [Precise technical explanation]

Contributing Factors: [What made it worse / harder to detect]

Detection Gap: [Why did it take X minutes to detect?]

Action Items:
  - [ ] [Specific, assignable task] — Owner: @person — Due: YYYY-MM-DD
```
