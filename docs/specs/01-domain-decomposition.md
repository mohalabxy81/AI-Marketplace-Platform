# SPEC 01 — DOMAIN DECOMPOSITION SPECIFICATION

> **Basis**: [PLANNER.md §2-3](file:///home/mohal665544/pr1/PLANNER.md) — Master Platform Architecture & Domain Ownership  
> **Status**: Execution-Ready

---

## 1. Domain Classification

The platform decomposes into **8 domain tiers** containing **19 bounded contexts**. Each domain operates under strict ownership, boundary, and extraction rules as defined in the Platform Constitution.

---

## 2. Core Domains

Core domains represent the platform's primary competitive advantage. They contain the most complex business logic and are the last to be extracted.

### 2.1 Discovery Domain

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | Match demand (queries, intents, user preference vectors) with supply (agents, tools, datasets, listings) through vector similarity retrieval and relational filtering |
| **Responsibilities** | Candidate generation, vector cosine retrieval, light ranking (ad bids + trust adjustments), heavy neural re-ranking, exploration/exploitation balancing, feed assembly, search query interpretation, faceted filtering |
| **Ownership** | `search_index` schema. Owns all search index tables, candidate caches, ranking models, feed assembly logic |
| **Boundaries** | Reads listing metadata via event subscription (`marketplace.listing_created`). Reads tenant tier via cached Tenant API response. Never queries `billing_ledger`, `auth`, or `trust_registry` directly |
| **Dependencies** | Tenant Domain (tier/quota context), AI Infrastructure Domain (neural re-ranking inference), Marketplace Domain (listing data via events), Trust Domain (trust scores via events) |
| **Public Contracts** | `POST /api/v1/feed` — personalized feed generation; `GET /api/v1/search` — keyword + vector hybrid search; `GET /api/v1/search/suggestions` — typeahead suggestions |
| **Internal Contracts** | `gRPC DiscoveryService.RankCandidates` — internal re-ranking invocation; `gRPC DiscoveryService.GetCandidatePool` — retrieve candidate set for a query |
| **Events Published** | `discovery.feed_generated`, `discovery.ranking_completed`, `discovery.search_executed`, `discovery.item_clicked`, `discovery.item_impressed` |
| **Events Consumed** | `marketplace.listing_created`, `marketplace.listing_updated`, `marketplace.listing_deleted`, `ai.embedding_generated`, `trust.trust_score_updated`, `intelligence.personalization_updated` |
| **Extraction Readiness** | HIGH — Fully decoupled search service (Kotlin/gRPC). Trigger: vector search queries consume >40% of core PostgreSQL CPU/IOPS |

### 2.2 Marketplace Intelligence Domain

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | Manage vector preference matrices and user interest representations. Maintain the Dual-Loop Adaptive Learning Architecture (Fast Loop: online sub-second; Slow Loop: offline batch) |
| **Responsibilities** | Real-time user affinity vector updates, preference vector computation (exponential moving average with α=0.85), collaborative filtering weight calibration, HNSW index rebuilds, user segment clustering |
| **Ownership** | Vector database partitions (pgvector/Pinecone). Owns `user_preference_vectors`, `item_embeddings`, `collaborative_weights`, `segment_clusters` |
| **Boundaries** | Consumes clickstream from Analytics Domain via Kafka. Never writes to `billing_ledger` or `auth`. Produces scoring signals consumed by Discovery Domain |
| **Dependencies** | Analytics Domain (clickstream events), AI Infrastructure Domain (embedding generation), Core Infrastructure (Redis for session-level vector caching) |
| **Public Contracts** | `GET /api/v1/intelligence/user-profile/{user_id}` — current preference vector; `GET /api/v1/intelligence/similar-users/{user_id}` — collaborative similarity |
| **Internal Contracts** | `gRPC IntelligenceService.GetUserVector` — retrieve cached preference vector; `gRPC IntelligenceService.UpdatePreference` — update preference from interaction event |
| **Events Published** | `intelligence.personalization_updated`, `intelligence.segment_recalculated`, `intelligence.index_rebuilt` |
| **Events Consumed** | `discovery.item_clicked`, `discovery.item_impressed`, `analytics.clickstream_batch_processed` |
| **Extraction Readiness** | HIGH — Separate vector indexing workers processing Kafka events. Trigger: write amplification during user sessions exceeds DB IOPS budget |

---

## 3. Supporting Domains

Supporting domains provide essential operational capabilities but do not represent the platform's core competitive differentiator.

### 3.1 Identity Domain

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | Authentication, authorization, JWT signing, edge claims injection, session lifecycle management |
| **Responsibilities** | Issue JWTs with custom tenant claims (`tenant_id`, `role`, `tier`, `scopes`), JWKS endpoint management, OAuth2/OIDC provider integration, magic link authentication, SSO federation, session revocation, MFA enforcement |
| **Ownership** | `auth` schema. Owns `users`, `sessions`, `auth_providers`, `mfa_enrollments`, `api_keys` |
| **Boundaries** | Read-only distribution of public JWKS keys. Zero consumption of events from other domains. All other domains depend on Identity but Identity depends on nothing |
| **Dependencies** | None (leaf dependency) |
| **Public Contracts** | `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/refresh`, `GET /.well-known/jwks.json`, `POST /api/v1/auth/logout` |
| **Internal Contracts** | JWKS URL for signature verification; `x-tenant-id` and `x-user-role` header injection at Edge |
| **Events Published** | `identity.session_started`, `identity.session_ended`, `identity.user_registered`, `identity.mfa_enrolled` |
| **Events Consumed** | None |
| **Extraction Readiness** | HIGH — Can be extracted to dedicated Go/OAuth2 microservice on isolated Kubernetes pods |

### 3.2 Tenant Domain

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | Workspace lifecycle management, dynamic domain routing, plan enforcement, feature flag distribution |
| **Responsibilities** | Organization provisioning, workspace allocation, custom domain mapping, schema provisioning, plan limit enforcement, tenant suspension/activation, tenant impersonation for Super Admin |
| **Ownership** | `tenant_config` schema. Owns `organizations`, `tenants`, `workspaces`, `tenant_plans`, `feature_flags`, `custom_domains` |
| **Boundaries** | Meta-data database containing plan limits and provisioning statuses. Never accesses `billing_ledger` directly — receives billing state via events |
| **Dependencies** | Identity Domain (user authentication context) |
| **Public Contracts** | `POST /api/v1/tenants` — create tenant; `GET /api/v1/tenants/{id}` — tenant details; `PATCH /api/v1/tenants/{id}/plan` — upgrade plan; `GET /api/v1/tenants/{id}/features` — feature flags |
| **Internal Contracts** | `gRPC TenantService.ResolveTenant` — resolve tenant context from domain/header; `gRPC TenantService.GetPlanLimits` — retrieve tenant's current plan limits |
| **Events Published** | `tenant.provisioned`, `tenant.plan_upgraded`, `tenant.suspended`, `tenant.feature_flag_updated`, `tenant.workspace_created` |
| **Events Consumed** | `monetization.subscription_changed`, `trust.trust_score_updated` |
| **Extraction Readiness** | LOW — Remains within Core control plane. Tightly coupled to provisioning workflows |

### 3.3 Monetization Domain

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | Revenue capture, usage ledger management, subscription lifecycle, ad auction execution, billing synchronization |
| **Responsibilities** | Real-time token metering, promoted listing CPC/CPM auction (generalized second-price), Stripe webhook processing, invoice generation, credit management, quota enforcement, revenue attribution |
| **Ownership** | `billing_ledger` schema. Owns `subscriptions`, `invoices`, `ledger_entries`, `credit_balances`, `ad_campaigns`, `ad_bids`, `usage_meters` |
| **Boundaries** | High-security, write-only transactional outboxes. Intercepts usage events on mesh to calculate billing increments. Never reads from `search_index` or `trust_registry` directly |
| **Dependencies** | Tenant Domain (plan context), AI Infrastructure Domain (inference usage events), Identity Domain (billing actor verification) |
| **Public Contracts** | `POST /api/v1/billing/topup` — credit top-up; `GET /api/v1/billing/invoices` — invoice history; `GET /api/v1/billing/usage` — current usage; `POST /api/v1/billing/subscribe` — plan subscription; `POST /api/v1/ads/campaigns` — create ad campaign |
| **Internal Contracts** | `gRPC BillingService.CheckQuota` — pre-flight quota check; `gRPC BillingService.RecordUsage` — record usage meter increment |
| **Events Published** | `monetization.quota_exceeded`, `monetization.event_recorded`, `monetization.subscription_changed`, `monetization.invoice_generated`, `monetization.payment_received`, `monetization.ad_auction_completed` |
| **Events Consumed** | `ai.inference_completed`, `discovery.feed_generated`, `discovery.item_clicked`, `tenant.plan_upgraded` |
| **Extraction Readiness** | HIGH — Isolated microservice with dedicated ledger database. Trigger: ledger write speed bottleneck under high usage event volume |

### 3.4 Trust & Safety Domain

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | Listing compliance enforcement, content moderation, fraud detection, behavioral anomaly analysis, reputation management |
| **Responsibilities** | Pre-publish LLM content scanning, toxicity vector scoring, prompt injection detection, behavioral anomaly monitoring, trust score computation, quarantine management, escalation workflow orchestration, human review queue management |
| **Ownership** | `trust_registry` schema. Owns `trust_scores`, `moderation_queue`, `fraud_signals`, `policy_rules`, `quarantined_items`, `escalation_records`, `reviewer_assignments` |
| **Boundaries** | Isolates flagged assets instantly. Runs asynchronously on listing submission and message transfers. Never reads `billing_ledger` or `search_index` directly |
| **Dependencies** | AI Infrastructure Domain (LLM-based content evaluation), Marketplace Domain (listing content for scanning) |
| **Public Contracts** | `POST /api/v1/moderation/verify` — manual moderation trigger; `GET /api/v1/moderation/queue` — review queue for Super Admin; `PATCH /api/v1/moderation/{id}/resolve` — resolve moderation item |
| **Internal Contracts** | `gRPC TrustService.GetTrustScore` — tenant/user trust score lookup; `gRPC TrustService.SubmitForReview` — queue content for moderation |
| **Events Published** | `trust.fraud_detected`, `trust.trust_score_updated`, `trust.content_quarantined`, `trust.content_approved`, `trust.escalation_created` |
| **Events Consumed** | `marketplace.listing_created`, `marketplace.listing_updated`, `identity.user_registered`, `discovery.item_clicked` (anomaly detection) |
| **Extraction Readiness** | HIGH — Completely isolated background moderation workers. Trigger: LLM moderation costs require dedicated GPU/instance pools |

---

## 4. Shared Domains

Shared domains provide cross-cutting capabilities consumed by multiple other domains.

### 4.1 Core Infrastructure Domain

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | Core storage engine, persistent data management, session caching, binary asset storage |
| **Responsibilities** | PostgreSQL connection pooling, Redis cache tier management, S3 object storage orchestration, database health monitoring, connection limit management, disk IOPS management |
| **Ownership** | System database, cache partitions, object storage buckets |
| **Boundaries** | Foundation upon which all services run. Distinct disk arrays, VPC network peering |
| **Dependencies** | None (physical infrastructure layer) |
| **Public Contracts** | Connection strings, cache endpoints, S3 bucket policies (consumed by all domains) |
| **Internal Contracts** | Health check endpoints, connection pool metrics |
| **Events Published** | `infrastructure.health_degraded`, `infrastructure.connection_pool_exhausted` |
| **Events Consumed** | None |
| **Extraction Readiness** | N/A — Managed cloud infrastructure (RDS Aurora, Redis Cluster, S3) |

### 4.2 Realtime Infrastructure Domain

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | WebSocket connection hub for live data delivery. Broadcasts re-ranked feeds, moderation updates, and message logs |
| **Responsibilities** | WebSocket connection management, PostgreSQL WAL stream listening, channel subscription management, tenant-scoped room management, backpressure handling, connection pooling isolation |
| **Ownership** | Connection tables, Supabase Realtime configurations, channel topology |
| **Boundaries** | Socket channels scoped by authenticated tenant ID tokens. Independent connection pools isolated from core PostgreSQL API threads |
| **Dependencies** | Identity Domain (JWT validation for socket connections), Tenant Domain (room scoping) |
| **Public Contracts** | `wss://realtime.platform.internal/socket/websocket` — WebSocket gateway; Channel subscriptions: `tenant_feed:<tenant_id>`, `tenant_moderation:<tenant_id>`, `platform:global` |
| **Internal Contracts** | `gRPC RealtimeService.Broadcast` — push event to tenant channel; `gRPC RealtimeService.GetConnectionCount` — active connection metrics |
| **Events Published** | `realtime.connection_opened`, `realtime.connection_closed`, `realtime.backpressure_triggered` |
| **Events Consumed** | `discovery.ranking_completed`, `trust.fraud_detected`, `trust.content_approved`, `monetization.quota_exceeded` |
| **Extraction Readiness** | MEDIUM — Dedicated Supabase/Elixir socket servers. Trigger: >10,000 concurrent WebSocket connections |

---

## 5. AI Domains

### 5.1 AI Infrastructure Domain

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | Unified gateway to all LLM and generation pipelines. Manages inference scheduling, token budgeting, and model selection |
| **Responsibilities** | LLM provider routing (OpenAI, Anthropic, local models), Token Guard enforcement (leaky-bucket per tenant), semantic response caching (cosine ≥ 0.96), prompt management, model version tracking, priority queue scheduling (High: 200ms target, Low: batch), provider fallback chains |
| **Ownership** | `ai_cache` schema. Owns `model_registry`, `prompt_registry`, `inference_cache`, `token_usage_log`, `ai_policies`, `ai_experiments` |
| **Boundaries** | Dedicated execution threads and memory allocations per tenant tier. Isolated from billing ledger writes (publishes usage events instead) |
| **Dependencies** | Monetization Domain (quota budget validation via events), Tenant Domain (tier limits) |
| **Public Contracts** | `POST /api/v1/ai/completions` — unified inference endpoint; `POST /api/v1/ai/embeddings` — embedding generation; `GET /api/v1/ai/models` — available models |
| **Internal Contracts** | `gRPC AIGateway.Infer` — internal inference call with priority; `gRPC AIGateway.Embed` — internal embedding generation; `gRPC AIGateway.CheckBudget` — pre-flight budget check |
| **Events Published** | `ai.inference_completed`, `ai.embedding_generated`, `ai.cache_hit`, `ai.provider_fallback`, `ai.budget_warning` |
| **Events Consumed** | `monetization.quota_exceeded` (to block further inference), `tenant.plan_upgraded` (to adjust limits) |
| **Extraction Readiness** | HIGH — Extract to standalone Rust/Axum service with token-bucket rate limits and async gRPC. Trigger: LLM prompt concurrency causes DB connection starvation |

### 5.2 Embedding & Vector Domain

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | Manage embedding lifecycle, vector storage, retrieval indexing, and tenant-isolated vector spaces |
| **Responsibilities** | Embedding generation orchestration, vector index management (HNSW), embedding versioning, embedding invalidation, tenant-filtered vector queries, hybrid retrieval (vector + relational), embedding refresh scheduling |
| **Ownership** | `vector_store` schema. Owns `embeddings`, `vector_indexes`, `embedding_versions`, `embedding_refresh_jobs` |
| **Boundaries** | Shared physical pgvector instances with metadata filtering by `tenant_id`. Write operations isolated from read-serving indexes |
| **Dependencies** | AI Infrastructure Domain (embedding model inference), Marketplace Domain (listing content for embedding), Core Infrastructure Domain (pgvector extension) |
| **Public Contracts** | `POST /api/v1/vectors/search` — vector similarity search; `GET /api/v1/vectors/{id}` — retrieve embedding |
| **Internal Contracts** | `gRPC VectorService.SimilaritySearch` — tenant-scoped vector retrieval; `gRPC VectorService.UpsertEmbedding` — store/update embedding |
| **Events Published** | `vector.embedding_stored`, `vector.index_rebuilt`, `vector.embedding_invalidated` |
| **Events Consumed** | `ai.embedding_generated`, `marketplace.listing_updated`, `marketplace.listing_deleted` |
| **Extraction Readiness** | HIGH — Move to dedicated vector index cluster (Milvus/Pinecone) with Kafka async sync. Trigger: vector index builds consume >40% CPU |

---

## 6. Marketplace Domains

### 6.1 Marketplace Core Domain

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | Manage the supply side of the marketplace: listings, agents, tools, datasets, companies, and projects |
| **Responsibilities** | Listing lifecycle management (draft → pending_review → active → archived → deleted), category taxonomy, attribute management, media asset management, listing versioning, agent/tool/dataset registration, company profiles, project management |
| **Ownership** | `marketplace` schema. Owns `listings`, `categories`, `attributes`, `listing_media`, `agents`, `companies`, `projects`, `developers`, `listing_versions`, `listing_statuses` |
| **Boundaries** | Never queries discovery indexes or billing ledgers directly. Publishes listing events for downstream consumers. Receives trust scores via events for display purposes only |
| **Dependencies** | Identity Domain (actor verification), Tenant Domain (workspace scoping), Trust & Safety Domain (moderation gate before activation) |
| **Public Contracts** | `POST /api/v1/listings` — create listing; `GET /api/v1/listings/{id}` — listing detail; `PATCH /api/v1/listings/{id}` — update; `DELETE /api/v1/listings/{id}` — soft delete; `GET /api/v1/categories` — category tree; `POST /api/v1/agents` — register AI agent |
| **Internal Contracts** | `gRPC MarketplaceService.GetListingContent` — retrieve listing content for embedding; `gRPC MarketplaceService.UpdateStatus` — moderation status transition |
| **Events Published** | `marketplace.listing_created`, `marketplace.listing_updated`, `marketplace.listing_deleted`, `marketplace.listing_status_changed`, `marketplace.agent_registered`, `marketplace.category_updated` |
| **Events Consumed** | `trust.content_approved`, `trust.content_quarantined`, `ai.embedding_generated` (to update embedding status on listing) |
| **Extraction Readiness** | MEDIUM — Core catalog data, tightly coupled to tenant context |

---

## 7. Growth Domains

### 7.1 Experimentation Domain

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | A/B testing, experimentation logic, and multi-armed bandit optimization |
| **Responsibilities** | Experiment definition, user cohort assignment, variant configuration distribution, multi-armed bandit model updates, experiment lifecycle management, statistical significance calculation |
| **Ownership** | `experimentation` schema. Owns `experiments`, `experiment_variants`, `user_assignments`, `experiment_results` |
| **Boundaries** | Scoped within tenant workspaces. Intercepts feed requests to assign variant configs at the Gateway level. Read-only consumption of outcome events |
| **Dependencies** | Discovery Domain (feed serving integration), Analytics Domain (outcome measurement) |
| **Public Contracts** | `POST /api/v1/experiments` — create experiment; `GET /api/v1/experiments/{id}/results` — results dashboard |
| **Internal Contracts** | `gRPC ExperimentService.AssignVariant` — get variant assignment for user; `gRPC ExperimentService.RecordOutcome` — record experiment outcome |
| **Events Published** | `experiment.variant_assigned`, `experiment.concluded`, `experiment.winner_declared` |
| **Events Consumed** | `discovery.feed_generated`, `discovery.item_clicked`, `monetization.payment_received` |
| **Extraction Readiness** | LOW — Library-based implementation at Gateway level initially |

### 7.2 Analytics Domain

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | High-throughput telemetry ingestion, clickstream processing, analytical query serving, KPI computation |
| **Responsibilities** | Clickstream event collection, event aggregation, funnel analysis, cohort computation, retention modeling, LTV calculation, real-time dashboard data serving, attribution modeling |
| **Ownership** | ClickHouse database, Kafka consumer topics. Owns `clickstream_events`, `aggregated_metrics`, `funnel_definitions`, `cohort_snapshots` |
| **Boundaries** | Read-only ingestion from Event Mesh. Separate ClickHouse databases or schema-level partitioning by tenant. Never writes back to PostgreSQL operational databases |
| **Dependencies** | Core Infrastructure Domain (Kafka for event ingestion) |
| **Public Contracts** | `GET /api/v1/analytics/dashboard` — tenant KPI dashboard; `GET /api/v1/analytics/funnels` — funnel analysis; `GET /api/v1/analytics/cohorts` — cohort data |
| **Internal Contracts** | `gRPC AnalyticsService.QueryMetric` — internal metric query; `gRPC AnalyticsService.GetFunnel` — funnel computation |
| **Events Published** | `analytics.clickstream_batch_processed`, `analytics.anomaly_detected` |
| **Events Consumed** | `*` (All domain events — universal consumer) |
| **Extraction Readiness** | HIGH — Standalone ClickHouse/Kafka cluster. Already architecturally isolated |

---

## 8. Trust Domains

### 8.1 Governance Domain

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | Internal control plane for platform operators. Global monitoring, config overrides, schema migrations, audit logging |
| **Responsibilities** | Super Admin dashboard, global tenant overview, system config management, feature flag control, schema migration orchestration, platform-wide announcement broadcasting, audit log management |
| **Ownership** | `governance` schema. Owns `audit_logs`, `system_configs`, `schema_migrations`, `global_announcements`, `admin_actions` |
| **Boundaries** | Strictly accessible to platform operators with `super_admin` role only. Can read from any domain's public contracts for operational oversight |
| **Dependencies** | Identity Domain (Super Admin authentication), All domains (read-only operational data) |
| **Public Contracts** | `GET /api/v1/admin/dashboard` — global KPIs; `GET /api/v1/admin/tenants` — tenant list; `POST /api/v1/admin/tenants/{id}/impersonate` — tenant impersonation; `POST /api/v1/admin/announcements` — broadcast |
| **Internal Contracts** | `gRPC GovernanceService.AuditLog` — write audit entry; `gRPC GovernanceService.GetConfig` — retrieve system config |
| **Events Published** | `governance.config_changed`, `governance.tenant_impersonated`, `governance.maintenance_announced` |
| **Events Consumed** | `trust.fraud_detected`, `monetization.quota_exceeded`, `infrastructure.health_degraded` |
| **Extraction Readiness** | LOW — Admin UI and control plane on separated node groups |

---

## 9. Infrastructure Domains

### 9.1 Observability Domain

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | Distributed tracing, metrics collection, log aggregation, alerting, incident management |
| **Responsibilities** | OpenTelemetry trace collection, Prometheus metrics scraping, Jaeger trace visualization, structured log aggregation, alert rule management, incident lifecycle tracking, SLO monitoring |
| **Ownership** | Observability infrastructure. Owns `alert_rules`, `incident_records`, `slo_definitions` |
| **Boundaries** | Read-only collection from all system components. Never modifies operational state |
| **Dependencies** | All domains (instrumentation integration) |
| **Public Contracts** | `GET /api/v1/admin/metrics` — system metrics dashboard; `GET /api/v1/admin/traces/{id}` — trace detail; `GET /api/v1/admin/incidents` — incident list |
| **Internal Contracts** | OTLP exporter endpoints for trace/metric/log collection |
| **Events Published** | `observability.alert_triggered`, `observability.incident_opened`, `observability.slo_breached` |
| **Events Consumed** | `*` (All domain events for correlation) |
| **Extraction Readiness** | HIGH — Already architecturally decoupled as telemetry infrastructure |

---

## 10. Complete Domain Map

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            PLATFORM DOMAIN MAP                                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─── CORE DOMAINS ──────────────────────────────────────────────────────────┐  │
│  │  Discovery Domain          │  Marketplace Intelligence Domain              │  │
│  └────────────────────────────┴──────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌─── MARKETPLACE DOMAINS ───────────────────────────────────────────────────┐  │
│  │  Marketplace Core Domain                                                   │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌─── AI DOMAINS ────────────────────────────────────────────────────────────┐  │
│  │  AI Infrastructure Domain  │  Embedding & Vector Domain                    │  │
│  └────────────────────────────┴──────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌─── SUPPORTING DOMAINS ────────────────────────────────────────────────────┐  │
│  │  Identity  │  Tenant  │  Monetization  │  Trust & Safety                    │  │
│  └────────────┴──────────┴────────────────┴──────────────────────────────────┘  │
│                                                                                  │
│  ┌─── GROWTH DOMAINS ───────────────────────────────────────────────────────┐  │
│  │  Experimentation Domain    │  Analytics Domain                             │  │
│  └────────────────────────────┴──────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌─── TRUST DOMAINS ────────────────────────────────────────────────────────┐  │
│  │  Governance Domain                                                         │  │
│  └────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                  │
│  ┌─── INFRASTRUCTURE DOMAINS ───────────────────────────────────────────────┐  │
│  │  Core Infrastructure  │  Realtime Infrastructure  │  Observability          │  │
│  └───────────────────────┴───────────────────────────┴────────────────────────┘  │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 11. Domain Dependency Graph

```
                              ┌──────────────────┐
                              │ Core Infrastructure│
                              └────────┬─────────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ▼                  ▼                  ▼
             ┌──────────┐      ┌──────────┐      ┌────────────┐
             │ Identity │      │  Tenant  │      │  Realtime  │
             └────┬─────┘      └────┬─────┘      └──────┬─────┘
                  │                 │                    │
    ┌─────────────┼─────────────────┼────────────────────┤
    ▼             ▼                 ▼                    ▼
┌────────┐  ┌──────────┐   ┌──────────────┐   ┌─────────────┐
│Monetiz.│  │Marketplace│   │AI Infrastruc.│   │Trust & Safety│
└───┬────┘  └─────┬─────┘   └──────┬───────┘   └──────┬──────┘
    │             │                │                   │
    │    ┌────────┼────────────────┼───────────────────┘
    │    ▼        ▼                ▼
    │  ┌────────────────┐  ┌──────────────┐
    │  │ Embed. & Vector│  │  Discovery   │
    │  └────────────────┘  └──────┬───────┘
    │                             │
    ▼                             ▼
┌────────────────┐    ┌────────────────────┐
│  Marketplace   │    │     Analytics      │
│  Intelligence  │    └─────────┬──────────┘
└────────────────┘              │
                                ▼
                    ┌────────────────────┐
                    │  Experimentation   │
                    └────────────────────┘
                                │
                                ▼
                    ┌────────────────────┐
                    │    Governance      │
                    └────────────────────┘
                                │
                                ▼
                    ┌────────────────────┐
                    │   Observability    │
                    └────────────────────┘
```

---

## 12. Domain Communication Rules

| Rule | Specification |
|:-----|:-------------|
| **Direct DB Access Ban** | No domain may connect directly to databases owned by other domains. Cross-domain data is obtained via REST API calls or event subscriptions with local caching |
| **Outbox Isolation** | Local state changes and event generation must be written in the same database transaction using the Outbox pattern. A separate collector polls the Outbox and publishes to Kafka |
| **Anti-Corruption Layer** | External service interfaces (Stripe, OpenAI, etc.) must run behind ACL wrappers within the domain service, shielding internal logic from external API changes |
| **Event Schema Registry** | All events must pass schema validation defined in the Kotlin `EventSchemaRegistry` class before mesh publication |
| **Synchronous Call Budget** | Synchronous cross-domain API calls are permitted only for data reads with <50ms SLA. All writes must go through the Event Mesh |
| **Cache-First Resolution** | When Domain A needs data from Domain B, it should first check its local cache, then subscribe to events, and only as a last resort make a synchronous API call |

---

## 13. Domain Team Ownership Matrix

| Domain | Recommended Team Size | Primary Skills | Secondary Skills |
|:-------|:---------------------|:---------------|:-----------------|
| Discovery | 3-4 engineers | Kotlin, pgvector, ML/ranking | gRPC, Redis |
| Marketplace Intelligence | 2-3 engineers | Python/Kotlin, ML, vector math | Kafka, ClickHouse |
| Identity | 2 engineers | Kotlin, OAuth2, JWT | Security, Cryptography |
| Tenant | 2 engineers | Kotlin, PostgreSQL | DNS, Domain routing |
| Monetization | 3 engineers | Kotlin, Stripe API, Ledger patterns | Kafka, Financial systems |
| Trust & Safety | 2-3 engineers | Kotlin, LLM APIs, Content moderation | ML, Anomaly detection |
| Marketplace Core | 3-4 engineers | Kotlin, PostgreSQL, REST API | Media processing, S3 |
| AI Infrastructure | 3-4 engineers | Rust/Kotlin, LLM APIs, Caching | Token management, gRPC |
| Embedding & Vector | 2-3 engineers | Kotlin, pgvector/Pinecone, HNSW | Index tuning, Batch processing |
| Experimentation | 1-2 engineers | Kotlin, Statistics | A/B testing, Bayesian methods |
| Analytics | 2-3 engineers | ClickHouse, Kafka, SQL | Data engineering, ETL |
| Governance | 2 engineers | Kotlin, Next.js, PostgreSQL | Admin UI, Audit systems |
| Core Infrastructure | 2 engineers | PostgreSQL, Redis, S3, DevOps | Kubernetes, Monitoring |
| Realtime Infrastructure | 1-2 engineers | Supabase, WebSockets, Elixir | Connection pooling, WAL |
| Observability | 1-2 engineers | OpenTelemetry, Prometheus, Grafana | Alerting, Incident mgmt |
