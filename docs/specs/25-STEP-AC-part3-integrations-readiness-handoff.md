# STEP AC — ENGINEERING CONSTITUTION: PART 3
# Sections 9–13: Integrations · Observability · Backend/Frontend Readiness · STEP AD Handoff

> **Parent Document**: [23-STEP-AC-engineering-constitution.md](file:///home/mohal665544/pr1/docs/specs/23-STEP-AC-engineering-constitution.md)  
> **Version**: 1.0.0 | **Date**: 2026-05-30

---

# SECTION 9 — INTEGRATION CONTRACTS

## 9.1 Integration: Supabase

**Responsibilities**:
- PostgreSQL database (primary data store — all business data)
- Authentication (Supabase Auth — JWT issuance, OAuth, magic links)
- Realtime (WebSocket infrastructure — WAL-based broadcast)
- Storage (blob storage — listing media, user uploads, documents)
- Edge Functions (Deno-based serverless functions — lightweight transformations, webhooks)
- Vector search (pgvector extension — 1536-dim embeddings)

**Data Flow**:
```
Client → Supabase Auth → JWT → API Gateway → Supabase DB (via RLS)
                                           → Supabase Realtime (WAL → WebSocket)
                                           → Supabase Storage (presigned URLs)
```

**Security Model**:
- **Row-Level Security**: Mandatory on ALL tenant-scoped tables (see §8.13)
- **Database Roles**: 
  - `anon`: Anonymous read-only (public listing data only)
  - `authenticated`: JWT-authenticated users (RLS enforced)
  - `service_role`: Backend services only (bypasses RLS for system operations)
  - `super_admin_role`: Audit/compliance reads (bypasses tenant isolation)
- **Connection Pooling**: PgBouncer (transaction mode, max 100 connections per service)
- **SSL**: Enforced for all connections (TLS 1.3)
- **API Keys**: `anon` key only in client bundles; `service_role` key server-side only (never exposed)

**Failure Model**:
- Supabase Auth outage: API Gateway returns 503 on all authenticated endpoints; cached JWKS used for token validation for up to 1 hour
- PostgreSQL outage: API returns 503 immediately; no stale reads permitted for mutation endpoints
- Realtime outage: Clients fall back to polling (30-second interval) — surfaced with connectivity indicator

**Rate Limits** (Supabase limits):
- REST API: Managed by Supabase plan (custom limits on Pro/Enterprise)
- Realtime connections: 10,000 concurrent (horizontal scaling via multiple Realtime nodes)
- Storage: 1TB initial; request limit increase for scale

**Secrets Management**:
- `SUPABASE_URL`: Non-secret, can be in client bundle
- `SUPABASE_ANON_KEY`: Client-safe (RLS is the security layer)
- `SUPABASE_SERVICE_ROLE_KEY`: **NEVER in client code**; stored in Vault (Infisical/AWS Secrets Manager); rotated every 90 days
- `DATABASE_URL`: Server-side only; rotated every 90 days

---

## 9.2 Integration: Stripe

**Responsibilities**:
- Subscription lifecycle management (create, upgrade, downgrade, cancel)
- Payment method storage (cards, ACH, SEPA — via Stripe Elements, PCI-compliant)
- Invoice generation and collection
- Webhook delivery (payment events, subscription state changes)
- Promoted listing campaign billing (metered usage via Stripe Billing)

**Data Flow**:
```
Client → Stripe Elements → Stripe API (PCI-compliant; card data never touches our servers)
                                     → Our Backend (Billing Service via webhook)
                                     → PostgreSQL billing_ledger (append-only ledger entry)
```

**Webhook Event Handling**:
| Stripe Event | Our Handler | Action |
|:-------------|:-----------|:-------|
| `checkout.session.completed` | Create subscription | Activate tenant plan |
| `invoice.payment_succeeded` | Mark invoice paid | Extend subscription period |
| `invoice.payment_failed` | Start grace period | Notify + countdown |
| `customer.subscription.deleted` | Cancel subscription | Downgrade to free |
| `customer.subscription.updated` | Sync plan | Update plan features |
| `charge.dispute.created` | Fraud alert | Flag for review |

**Security Model**:
- Webhook signature verification: `Stripe-Signature` header validated with `STRIPE_WEBHOOK_SECRET`
- Idempotency: All webhook handlers check `stripe_event_id` before processing
- PCI Compliance: Stripe handles all card data; we store only Stripe customer/payment method IDs
- HTTPS only: Webhook endpoint requires valid TLS certificate

**Failure Model**:
- Stripe API unavailable: Queue billing actions; retry up to 72 hours (Stripe retries webhooks automatically)
- Webhook delivery failure: Stripe retries for 72 hours with exponential backoff
- Double-charge prevention: Idempotency key on all Stripe API calls (format: `{tenant_id}:{billing_action}:{period}`)

**Rate Limits**: 
- Stripe API: 25,000 req/second (Enterprise). Our usage: ~100 req/second peak
- Webhook rate: Unlimited (Stripe pushes)

**Secrets Management**:
- `STRIPE_SECRET_KEY`: Server-side only; stored in Vault; rotated on suspicious activity
- `STRIPE_PUBLISHABLE_KEY`: Client-safe (used for Stripe Elements initialization)
- `STRIPE_WEBHOOK_SECRET`: Server-side only; per-endpoint secret; stored in Vault

---

## 9.3 Integration: OpenAI

**Responsibilities**:
- LLM completions (`gpt-4o-mini`, `gpt-4o`) — chat, moderation, insights, scoring
- Text embeddings (`text-embedding-3-small`) — semantic search, similarity, personalization
- Image safety classification (Vision API)
- Structured outputs (JSON schema responses)

**Data Flow**:
```
Domain Service → AI Gateway → Token Guard → Semantic Cache
                                          → [CACHE HIT] → Return cached response
                                          → [CACHE MISS] → OpenAI API → Cache result → Return
```

**Security Model**:
- API key stored in Vault only; never logged
- No PII (email, phone, full name) sent to OpenAI — anonymized/tokenized identifiers only
- Tenant data is never used in shared model training (Enterprise API with data residency)
- All prompts pass through internal safety filter before external API call

**Failure Model**:
- Timeout (>10s): Retry once immediately; if fails → failover to Anthropic
- Rate limit (429): Exponential backoff starting at 5s; max 3 retries
- OpenAI outage: Provider health monitor detects; automatic failover to Anthropic; emit `ai.provider_degraded`
- All provider outage: Return 503 for AI features; core platform remains functional

**Rate Limits** (our limits):
- Embeddings: 10,000 req/minute (managed via priority queue)
- Chat completions: 2,000 req/minute (managed via Token Guard per tenant)
- Vision: 500 req/minute (moderation use only)

**Secrets Management**:
- `OPENAI_API_KEY`: Vault only; server-side; rotated every 90 days or on breach
- `ANTHROPIC_API_KEY`: Vault only; server-side; failover key

---

## 9.4 Integration: Email Provider

**Provider**: SendGrid (primary) with Postmark as failover

**Responsibilities**:
- Transactional emails: Welcome, verification, password reset, notifications, invoices
- System alerts: Security events, payment failures, account changes
- Digest emails: Weekly analytics summaries, saved search alerts

**Data Flow**:
```
Notification Service → Email Provider SDK → SendGrid SMTP/API → Recipient
                                                              → Delivery webhook → Notification Service
```

**Template Architecture**:
- Templates managed in SendGrid Dynamic Templates
- Variables injected at send-time (no server-side HTML rendering)
- Template IDs stored in `notifications.notification_templates` table
- All templates: mobile-responsive, dark-mode compatible, plain-text fallback

**Security Model**:
- DKIM, DMARC, SPF: Configured on sending domain (`mail.platform.io`)
- Unsubscribe handling: One-click unsubscribe per RFC 8058; Preference management UI
- PII in emails: Minimized; no sensitive business data in email body

**Failure Model**:
- SendGrid unavailable: Failover to Postmark (same template format)
- Delivery failure (bounced): Mark email as undeliverable in notification records; alert tenant admin
- Spam flagged: Automated removal from mailing list; log to compliance

**Rate Limits**:
- SendGrid: 100 email/second (our limit); 1M/month on Enterprise plan

**Secrets Management**:
- `SENDGRID_API_KEY`: Vault only; server-side; rotated every 90 days

---

## 9.5 Integration: SMS Provider

**Provider**: Twilio

**Responsibilities**:
- MFA SMS codes (TOTP backup for phone-based MFA)
- Critical security alerts (account locked, suspicious login from new location)
- Lead notification (optional — high-urgency lead received)

**Data Flow**:
```
Notification Service → Twilio SDK → Twilio API → Carrier → Recipient
```

**Security Model**:
- Phone numbers stored encrypted (AES-256) in database
- SMS OTP: 6-digit code, 5-minute TTL, single-use
- Rate limit per phone: Max 5 SMS/hour per phone number (Twilio enforced)
- Country restrictions: Configurable; default allow G20 countries

**Failure Model**:
- Twilio outage: Fall back to email OTP for MFA (same UX, different channel)
- Delivery failure: Log and alert; user shown "SMS not delivered, try email"

**Rate Limits**: 1 req/second per Twilio phone number; scale with additional numbers

**Secrets Management**:
- `TWILIO_ACCOUNT_SID`: Vault only
- `TWILIO_AUTH_TOKEN`: Vault only; rotated every 90 days
- `TWILIO_PHONE_NUMBER`: Non-secret (but in Vault for consistency)

---

## 9.6 Integration: Storage Provider

**Provider**: Supabase Storage (backed by S3-compatible object storage)

**Responsibilities**:
- Listing media assets (images, videos, documents)
- User avatar images
- Company logo images
- Listing documents (PDFs, spec sheets)
- KYC document uploads (encrypted, private bucket)
- Export files (analytics CSV, listing exports)

**Bucket Architecture**:
| Bucket | Access | Encryption | CDN | Retention |
|:-------|:-------|:-----------|:----|:---------|
| `listing-media` | Public read, Auth write | At-rest AES-256 | ✅ | Permanent |
| `user-avatars` | Public read, Auth write (own) | At-rest AES-256 | ✅ | Until deletion |
| `company-assets` | Public read, Auth write | At-rest AES-256 | ✅ | Permanent |
| `kyc-documents` | Private (service_role only) | At-rest AES-256 + Client-side | ❌ | 7 years (compliance) |
| `exports` | Auth read (own files) | At-rest AES-256 | ❌ | 7 days TTL |
| `moderation-evidence` | Private (super_admin only) | At-rest AES-256 | ❌ | 2 years |

**Storage Path Convention**:
```
{bucket}/{tenant_id}/{entity_type}/{entity_id}/{uuid}.{ext}

Examples:
listing-media/abc123/listings/def456/main.webp
user-avatars/abc123/users/ghi789/avatar.webp
kyc-documents/abc123/orgs/jkl012/passport_scan.pdf
```

**Security Model**:
- Presigned URLs: 15-minute expiry for uploads; 1-hour for private downloads
- Storage RLS: Supabase Storage policies enforce bucket access by `tenant_id` from JWT
- MIME validation: Server-side validation after upload (reject unexpected types)
- File size limits enforced server-side before presigned URL issuance

**Failure Model**:
- Storage unavailable: New uploads return 503; existing CDN-cached assets remain available
- Upload timeout: Client retries with same presigned URL (idempotent); URL has 15-min window

---

## 9.7 Integration: Maps Provider

**Provider**: Google Maps Platform (Maps JavaScript API + Places API + Geocoding API)

**Responsibilities**:
- Listing location display (map embed on listing detail page)
- Location autocomplete (city/address input on listing creation)
- Geocoding (address to lat/lng coordinates for location-based filtering)

**Data Flow**:
```
Client → Google Maps JS (browser-side) → Map Display
Listing Form → Places Autocomplete → Geocoding API → Store lat/lng in DB
Search Filter → lat/lng → PostgreSQL PostGIS radius query → Location-filtered results
```

**Security Model**:
- API key restricted by: HTTP referrers (our domains only) + enabled APIs (Maps, Places, Geocoding only)
- Client-side key: Exposed in browser but domain-restricted
- Server-side geocoding: Separate key (more permissive) — stored in Vault

**Failure Model**:
- Maps unavailable: Show static placeholder image; disable location features
- Geocoding failure: Store raw address text; skip lat/lng; disable location filtering for that listing

**Rate Limits**: 
- Maps loads: $7 per 1,000 loads; $200/month free tier
- Geocoding: $5 per 1,000 requests; 50 QPS
- Places Autocomplete: $2.83 per 1,000 requests

**Secrets Management**:
- `GOOGLE_MAPS_CLIENT_KEY`: Restrictive domain-scoped key; can be in client bundle
- `GOOGLE_MAPS_SERVER_KEY`: Vault only; server-side geocoding

---

## 9.8 Integration: Analytics Provider

**Provider**: ClickHouse (self-hosted or ClickHouse Cloud) + Kafka

**Responsibilities**:
- Raw clickstream event storage (billions of rows)
- OLAP queries for analytics dashboards (sub-100ms query latency)
- Funnel analysis, cohort retention, attribution queries
- AI usage analytics aggregation
- Platform-wide Super Admin analytics

**Data Flow**:
```
Platform Events → Kafka Topic (analytics.*) → ClickHouse Kafka Engine → ClickHouse Tables
                                                                       → Analytics API
```

**ClickHouse Table Architecture**:
```sql
-- Raw events table (partitioned by month)
CREATE TABLE analytics.events (
  event_id     UUID,
  event_type   String,
  tenant_id    UUID,
  user_id      Nullable(UUID),
  session_id   UUID,
  listing_id   Nullable(UUID),
  properties   Map(String, String),
  timestamp    DateTime64(3, 'UTC')
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, event_type, timestamp)
TTL timestamp + INTERVAL 2 YEAR DELETE;

-- Pre-aggregated KPI table (populated by materialized views)
CREATE TABLE analytics.daily_kpis (
  date         Date,
  tenant_id    UUID,
  kpi_name     String,
  kpi_value    Float64,
  dimension    Map(String, String)
) ENGINE = SummingMergeTree()
ORDER BY (tenant_id, date, kpi_name)
TTL date + INTERVAL 3 YEAR;
```

**Security Model**:
- ClickHouse: Private VPC only; no public internet access
- All queries: `WHERE tenant_id = ?` enforced at query builder level (never bypassed)
- Super Admin queries: Explicitly remove tenant filter with audit log entry

**Failure Model**:
- ClickHouse unavailable: Analytics API returns stale data from PostgreSQL pre-aggregated snapshots
- Kafka lag: Analytics may be delayed up to 5 minutes; surfaced as `data_freshness_warning` in dashboard

**Rate Limits**: ClickHouse cluster-level; managed by query concurrency limits (max 100 concurrent queries per cluster)

**Secrets Management**:
- `CLICKHOUSE_URL`: Vault; private VPC endpoint
- `CLICKHOUSE_USER` + `CLICKHOUSE_PASSWORD`: Vault; rotated every 90 days

---

## 9.9 Integration: Monitoring Provider

**Provider Stack**: 
- **Traces**: OpenTelemetry → Tempo (self-hosted) OR Honeycomb (managed)
- **Metrics**: Prometheus + Grafana
- **Logs**: Structured JSON → Loki (self-hosted) OR DataDog (managed)
- **Alerting**: PagerDuty (incidents) + Slack (non-urgent)
- **Error Tracking**: Sentry (frontend + backend)

**Data Flow**:
```
Services → OTel SDK → OTel Collector → Tempo (traces)
                                     → Prometheus (metrics)
                                     → Loki (logs)
                                     → Grafana (visualization)
                                     → Alertmanager → PagerDuty / Slack
```

**Secrets Management**:
- `OTEL_EXPORTER_ENDPOINT`: Non-secret internal endpoint
- `PAGERDUTY_ROUTING_KEY`: Vault; server-side alerting only
- `SENTRY_DSN`: Safe to include in client bundles (Sentry scrubs PII)

---

# SECTION 10 — OBSERVABILITY CONTRACTS

## 10.0 Observability Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                     FOUR PILLARS OF OBSERVABILITY                   │
│                                                                     │
│  LOGS → Structured JSON (request, error, audit, business)          │
│  METRICS → RED (Rate, Errors, Duration) + USE + Business           │
│  TRACES → Distributed context propagation (OTel W3C TraceContext)  │
│  EVENTS → Business telemetry (Kafka → ClickHouse)                  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 10.1 Logging Standards

### Log Structure (Universal)
```json
{
  "timestamp": "ISO-8601 UTC",
  "level": "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL",
  "service": "listing-service",
  "version": "1.4.2",
  "environment": "production",
  "trace_id": "uuid (W3C trace context)",
  "span_id": "uuid",
  "correlation_id": "uuid (from X-Request-ID header)",
  "tenant_id": "uuid | null",
  "user_id": "uuid | null (hashed for PII safety)",
  "message": "string",
  "context": { ... },
  "duration_ms": 124,
  "http": {
    "method": "POST",
    "path": "/api/v1/listings",
    "status_code": 201,
    "request_size_bytes": 4200,
    "response_size_bytes": 312
  },
  "error": {
    "type": "ValidationError",
    "message": "string",
    "stack": "string (production: omit; staging: include)"
  }
}
```

### Log Categories

| Category | Level | Retention | Storage |
|:---------|:------|:---------|:--------|
| **Request Logs** | INFO | 30 days | Loki |
| **Error Logs** | ERROR/FATAL | 90 days | Loki + Sentry |
| **Slow Query Logs** (>100ms) | WARN | 30 days | Loki |
| **Security Logs** | INFO/WARN | 1 year | Loki + Audit DB |
| **Business Event Logs** | INFO | 2 years | ClickHouse |
| **AI Inference Logs** | INFO | 90 days | PostgreSQL + Archive |
| **Audit Logs** | INFO | 3 years | PostgreSQL governance schema |

### PII Handling in Logs
- **NEVER log**: Raw passwords, credit card numbers, SSNs, raw email addresses, phone numbers
- **Hash before logging**: User IDs (SHA-256 salted), IP addresses (SHA-256), email (for correlation)
- **Truncate**: Request/response bodies > 10KB
- **Mask**: API keys (show first 8 chars only: `pk_live_abc1****`)

---

## 10.2 Audit Standards

### Audit Log Schema
```sql
CREATE TABLE governance.audit_logs (
  audit_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID,              -- NULL for platform-level actions
  actor_id        UUID NOT NULL,
  actor_type      TEXT NOT NULL,     -- user | service | system | super_admin
  actor_ip_hash   TEXT NOT NULL,     -- SHA-256 of actor IP
  action          TEXT NOT NULL,     -- e.g. "listing.create", "tenant.suspend"
  resource_type   TEXT NOT NULL,     -- e.g. "listing", "tenant", "user"
  resource_id     UUID,
  old_state       JSONB,             -- State before change (scrubbed PII)
  new_state       JSONB,             -- State after change (scrubbed PII)
  metadata        JSONB,             -- Additional context
  result          TEXT NOT NULL,     -- SUCCESS | FAILURE | PARTIAL
  failure_reason  TEXT,
  trace_id        UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
) PARTITION BY RANGE (created_at);
-- Partition monthly; 3-year retention
```

### Mandatory Audit Events
ALL of the following actions MUST generate an audit log entry:

| Action Category | Examples |
|:---------------|:---------|
| **Authentication** | Login, logout, MFA enroll, password change, API key create/revoke |
| **Tenant Management** | Create, suspend, unsuspend, delete, plan change |
| **User Management** | Role change, member remove, invitation send |
| **Listing Lifecycle** | Publish, archive, status change, bulk import |
| **Moderation Decisions** | Approve, reject, escalate, appeal decision |
| **Billing Actions** | Subscription change, payment override, credit adjustment |
| **Admin Actions** | ANY Super Admin action (all must be audited) |
| **Security Events** | Failed authentication, brute-force detection, suspicious IP |
| **Data Export** | Any bulk data export or report generation |

### Audit Integrity Guarantees
- Audit log is append-only (no UPDATE/DELETE on audit_logs)
- Service role has INSERT only on audit_logs; no UPDATE/DELETE grant
- Audit entries written in same transaction as the audited action (where possible)
- For async actions: Audit entry written at event publication time

---

## 10.3 Metrics Standards

### Service-Level Metrics (RED Method)

**Rate** (requests per second):
```
http_requests_total{service, endpoint, method, status_code, tenant_plan}
ai_inference_requests_total{service, model, task_type, cache_hit}
event_published_total{service, event_type, status}
```

**Errors** (error rate):
```
http_errors_total{service, endpoint, error_code}
ai_inference_errors_total{service, model, error_type}
db_query_errors_total{service, query_type, error_code}
```

**Duration** (latency histograms):
```
http_request_duration_ms{service, endpoint, method, status_code}
ai_inference_duration_ms{model, task_type, cache_hit}
db_query_duration_ms{service, query_type, table}
vector_search_duration_ms{stage, tenant_plan}
```

### Infrastructure Metrics (USE Method)
```
cpu_utilization_pct{instance, service}
memory_utilization_pct{instance, service}
db_connections_active{pool, service}
db_connections_max{pool}
redis_memory_used_bytes{instance}
kafka_consumer_lag{topic, consumer_group}
realtime_connections_active{node}
```

### Business Metrics
```
listings_created_total{tenant_plan, listing_type}
listings_active_total{tenant_plan, category}
leads_created_total{source, tenant_plan}
leads_converted_total{tenant_plan}
feed_generations_total{personalized, has_filters}
search_queries_total{has_results, tenant_plan}
ai_tokens_consumed_total{model, task_type, tenant_plan}
subscriptions_active{plan_tier, billing_cycle}
mrr_usd{plan_tier}                              -- Monthly Recurring Revenue
```

### SLO Definitions

| Service | SLI | SLO Target | Alert: Error Budget |
|:--------|:----|:----------|:-------------------|
| API Gateway | p99 latency | <200ms | >10% budget consumed in 1h |
| Search / Feed | p99 latency | <100ms | >10% budget consumed in 30min |
| AI Gateway | p95 latency | <3000ms | >20% budget consumed in 1h |
| Authentication | error rate | <0.1% | Any error rate >0.5% for 5min |
| Billing Service | error rate | <0.01% | Any error for billing mutations |
| Realtime | connection success rate | >99.5% | <99% for 5min |
| Database | availability | >99.9% | Any downtime |
| Overall Platform | availability | >99.9% | Any p1 incident |

---

## 10.4 Tracing Standards

### Distributed Trace Structure
```
Trace: POST /api/v1/feed [50ms total]
  │
  ├── Span: JWT Validation [2ms]
  ├── Span: Tenant Context Load [3ms]
  ├── Span: Redis Preference Cache [1ms]
  │
  ├── Span: Discovery Pipeline [44ms]
  │   ├── Span: Query Embedding [18ms]  ← AI Service
  │   ├── Span: Vector Search Stage 1 [12ms]  ← pgvector
  │   ├── Span: Light Ranking Stage 2 [8ms]  ← in-memory
  │   └── Span: Neural Re-ranking Stage 3 [6ms]  ← preference alignment
  │
  └── Span: Response Serialization [1ms]
```

### Trace Context Propagation
- **Format**: W3C TraceContext (`traceparent` header)
- **Header**: `traceparent: 00-{trace_id}-{span_id}-01`
- **Propagation**: Required across ALL service-to-service calls (HTTP + gRPC + Kafka message headers)
- **Sampling Strategy**: 
  - Head-based: 10% sampling for healthy traffic
  - Tail-based: 100% sampling for errors, slow requests (>500ms), and AI quota events
  - Full capture: Security events, billing mutations

### Mandatory Span Attributes
```json
{
  "service.name": "listing-service",
  "service.version": "1.4.2",
  "deployment.environment": "production",
  "tenant.id": "uuid",
  "user.id": "hashed_uuid",
  "http.method": "POST",
  "http.route": "/api/v1/listings",
  "http.status_code": 201,
  "db.system": "postgresql",
  "db.statement": "INSERT INTO ... (SCRUBBED)",
  "ai.model": "gpt-4o-mini",
  "ai.tokens.input": 842
}
```

---

## 10.5 Alert Standards

### Alert Severity Matrix
| Severity | Response Time | Channel | Action |
|:---------|:-------------|:--------|:-------|
| **P0 — Critical** | 5 minutes | PagerDuty + Phone call | All-hands incident |
| **P1 — High** | 15 minutes | PagerDuty | Incident response team |
| **P2 — Medium** | 1 hour | PagerDuty (low priority) + Slack | Engineer investigates |
| **P3 — Low** | Next business day | Slack | Ticket created |

### Alert Rules

**P0 — Critical (Immediate)**:
```yaml
- name: DatabaseDown
  condition: db_availability < 1 for 1 minute
  
- name: AuthServiceDown
  condition: auth_endpoint_success_rate < 0.5 for 2 minutes
  
- name: BillingServiceError
  condition: billing_mutation_error_rate > 0 for 5 minutes
  
- name: DataBreach
  condition: cross_tenant_query_detected == true
```

**P1 — High**:
```yaml
- name: SearchLatencyBreach
  condition: vector_search_p99_ms > 500 for 5 minutes
  
- name: AIProviderDown
  condition: ai_provider_error_rate > 0.5 for 2 minutes
  
- name: FraudSurge
  condition: trust.fraud_detected events > 10 in 5 minutes
  
- name: SLOBurnRate
  condition: error_budget_consumed > 10% in 60 minutes
```

**P2 — Medium**:
```yaml
- name: HighEmbeddingQueueDepth
  condition: ai_embedding_queue_depth > 10000 for 15 minutes
  
- name: KafkaConsumerLag
  condition: kafka_consumer_lag > 50000 for 10 minutes
  
- name: SLAModeration
  condition: moderation.sla_breached events > 5 in 60 minutes
  
- name: StorageQuotaHigh
  condition: any tenant storage_utilization_pct > 90
```

---

## 10.6 AI Monitoring Standards

**AI-Specific Metrics**:
```
ai.inference.total_requests          — Total inference requests (by model, task)
ai.inference.cache_hit_rate          — Semantic cache effectiveness (target: >40%)
ai.inference.cost_usd_total          — Total AI spend (by tenant, model)
ai.tokens.consumed_total             — Token throughput (by model, direction)
ai.provider.error_rate               — Per-provider error rate
ai.provider.latency_p95_ms           — Provider latency percentiles
ai.quota.exceeded_total              — Token budget exceeded events (by tenant)
ai.moderation.accuracy               — Human override rate (signals false positive rate)
ai.embedding.queue_depth             — Pending embedding jobs
```

**AI Quality Monitoring**:
- **Moderation Accuracy**: Track rate of human overrides on AI decisions. If >15% overrides in 7 days → trigger model evaluation
- **Search Relevance**: Sample 1% of searches → measure click-through rate on top result. Target CTR >30%
- **Recommendation Quality**: Track recommendation click rate per surface. Target >8% CTR
- **Lead Score Accuracy**: Compare AI lead scores against actual conversion rates monthly

---

## 10.7 Billing Monitoring Standards

**Billing-Specific Metrics**:
```
billing.subscriptions.active{plan_tier}          — Active subscription count
billing.mrr_usd{plan_tier}                       — Monthly Recurring Revenue
billing.churn_rate{plan_tier}                    — Monthly churn rate
billing.payment_failures_total                   — Payment failure count
billing.payment_failure_rate                     — % of invoices that fail payment
billing.invoice_volume_total{status}             — Invoice volume by status
billing.overage_events_total{resource}           — Quota overage occurrences
billing.usage_vs_limit_pct{resource, plan_tier}  — Resource utilization
```

**Billing Alerts**:
- Any billing mutation error → Immediate P1 alert
- Payment failure rate >5% in 24h → P2 alert
- Stripe webhook backlog >100 events → P2 alert
- MRR decrease >10% day-over-day → P2 alert (potential churn surge)

---

## 10.8 Security Monitoring Standards

**Security Metrics**:
```
security.login_failures_total{reason}           — Failed login counts
security.brute_force_blocks_total               — Active brute-force blocks
security.suspicious_ips_total                   — IPs flagged by trust engine
security.api_key_usage_anomalies                — Unusual API key usage patterns
security.rls_policy_violations_total            — Attempted cross-tenant access
security.admin_actions_total{action}            — Super Admin action frequency
```

**Security Alerts**:
- Cross-tenant data access attempt → Immediate P0 alert + incident
- >100 login failures from single IP in 5 min → P1 alert
- Admin console access from new IP → P1 alert + MFA re-challenge
- API key used from new country → P2 alert
- Unusual bulk data export → P2 alert

---

# SECTION 11 — BACKEND IMPLEMENTATION READINESS

## 11.0 Implementation Philosophy
- **Modular Monolith First**: Deploy all services as a single Next.js application initially; extract to microservices when scale dictates
- **Event-Driven from Day 1**: Outbox pattern enforced from first commit; no synchronous cross-domain calls
- **Test-First**: Unit tests before features; integration tests before deployment; E2E before launch

---

## 11.1 Backend Work Packages

### WP-B01: Foundation & Infrastructure
**Priority**: P0 (must complete before any other work)
**Estimated Effort**: 3 weeks (2 engineers)
**Complexity**: High

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Database schema migration (Spec 22 evolution) | All tables created; RLS policies active; verified no cross-tenant leakage |
| Outbox pattern implementation | Outbox table + relay service operational; events reaching Kafka |
| Base API framework (Next.js App Router API routes) | Universal request/response envelope; error handling; tracing middleware |
| JWT validation middleware | All authenticated routes verified; invalid tokens rejected |
| Tenant context injection | `app.current_tenant_id` set on every database connection |
| Secrets management setup | All secrets in Vault; zero secrets in code or env files |
| OTel instrumentation | Traces flowing to backend; latency visible in Grafana |

**Dependencies**: None  
**Risks**: Database migration order on existing Supabase instance; RLS policy conflicts with existing policies  
**Mitigation**: Run migrations in dry-run mode; test RLS on staging with synthetic cross-tenant queries

---

### WP-B02: Identity & RBAC Service
**Priority**: P0  
**Estimated Effort**: 2 weeks (1 engineer)  
**Complexity**: Medium

| Task | Acceptance Criteria |
|:-----|:-------------------|
| All auth API endpoints (§2.1) | Registration, login, MFA, refresh, logout all working |
| JWT claim structure finalized | tenant_id, role, plan_tier, scopes all present in JWT |
| MFA enrollment and verification | TOTP working; backup codes working; SMS fallback working |
| Brute-force protection | 5 failed attempts → 15-min lockout; verified by load test |
| RBAC middleware | Permission matrix from §8 enforced on all routes |
| Password reset flow | Token generation, email delivery, token consumption all tested |

**Dependencies**: WP-B01  
**Risks**: Supabase Auth integration complexity with custom JWT claims  
**Mitigation**: Use Supabase Auth hooks for custom claim injection

---

### WP-B03: Tenant & Organization Service
**Priority**: P0  
**Estimated Effort**: 2 weeks (1 engineer)  
**Complexity**: Medium

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Tenant provisioning flow | New tenant gets workspace in <10 seconds |
| Plan assignment and feature flags | Plan features enforced on first use |
| Quota meter initialization | All quota counters initialized at provisioning |
| Custom domain provisioning | DNS verification + SSL certificate automation |
| Team member management APIs | Invite, accept, remove, role change all working |
| Invitation email flow | Invitation token delivered; accepted; membership created |

**Dependencies**: WP-B01, WP-B02

---

### WP-B04: Listing Service
**Priority**: P1  
**Estimated Effort**: 3 weeks (2 engineers)  
**Complexity**: High

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Listing CRUD APIs (§2.6) | Create, read, update, archive all working with version snapshots |
| Status machine enforcement | Invalid transitions rejected; transitions logged |
| Listing quota enforcement | Creation blocked when quota exceeded |
| Bulk import endpoint | 500-listing batch imports within 120 seconds |
| Outbox events for all lifecycle changes | All listing events reaching Kafka |
| Listing search index materialized view | Search candidates refreshed within 30s of listing change |

**Dependencies**: WP-B01, WP-B02, WP-B03

---

### WP-B05: Media Service
**Priority**: P1  
**Estimated Effort**: 1.5 weeks (1 engineer)  
**Complexity**: Medium

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Presigned upload URL generation | URLs generated in <500ms; expire after 15 min |
| Upload completion webhook | CDN URLs generated within 10s of upload completion |
| Image optimization pipeline | WebP conversion + 3 responsive sizes within 10s |
| Storage quota enforcement | Uploads blocked when storage limit reached |
| CDN integration | All uploaded images served via CDN with correct cache headers |

**Dependencies**: WP-B01, WP-B04

---

### WP-B06: AI Service & Embedding Pipeline
**Priority**: P1  
**Estimated Effort**: 3 weeks (2 engineers)  
**Complexity**: Very High

| Task | Acceptance Criteria |
|:-----|:-------------------|
| AI Gateway with Token Guard | Token budget enforced per tenant; quota exceeded event emitted |
| Semantic cache implementation | Cache hit rate >40% on repeated queries |
| Embedding generation pipeline | Listings embedded within 60s of creation |
| Priority queue implementation | HIGH priority requests processed first; queue observable |
| Provider failover logic | OpenAI → Anthropic failover in <30s on outage |
| Streaming completions | SSE streaming working end-to-end |
| AI governance policies | Per-tenant topic restrictions enforced |

**Dependencies**: WP-B01, WP-B02, WP-B03

---

### WP-B07: Discovery & Search Service
**Priority**: P1  
**Estimated Effort**: 4 weeks (2 engineers)  
**Complexity**: Very High

| Task | Acceptance Criteria |
|:-----|:-------------------|
| pgvector HNSW index setup | P99 vector query <15ms on 1M listings |
| 4-stage ranking pipeline | Combined P99 <50ms; each stage within budget |
| Personalized feed API | Feed returned in <50ms; personalization applied when profile available |
| Search API with facets | Facets generated correctly; pagination working |
| Typeahead suggestions | <300ms response time; relevant suggestions |
| Clickstream ingestion | Events accepted at 600 req/min per user; Kafka delivery confirmed |
| Exploration/exploitation | 10% of feed slots correctly allocated to exploration |
| MAB state management | Bandit state updated per feed generation |

**Dependencies**: WP-B01, WP-B04, WP-B06

---

### WP-B08: Recommendation Service
**Priority**: P2  
**Estimated Effort**: 3 weeks (1 engineer)  
**Complexity**: High

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Item similarity computation | Top-20 related listings per listing; weekly refresh |
| Trending listings engine | Hourly/daily/weekly trending with exponential decay |
| User recommendation snapshots | Snapshots generated for active users; 4h refresh |
| Redis sorted set caching | Snapshot retrieval <10ms |
| Recommendation feedback logging | All interactions on recommendation surfaces logged |

**Dependencies**: WP-B01, WP-B06, WP-B07

---

### WP-B09: Personalization Engine
**Priority**: P2  
**Estimated Effort**: 2.5 weeks (1 engineer)  
**Complexity**: High

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Fast-loop vector update | Preference vector updated in Redis within 200ms of click |
| Slow-loop batch job | Daily batch updates all active user profiles |
| Explicit preference storage | User-declared preferences override implicit signals |
| Preference evolution logging | Delta magnitude logged per update |
| Cold start handling | New users receive category-trending fallback |

**Dependencies**: WP-B01, WP-B06, WP-B07

---

### WP-B10: Billing & Subscription Service
**Priority**: P1  
**Estimated Effort**: 4 weeks (2 engineers)  
**Complexity**: Very High

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Stripe Checkout integration | Plan purchase working end-to-end |
| Webhook processing | All Stripe events processed idempotently |
| Ledger implementation | Append-only; no updates/deletes; double-billing prevention |
| Usage metering | AI tokens, storage, listing counts metered in real-time |
| Invoice generation | Invoices generated monthly; PDF download working |
| Campaign management | CPC/CPM campaigns created; budget tracking working |
| Grace period logic | 7-day grace period on payment failure; suspension at day 7 |

**Dependencies**: WP-B01, WP-B02, WP-B03

---

### WP-B11: Trust & Safety + Moderation Service
**Priority**: P1  
**Estimated Effort**: 3 weeks (2 engineers)  
**Complexity**: High

| Task | Acceptance Criteria |
|:-----|:-------------------|
| AI content pre-screening | Listings scanned within 5 min of creation |
| Human review queue API | Cases visible in admin queue; decisions recorded |
| Trust score computation | Scores recalculated on every relevant event |
| Fraud detection rules | Velocity rules active; flags generated correctly |
| Behavioral anomaly detection | Unusual patterns flagged within 6 hours |
| Appeal workflow | Appeal submission and resolution working |

**Dependencies**: WP-B01, WP-B04, WP-B06

---

### WP-B12: Analytics Service
**Priority**: P2  
**Estimated Effort**: 3 weeks (1 engineer)  
**Complexity**: High

| Task | Acceptance Criteria |
|:-----|:-------------------|
| ClickHouse schema setup | Tables created; Kafka integration active |
| Kafka → ClickHouse pipeline | Events flowing with <5 min lag |
| Dashboard KPI APIs | All dashboard metrics returning correct data |
| Funnel analysis | Funnel conversion rates computed correctly |
| Cohort retention | 8-week retention cohort table working |
| AI usage analytics | Token consumption by model/task working |
| Revenue attribution | Lead → conversion → revenue attribution working |

**Dependencies**: WP-B01, WP-B04, WP-B07, WP-B10

---

### WP-B13: Notification & Messaging Service
**Priority**: P1  
**Estimated Effort**: 2 weeks (1 engineer)  
**Complexity**: Medium

| Task | Acceptance Criteria |
|:-----|:-------------------|
| In-app notification delivery | Notifications appear in inbox within 1s |
| Email delivery | Transactional emails sent via SendGrid |
| Realtime notification push | WebSocket delivery of new notifications |
| Messaging thread management | Create, send, read, typing indicator all working |
| Read receipts | Read status updated and broadcast to participants |

**Dependencies**: WP-B01, WP-B02

---

### WP-B14: CRM & Lead Service
**Priority**: P2  
**Estimated Effort**: 2 weeks (1 engineer)  
**Complexity**: Medium

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Lead capture form API | Anonymous + authenticated lead submission |
| AI lead scoring | Score available within 5s of lead creation |
| Lead pipeline management | Status transitions working; history logged |
| CRM contact aggregation | All buyer interactions unified in contact timeline |
| Lead assignment routing | Agent assignment and notification working |

**Dependencies**: WP-B01, WP-B04, WP-B06

---

### WP-B15: Super Admin Service
**Priority**: P2  
**Estimated Effort**: 2 weeks (1 engineer)  
**Complexity**: Medium

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Platform dashboard APIs | All health metrics returning real data |
| Tenant management APIs | Suspend, unsuspend, trial extend all working |
| Moderation queue APIs | Cases visible; decisions publishable |
| Audit log query APIs | Searchable by actor, action, date range |
| Global announcement APIs | Announcements published and broadcast |

**Dependencies**: WP-B01 through WP-B14 (reads from all services)

---

## 11.2 Implementation Order & Dependency Graph

```
Week 1-3:   WP-B01 (Foundation) ────────────────────────────────────┐
Week 3-5:   WP-B02 (Identity) ──────────────────────┐               │
            WP-B03 (Tenant) ───────────────────────┐ │               │
                                                   │ │               │
Week 5-8:   WP-B04 (Listing) ──────────────────────┤ │               │
            WP-B05 (Media) ─────────────────────────┤ │               │
            WP-B06 (AI Service) ────────────────────┤ │               │
            WP-B10 (Billing) ────────────────────────┤─┘               │
            WP-B11 (Trust/Mod) ─────────────────────┤                │
            WP-B13 (Notifications) ─────────────────┤                │
                                                   │                │
Week 8-12:  WP-B07 (Discovery) ─────────────────────┤                │
            WP-B08 (Recommendations) ───────────────┤                │
            WP-B09 (Personalization) ───────────────┤                │
            WP-B12 (Analytics) ─────────────────────┤                │
            WP-B14 (CRM/Leads) ─────────────────────┤                │
                                                   │                │
Week 12-14: WP-B15 (Super Admin) ───────────────────┘────────────────┘
```

---

## 11.3 Risk Register (Backend)

| # | Risk | Probability | Impact | Mitigation |
|:--|:-----|:-----------|:-------|:-----------|
| R-B1 | pgvector P99 latency breach on 1M+ listings | High | High | Implement HNSW index with tuned `ef_search`; add Redis candidate cache as fallback |
| R-B2 | Outbox relay falling behind under high load | Medium | High | Deploy multiple relay instances; implement backpressure; monitor lag metric |
| R-B3 | OpenAI API cost overrun | High | Medium | Token Guard per tenant; semantic cache (target >40% hit rate); cost alerts |
| R-B4 | RLS performance degradation on complex policies | Medium | High | Index all `tenant_id` columns; test with production-scale data in staging |
| R-B5 | Stripe webhook processing delays | Low | High | Idempotent handlers; dead-letter queue; reconciliation cron every 15 min |
| R-B6 | Kafka consumer lag accumulation | Medium | Medium | Auto-scaling consumer groups; lag alerts at 50K events |
| R-B7 | ClickHouse ingestion pipeline failure | Medium | Medium | PostgreSQL aggregates as fallback; dual-write initially |
| R-B8 | Cross-tenant data leakage via missing RLS | Low | Critical | Automated RLS audit tests in CI; penetration test before launch |

---

## 11.4 Acceptance Criteria (Backend)

Before any backend module is considered **DONE**:

1. ✅ All defined API endpoints return correct responses for valid inputs
2. ✅ All defined API endpoints return correct error codes for invalid inputs
3. ✅ All relevant events are emitted via Outbox and reach Kafka consumers
4. ✅ RLS policies verified: authenticated users cannot access other tenants' data
5. ✅ Unit test coverage ≥80% on business logic (service layer)
6. ✅ Integration tests cover happy path + primary error paths
7. ✅ OpenTelemetry traces visible for all operations
8. ✅ All rate limits enforced and returning correct HTTP 429 responses
9. ✅ All idempotency keys honored (duplicate requests return same response)
10. ✅ No PII in logs (verified by log inspection script)
11. ✅ All secrets accessed from Vault only (verified by secret scanning CI step)
12. ✅ Load test: endpoint handles 10× expected peak traffic without degradation

---

# SECTION 12 — FRONTEND IMPLEMENTATION READINESS

## 12.0 Frontend Architecture Decision

**Monorepo Structure** (Turborepo):
```
platform-frontend/
├── apps/
│   ├── marketplace/         — Next.js 15 (marketplace.platform.io)
│   ├── dashboard/           — Next.js 15 (app.platform.io)
│   ├── admin/               — Next.js 15 (admin.platform.io)
│   └── mobile/              — Expo React Native
├── packages/
│   ├── ui/                  — Shared component library
│   ├── api-client/          — Generated TypeScript API client
│   ├── realtime/            — Shared Supabase Realtime client wrapper
│   ├── auth/                — Shared auth utilities
│   └── types/               — Shared TypeScript types
└── tooling/
    ├── eslint-config/
    ├── typescript-config/
    └── vitest-config/
```

---

## 12.1 Frontend Work Packages

### WP-F01: Design System & Component Library
**Priority**: P0  
**Estimated Effort**: 3 weeks (1 frontend engineer + 1 designer)  
**Complexity**: High

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Design token system | Color, spacing, typography tokens defined; dark mode supported |
| Base components | Button, Input, Card, Modal, Toast, Badge, Skeleton all working |
| Layout components | AppShell, PageHeader, SideNav, Grid all working |
| Data display | DataTable (10K rows virtualized), ListingCard, UserAvatar |
| Form components | FormField, Select, DatePicker, TagInput all working |
| Loading states | Skeleton loaders for every major content block |
| Error states | Empty state, error boundary, retry UI |
| Accessibility | WCAG 2.1 AA audit passed; keyboard navigation working |

**Dependencies**: None  
**Risks**: Design inconsistencies if tokens not enforced; component API churn  
**Mitigation**: Storybook for all components; type-safe component props

---

### WP-F02: Authentication Flows (Web)
**Priority**: P0  
**Estimated Effort**: 1.5 weeks (1 engineer)  
**Complexity**: Medium

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Registration page | Form validation; org creation; email verification prompt |
| Login page | Email/password; MFA challenge; error states |
| Forgot password flow | Request → email → reset form working end-to-end |
| MFA enrollment UI | QR code display; TOTP input; backup codes shown |
| Token refresh middleware | Silent token refresh; redirect on session expiry |
| Route protection HOC | Authenticated routes redirect to login |

**Dependencies**: WP-F01, WP-B02

---

### WP-F03: Marketplace Web — Core Discovery
**Priority**: P0  
**Estimated Effort**: 4 weeks (2 engineers)  
**Complexity**: Very High

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Homepage with personalized feed | Feed loads <2.5s LCP; infinite scroll; ISR for SSR shell |
| Search page with facets | Real-time facet filtering; URL-state persistence |
| Typeahead search | 150ms debounce; 5 suggestions; keyboard navigation |
| Listing detail page | ISR (120s); all fields displayed; media gallery |
| Category browse pages | ISR (300s); nested category tree navigation |
| Clickstream tracking | All interactions sent to `/api/v1/interactions` |
| Saved search creation | Save current search with alert preferences |
| Realtime new listing alerts | WebSocket connection; notification on new match |

**Dependencies**: WP-F01, WP-F02, WP-B07

---

### WP-F04: Marketplace Web — Transactions & User
**Priority**: P1  
**Estimated Effort**: 2 weeks (1 engineer)  
**Complexity**: Medium

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Lead submission form | Multi-step form; anonymous + authenticated; confirmation |
| Favorites management | Add/remove; collections; persistence |
| Notification inbox | Paginated list; mark read; realtime badge update |
| Messaging interface | Thread list; message composer; real-time delivery |
| User profile page | Edit profile; avatar upload; preferences |
| Registration/login pages | All auth flows working (see WP-F02) |

**Dependencies**: WP-F03, WP-B13, WP-B14

---

### WP-F05: Tenant Dashboard — Core
**Priority**: P1  
**Estimated Effort**: 4 weeks (2 engineers)  
**Complexity**: High

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Dashboard overview | All KPI widgets populated; time period selector |
| Listing manager | Table with virtual scroll; status filters; bulk actions |
| Listing create/edit form | All fields; media upload; category selection; attribute builder |
| Analytics module (basic) | Line charts; bar charts; time period selector |
| Team member management | List; invite; role change; remove |
| Settings page | Tenant settings; branding; custom domain |

**Dependencies**: WP-F01, WP-F02, WP-B04, WP-B05, WP-B12

---

### WP-F06: Tenant Dashboard — Advanced Modules
**Priority**: P2  
**Estimated Effort**: 3 weeks (2 engineers)  
**Complexity**: High

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Lead manager + CRM | Lead pipeline kanban; contact timeline; AI score display |
| Analytics advanced (funnel, cohort) | Funnel visualization; cohort retention heatmap |
| Campaign manager | Create/edit campaigns; budget tracking; performance metrics |
| Billing module | Subscription info; invoice list; usage meters; upgrade flow |
| AI Insights widget | Insight cards; action items; confidence scores |
| Realtime analytics stream | Live query feed; real-time metric updates |

**Dependencies**: WP-F05, WP-B10, WP-B12, WP-B14

---

### WP-F07: Super Admin Console
**Priority**: P2  
**Estimated Effort**: 3 weeks (1 engineer)  
**Complexity**: High

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Platform health dashboard | Real-time service status; SLO burn rate; active incidents |
| Tenant management table | Search/filter; suspend; extend trial; view detail |
| Moderation queue | Case list; content preview; decision form; SLA indicators |
| Trust & fraud panel | Risk score distribution; fraud alerts; manual override |
| Audit log viewer | Searchable; filterable by actor/action/date; export |
| Global announcements | Create; preview; publish; target by plan |

**Dependencies**: WP-F01, WP-F02, WP-B11, WP-B15

---

### WP-F08: Mobile Application
**Priority**: P2  
**Estimated Effort**: 6 weeks (2 engineers)  
**Complexity**: Very High

| Task | Acceptance Criteria |
|:-----|:-------------------|
| Shared API client package | 100% type-safe; same as web |
| Authentication flows | Login; registration; MFA; biometric (FaceID/TouchID) |
| Home feed (native) | Feed loads <800ms from cache; pull-to-refresh |
| Search (native) | Typeahead; filters; results list |
| Listing detail | Full detail view; contact form; gallery |
| Messaging | Conversation list; message thread; real-time delivery |
| Push notifications | Lead received; message received; billing alert |
| Dashboard (agents) | Lead pipeline; assigned leads; quick actions |
| Offline support | SQLite cache; background sync |

**Dependencies**: WP-F01 (design tokens), WP-B04, WP-B07, WP-B13

---

## 12.2 Frontend Implementation Order

```
Week 1-3:   WP-F01 (Design System) ──────────────────────┐
Week 2-4:   WP-F02 (Auth Flows) ────────────────────────┐ │
                                                        │ │
Week 4-8:   WP-F03 (Marketplace Core) ─────────────────┤ │
            WP-F04 (Marketplace Transactions) ──────────┤ │
            WP-F05 (Dashboard Core) ────────────────────┤ │
                                                        │ │
Week 8-12:  WP-F06 (Dashboard Advanced) ───────────────┤ │
            WP-F07 (Admin Console) ─────────────────────┤ │
            WP-F08 (Mobile) ────────────────────────────┘─┘
```

---

## 12.3 Frontend Risk Register

| # | Risk | Probability | Impact | Mitigation |
|:--|:-----|:-----------|:-------|:-----------|
| R-F1 | Feed LCP >2.5s on cold load | Medium | High | ISR shell + skeleton; preload critical fonts; optimize bundle |
| R-F2 | Real-time connection instability on mobile | High | Medium | Reconnection logic with 32s max backoff; offline fallback |
| R-F3 | State sync inconsistency (REST + Realtime) | Medium | High | TanStack Query invalidation on every realtime event |
| R-F4 | Mobile bundle size too large | Medium | Medium | Code splitting by screen; lazy load heavy modules |
| R-F5 | Design system component API breaking changes | Low | High | Semantic versioning on UI package; deprecation warnings |
| R-F6 | Search UX degradation on mobile keyboards | Medium | Medium | Test on real devices; viewport resize handling |

---

## 12.4 Frontend Acceptance Criteria

Before any frontend module is considered **DONE**:

1. ✅ All UI states: loading, empty, error, success implemented
2. ✅ Responsive: works on 320px–1920px viewport widths
3. ✅ Core Web Vitals: LCP <2.5s, INP <200ms, CLS <0.1 (Lighthouse score >90)
4. ✅ Accessibility: WCAG 2.1 AA (axe-core 0 violations)
5. ✅ Dark mode: All components work in both light/dark mode
6. ✅ Error boundaries: No uncaught errors propagate to blank screen
7. ✅ Auth state: Handles token expiry gracefully (silent refresh or redirect)
8. ✅ No PII in logs: No email/phone/name in browser console logs or analytics
9. ✅ Playwright E2E: Happy path test for every major user flow
10. ✅ Bundle budget: Page JS bundles <200KB (gzipped) initial load
11. ✅ Network resilience: Handles offline state with appropriate UI
12. ✅ Cross-browser: Chrome 120+, Safari 16+, Firefox 121+ tested

---

# SECTION 13 — STEP AD HANDOFF PACKAGE

## 13.0 STEP AD Definition

**STEP AD** = **Backend Engineering Blueprint**

This handoff package provides everything needed for the engineering team executing STEP AD to begin immediately without additional architecture work.

---

## 13.1 Edge Functions Architecture

**Platform**: Supabase Edge Functions (Deno runtime)

**Deployed Edge Functions**:

| Function | Route | Purpose | Trigger |
|:---------|:------|:--------|:--------|
| `auth-hook` | Internal | Custom JWT claim injection on login | Supabase Auth hook |
| `stripe-webhook` | `/webhooks/stripe` | Stripe payment event processing | Stripe push |
| `outbox-relay` | Internal | Polling outbox → Kafka publication | Cron every 100ms |
| `embed-listing` | Internal | Listing embedding on creation/update | `listing.created` event |
| `score-lead` | Internal | AI lead scoring on submission | `lead.created` event |
| `moderation-scan` | Internal | AI content pre-screening | `listing.created` event |
| `generate-insights` | `/insights/generate` | Tenant AI insights generation | On-demand |
| `update-trust-score` | Internal | Trust score recomputation | Trust-relevant events |
| `send-notification` | Internal | Notification delivery dispatch | `notification.queued` event |
| `search-reindex` | Internal | Search candidate refresh | `listing.published` event |

**Edge Function Standards**:
```typescript
// All edge functions follow this structure:
import { createClient } from '@supabase/supabase-js'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req: Request) => {
  // 1. CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  // 2. Authenticate (for user-facing functions)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
  )
  
  // 3. Extract and validate tenant context
  // 4. Execute business logic
  // 5. Return response with proper headers
  // 6. Log trace span
})
```

---

## 13.2 Storage Architecture

**Storage Bucket Configuration** (Supabase Storage):

```sql
-- listing-media: Public read, authenticated write
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-media', 'listing-media', true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'application/pdf']
);

-- Storage RLS: Only tenant members can upload to their tenant's paths
CREATE POLICY "tenant_upload_policy" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'listing-media'
  AND (storage.foldername(name))[1] = auth.jwt() ->> 'tenant_id'
);
```

**CDN Configuration**:
- All public bucket objects served via CDN
- Cache-Control: `public, max-age=31536000, immutable` (content-addressed filenames)
- Image transformations: Supabase Storage image transform API for WebP conversion + responsive sizes
- Sizes: `?width=320&quality=80`, `?width=640&quality=80`, `?width=1280&quality=80`

---

## 13.3 Queue Architecture

**Event Queuing Stack**: PostgreSQL Outbox → Kafka → Consumer Groups

**Kafka Topic Architecture**:

| Topic | Partitions | Replication | Retention | Consumer Groups |
|:------|:----------|:-----------|:---------|:----------------|
| `marketplace.listings` | 12 | 3 | 7 days | search-service, ai-service, analytics |
| `marketplace.leads` | 6 | 3 | 7 days | notification, crm, analytics |
| `identity.auth` | 6 | 3 | 30 days | analytics, trust, audit |
| `ai.inference` | 12 | 3 | 7 days | billing, analytics, quota |
| `billing.events` | 6 | 3 | 90 days | notification, audit, analytics |
| `moderation.events` | 6 | 3 | 30 days | listing, notification, trust |
| `trust.events` | 6 | 3 | 30 days | company, search, admin, notification |
| `analytics.clickstream` | 24 | 3 | 3 days | clickhouse-ingest |
| `interactions.raw` | 24 | 3 | 3 days | personalization, search, analytics |
| `notifications.queue` | 6 | 3 | 1 day | notification-dispatcher |

**Dead Letter Queue (DLQ)**:
- Every consumer group has a corresponding `*.dlq` topic
- Messages moved to DLQ after 3 failed processing attempts
- DLQ monitor: Alert if DLQ size > 100 messages; manual investigation required

---

## 13.4 Background Jobs

**Background Job Architecture**: pg-boss (PostgreSQL-backed job queue) for jobs requiring exactly-once semantics

| Job Name | Schedule/Trigger | Purpose | Max Duration |
|:---------|:----------------|:--------|:------------|
| `embed-pending-listings` | Every 5 min | Re-attempt failed embeddings | 10 min |
| `refresh-search-candidates` | On `listing.published` | Update search candidate index | 2 min |
| `reconcile-billing-usage` | Every 15 min | Reconcile usage meter vs ledger | 5 min |
| `process-import-jobs` | Continuous | Process bulk listing imports | 5 min per batch |
| `cleanup-expired-media` | Daily 03:00 UTC | Remove orphaned/expired media | 30 min |
| `cleanup-old-sessions` | Daily 02:00 UTC | Purge expired auth sessions | 5 min |
| `retry-failed-notifications` | Every 10 min | Retry failed notification deliveries | 5 min |

---

## 13.5 Cron Jobs

| Cron Job | Expression | Purpose | Alert on Failure |
|:---------|:-----------|:--------|:----------------|
| `slow-loop-personalization` | `0 2 * * *` | Daily preference vector batch update | P1 |
| `trending-hourly` | `0 * * * *` | Hourly trending listings refresh | P2 |
| `trending-daily` | `0 3 * * *` | Daily trending snapshot generation | P2 |
| `recommendation-snapshots` | `0 */4 * * *` | Refresh user recommendation snapshots | P2 |
| `analytics-kpi-daily` | `0 4 * * *` | Generate daily KPI snapshots | P2 |
| `analytics-kpi-weekly` | `0 5 * * 1` | Generate weekly KPI snapshots | P2 |
| `item-similarity-weekly` | `0 6 * * 0` | Recompute item-to-item similarity | P2 |
| `risk-scoring-sweep` | `0 */6 * * *` | Risk score refresh for active entities | P2 |
| `billing-period-reset` | `0 0 1 * *` | Reset quota meters at billing period start | P1 |
| `session-cleanup` | `0 2 * * *` | Purge expired sessions from auth tables | P3 |
| `audit-log-archive` | `0 1 * * *` | Archive audit logs older than 90 days | P3 |
| `search-index-rebuild` | `0 0 * * 0` | Full HNSW index rebuild on vector tables | P2 |
| `generate-tenant-insights` | `0 6 * * 1` | Weekly AI insights for all active tenants | P3 |

---

## 13.6 Search Infrastructure

**Vector Search Stack**: PostgreSQL + pgvector

**HNSW Index Configuration**:
```sql
-- Primary listing search index
CREATE INDEX CONCURRENTLY idx_listings_embedding_hnsw
ON search_index.search_candidates
USING hnsw (embedding_vector vector_cosine_ops)
WITH (m = 16, ef_construction = 200);

-- Query-time parameter (set per connection for precision tuning)
SET hnsw.ef_search = 100;  -- Balance: precision vs speed
-- ef_search = 100: ~95% recall, ~12ms P99 for 1M listings
-- ef_search = 200: ~99% recall, ~20ms P99 for 1M listings (use for high-stakes searches)

-- Maintenance: VACUUM ANALYZE after bulk updates
-- Index rebuild: Weekly CONCURRENTLY rebuild to prevent fragmentation
```

**Search Scaling Thresholds**:
| Listing Count | Strategy |
|:-------------|:---------|
| <1M listings | pgvector (HNSW) sufficient |
| 1M–10M listings | pgvector with partitioning by category |
| >10M listings | Extract to dedicated Milvus/Pinecone cluster |

**Full-Text Search Fallback** (when vector search unavailable):
```sql
-- tsvector on title + description (indexed)
ALTER TABLE search_index.search_candidates 
ADD COLUMN search_tsv tsvector GENERATED ALWAYS AS (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description_excerpt, ''))
) STORED;

CREATE INDEX idx_search_tsv ON search_index.search_candidates USING GIN(search_tsv);
```

---

## 13.7 AI Infrastructure

**AI Infrastructure Components**:

### Component 1: AI Gateway (Edge Function / Next.js API Route)
```
Responsibility: Single entry point for all AI calls
Implementation: Next.js API route with middleware chain
Middleware chain:
  1. Token Guard (leaky bucket check)
  2. Semantic Cache (Redis lookup)
  3. Content Safety Filter (pre-screen prompt)
  4. Provider Router (OpenAI primary / Anthropic fallback)
  5. Response Cache Write
  6. Usage Meter Event Emit
```

### Component 2: Token Guard
```
Implementation: Redis Lua script (atomic)
Algorithm: Leaky bucket per tenant
State key: tenant:{tenant_id}:token_bucket
Fields: {tokens_available, last_refill_timestamp}
Refill rate: plan_monthly_limit / (30 × 24 × 3600) tokens/second
```

### Component 3: Semantic Cache
```
Implementation: Redis sorted set + PostgreSQL fallback
Cache key: SHA-256(model + normalized_prompt)
Lookup: Redis GET → if miss → pgvector similarity search (distance < 0.04)
TTL: 7 days
Eviction: LRU on Redis; TTL-based on PostgreSQL
```

### Component 4: Embedding Worker
```
Implementation: Kafka consumer group (2 workers: HIGH priority, LOW priority)
HIGH queue: Search queries (inline, <500ms)
LOW queue: Listings, profiles, messages (async, batch)
Batching: 100 texts per OpenAI API call (cost optimization)
```

---

## 13.8 Deployment Topology

**Target Deployment Architecture**:

```
                    ┌─────────────────────────────────┐
                    │         Cloudflare CDN           │
                    │    (Static assets, ISR pages)    │
                    └─────────────┬───────────────────┘
                                  │
                    ┌─────────────▼───────────────────┐
                    │         Vercel Edge              │
                    │   (Next.js App Router SSR/ISR)   │
                    │   marketplace / dashboard / admin│
                    └─────────────┬───────────────────┘
                                  │
           ┌──────────────────────┼──────────────────────┐
           │                      │                      │
 ┌─────────▼────────┐   ┌────────▼─────────┐   ┌───────▼──────────┐
 │  Supabase        │   │  Kafka           │   │  ClickHouse      │
 │  (PostgreSQL +   │   │  (Event Mesh)    │   │  Cloud           │
 │   Auth +         │   │  managed or      │   │  (Analytics OLAP)│
 │   Realtime +     │   │  self-hosted     │   │                  │
 │   Storage +      │   │  on Fly.io)      │   │                  │
 │   Edge Functions)│   └──────────────────┘   └──────────────────┘
 └──────────────────┘
           │
 ┌─────────▼────────┐
 │  Upstash Redis   │
 │  (Global edge    │
 │   cache cluster) │
 └──────────────────┘
```

**Environment Strategy**:
| Environment | Purpose | Data |
|:-----------|:--------|:-----|
| `development` | Local dev | Synthetic data; mocked AI |
| `staging` | Integration testing | Anonymized prod snapshot; real AI (limited) |
| `production` | Live | Real data; full AI |

**Scaling Strategy by Component**:
| Component | Initial | Scale Trigger | Scale Action |
|:----------|:--------|:-------------|:------------|
| Next.js (Vercel) | Auto | Traffic | Auto (Vercel) |
| Supabase Postgres | 8 vCPU | >80% CPU for 15min | Upgrade instance size |
| pgvector index | Co-located | >1M listings | Extract to dedicated read replica |
| Supabase Realtime | 4 nodes | >8K connections | Add Realtime nodes |
| Kafka | 3 brokers | Consumer lag >50K | Scale consumer groups |
| ClickHouse | 4 vCPU | Query latency >500ms | Upgrade cluster |
| Redis | Upstash Pro | >100K ops/sec | Upstash Enterprise |

---

## 13.9 CI/CD Architecture

**Pipeline Architecture** (GitHub Actions):

```yaml
# Trigger: PR → staging → production (gitflow)

Pipeline Stages:
  1. Code Quality (parallel):
     - Linting (ESLint, Biome)
     - Type checking (tsc --noEmit)
     - Secret scanning (Gitleaks)
     - Dependency audit (npm audit)
     
  2. Testing (parallel):
     - Unit tests (Vitest)
     - Integration tests (Vitest + test database)
     - Component tests (React Testing Library)
     
  3. Security Scan:
     - SAST (Semgrep)
     - Container scan (Trivy) [if Docker]
     - RLS policy audit (custom script)
     
  4. Build:
     - Next.js build (all 3 apps)
     - Type generation (Supabase types)
     - Bundle size analysis (warn if >budget)
     
  5. Deploy to Staging:
     - Supabase DB migrations (supabase db push)
     - Vercel preview deployment
     - Edge function deployment
     
  6. E2E Tests (Playwright):
     - Auth flows
     - Listing lifecycle
     - Search
     - Billing (Stripe test mode)
     
  7. Deploy to Production (manual approval):
     - Blue-green deployment (Vercel)
     - Database migration (zero-downtime)
     - Edge function update
     - Cache purge
     - Smoke tests
```

**Zero-Downtime Migration Strategy**:
1. Add new column (nullable, no default) → deploy new code that reads it
2. Backfill column data in batches (1000 rows/batch, with sleep)
3. Add constraint/index CONCURRENTLY
4. Deploy code that writes to new column
5. Drop old column (after confirming no reads)

---

## 13.10 Production Checklist

### Pre-Launch (Technical)
- [ ] All database migrations applied and verified on production schema
- [ ] RLS policies tested with cross-tenant injection attempts
- [ ] All secrets rotated from staging values to production values
- [ ] Stripe webhook endpoint verified (test mode → live mode key rotation)
- [ ] Sending domain DKIM/DMARC/SPF records configured
- [ ] SSL certificates valid for all domains (marketplace, app, admin)
- [ ] CDN cache rules configured; ISR cache warm
- [ ] Kafka broker cluster health verified (all partitions in-sync)
- [ ] ClickHouse cluster health verified; test event pipeline end-to-end
- [ ] pgvector HNSW index verified; test query latency meets P99 target
- [ ] Redis cache warm for high-traffic keys
- [ ] All cron jobs registered and tested (dry-run)
- [ ] OpenTelemetry traces flowing to production backend
- [ ] All alert rules active in PagerDuty
- [ ] Error budget baselines established
- [ ] Load test: 10× expected peak traffic without degradation
- [ ] Penetration test: OWASP Top 10 verified

### Pre-Launch (Operational)
- [ ] On-call rotation configured (24/7 P0/P1 coverage)
- [ ] Runbooks documented for P0/P1 scenarios
- [ ] Incident response playbook tested (table-top exercise)
- [ ] Backup restoration tested (recover from yesterday's backup within SLA)
- [ ] Rollback procedure documented and tested
- [ ] Status page configured (status.platform.io)
- [ ] Support email and chat configured

### Pre-Launch (Legal/Compliance)
- [ ] Privacy Policy published (GDPR-compliant)
- [ ] Terms of Service published
- [ ] Cookie consent banner deployed
- [ ] GDPR data deletion capability tested (delete user → 90-day hard delete)
- [ ] Data Processing Agreement (DPA) available for enterprise customers
- [ ] SOC 2 Type 1 audit initiated (if enterprise target)

---

## 13.11 STEP AD Specific Handoffs

### For Edge Functions Engineering
- All 10 edge functions defined in §13.1 with inputs/outputs/triggers
- Shared utilities location: `supabase/functions/_shared/`
- Environment variables: All loaded from Vault via `SUPABASE_DB_URL`, `OPENAI_API_KEY`, etc.
- Testing: Each function has corresponding integration test in `supabase/functions/tests/`

### For Storage Engineering
- All bucket policies defined in §13.2
- Image optimization spec: WebP, 3 sizes (320/640/1280w), quality 80
- Path convention: `{bucket}/{tenant_id}/{entity_type}/{entity_id}/{uuid}.{ext}`
- CDN invalidation: Content-addressed filenames (immutable cache-control)

### For Queue Engineering
- Kafka topic definitions in §13.3 with partitions/replication/retention
- Outbox relay implementation spec in §4.0.3
- DLQ monitoring: Alert at 100+ messages
- Consumer group naming: `{service-name}-consumer-{topic-name}`

### For Search Infrastructure Engineering
- pgvector HNSW index config in §13.6 (`m=16, ef_construction=200, ef_search=100`)
- Full-text fallback config in §13.6
- Scale thresholds: <1M (pgvector), 1M-10M (partitioned), >10M (extract)
- Index rebuild: Weekly CONCURRENTLY (Sunday 00:00 UTC)

### For AI Infrastructure Engineering
- 4 AI components detailed in §13.7
- Token Guard algorithm: Leaky bucket in Redis Lua
- Semantic cache threshold: cosine distance <0.04 (similarity ≥0.96)
- Embedding batching: 100 texts per API call
- Priority queues: HIGH (search queries, <500ms) / LOW (listings, async)

### For Deployment Engineering
- Full deployment topology diagram in §13.8
- Zero-downtime migration strategy: 5-step column evolution pattern
- Environment strategy: dev / staging / production
- Scaling triggers and actions in §13.8 table

### For CI/CD Engineering
- 7-stage pipeline definition in §13.9
- Mandatory: Secret scanning (Gitleaks), SAST (Semgrep), RLS audit
- E2E test scenarios: Auth flows, listing lifecycle, search, billing
- Deployment: Blue-green via Vercel; manual approval gate before production

---

## ENGINEERING CONSTITUTION — SEAL

```
╔══════════════════════════════════════════════════════════════════╗
║                                                                  ║
║         STEP AC ENGINEERING CONSTITUTION — COMPLETE             ║
║                                                                  ║
║  Document Status: SEALED — APPROVED FOR ENGINEERING EXECUTION    ║
║                                                                  ║
║  Total Sections: 13                                              ║
║  Total API Endpoints Specified: 60+                              ║
║  Total Events Defined: 50+                                       ║
║  Total Services Contracted: 24                                   ║
║  Total Work Packages: 30 (Backend 15 + Frontend 8 + Infra 7)    ║
║  Total Risk Items: 14                                            ║
║                                                                  ║
║  This document, together with Parts 1 and 2, constitutes the    ║
║  complete Engineering Constitution for the AI-Native            ║
║  Multi-Tenant Marketplace Operating System.                      ║
║                                                                  ║
║  STEP AD — BACKEND ENGINEERING BLUEPRINT can begin immediately.  ║
║                                                                  ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Document Index (All Parts)

| Part | File | Sections | Content |
|:-----|:-----|:---------|:--------|
| Part 1 | [23-STEP-AC-engineering-constitution.md](file:///home/mohal665544/pr1/docs/specs/23-STEP-AC-engineering-constitution.md) | §1–4 | Module Map · API Contracts · Service Contracts · Event Architecture |
| Part 2 | [24-STEP-AC-part2-realtime-ai-frontend-authz.md](file:///home/mohal665544/pr1/docs/specs/24-STEP-AC-part2-realtime-ai-frontend-authz.md) | §5–8 | Realtime · AI · Frontend · Authorization Contracts |
| Part 3 | [25-STEP-AC-part3-integrations-readiness-handoff.md](file:///home/mohal665544/pr1/docs/specs/25-STEP-AC-part3-integrations-readiness-handoff.md) | §9–13 | Integrations · Observability · Backend/Frontend Readiness · STEP AD Handoff |
