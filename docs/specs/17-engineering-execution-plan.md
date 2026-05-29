# SPEC 17 — ENGINEERING EXECUTION PLAN

> **Basis**: [PLANNER.md](file:///home/mohal665544/pr1/PLANNER.md) — Platform Master Architecture  
> **Status**: Execution-Ready v3 (Maximum Depth)  
> **Version**: 3.0.0  
> **Last Updated**: 2026-05-30  
> **Owned By**: Engineering Leadership

---

## 1. Execution Philosophy

This plan dictates a **Domain-Driven, Vertical-Slice Delivery Model**. The platform is built in complete, end-to-end vertical slices — never in isolated horizontal layers. Each sprint delivers a working capability that can be tested, measured, and validated before the next sprint begins.

### 1.1 Engineering Principles

| Principle | Implementation |
|:----------|:---------------|
| **Fail Fast** | Every sprint ends with a validation gate. If acceptance criteria are not met, the sprint is extended — not the next sprint backloaded. |
| **Correctness Before Performance** | Multi-tenant isolation is proven correct before optimizations. A fast system that leaks data is a critical failure. |
| **Observability-First** | Every new domain activates its OTel instrumentation as part of the sprint — never deferred. |
| **Event-Driven from Day One** | The Transactional Outbox pattern is used for domain events from Sprint 1. Kafka is introduced in Sprint 6. |
| **Security by Default** | RLS policies are written alongside table schemas. No unprotected tables ever exist in staging or production. |

### 1.2 Team Topology

| Team | Focus Domains | Headcount | Key Skills |
|:-----|:--------------|:----------|:-----------|
| **Platform Core** | Identity, Tenant, Event Mesh, Kafka | 4-5 engineers | Go/Kotlin, PostgreSQL, Kafka, DevOps |
| **Marketplace & UI** | Listings, Storefront, Tenant Dashboard | 5-6 engineers | TypeScript, React/Next.js, UI/UX |
| **Intelligence** | Discovery, AI Gateway, Vectors, Embeddings | 4-5 engineers | Python/Go, pgvector, LLM APIs, ML/MLOps |
| **Trust & Ops** | Trust & Safety, Realtime, Observability | 3-4 engineers | Go/Elixir, OpenTelemetry, Security |
| **Finance Platform** | Billing, Monetization, Ads | 2-3 engineers | Kotlin/Go, Stripe API, Accounting logic |

---

## 2. Epic & Initiative Structure

### Epic 1: Platform Kernel (Sprints 0–1)

**Business Value**: Zero. Foundational. Nothing else works without this.  
**Risk**: High if skipped or rushed. Identity bugs in Sprint 1 = unfixable security debt.  
**Complexity**: Medium-High.

#### Initiative 1.1: Infrastructure Scaffolding (Sprint 0 — Weeks 1-2)

| Deliverable | Owner | Acceptance Criteria |
|:------------|:------|:--------------------|
| Monorepo setup (Turborepo) | Platform Core | `pnpm build` succeeds across all packages |
| PostgreSQL cluster (pgvector enabled) | Platform Core | pgvector extension active; HNSW index creatable |
| Kafka / Redpanda broker | Platform Core | Producer/consumer test passes; Schema Registry responding |
| CI/CD pipeline (GitHub Actions) | Platform Core | PR: lint + test + build + container push all automated |
| Terraform/Pulumi IaC for staging | Platform Core | `terraform apply` provisions identical staging environment |
| Secrets management (Vault/AWS SSM) | Platform Core | App starts without secrets in environment; Vault Agent injects |
| OTel Collector + Prometheus + Grafana | Trust & Ops | Metrics flowing; default service dashboards visible |

**Validation Gate**: CI pipeline must pass all checks on a hello-world service before Sprint 0 ends.

#### Initiative 1.2: Identity & Multi-Tenancy (Sprint 1 — Weeks 3-4)

| Deliverable | Owner | Acceptance Criteria |
|:------------|:------|:--------------------|
| Supabase Auth configuration | Platform Core | JWT generation with custom claims working |
| `auth` database schema | Platform Core | Users, sessions, MFA config tables created with RLS |
| `tenant_config` schema + RLS | Platform Core | Tenant isolation proven by automated cross-tenant test |
| JWT validation middleware | Platform Core | Invalid JWTs return 401; expired JWTs rejected |
| Tenant provisioning API | Platform Core | `POST /v1/organizations` creates tenant + seeds default config |
| `tenant.provisioned` Outbox event | Platform Core | Event appears in Outbox table within same transaction |
| Registration + Login UI (Storefront) | Marketplace & UI | End-to-end auth flow completes in < 3s |
| RLS automated regression test suite | Trust & Ops | Suite runs in CI; detects cross-tenant leakage |

**Validation Gate**: Automated RLS test suite passes 100% (zero tolerance for cross-tenant leakage).

---

### Epic 2: Marketplace Core (Sprints 2–3)

**Business Value**: First testable product functionality. Tenants can create and manage listings.  
**Risk**: Medium. Schema decisions made here are difficult to change later.  
**Complexity**: Medium.

#### Initiative 2.1: Marketplace Schema & CRUD (Sprint 2 — Weeks 5-6)

| Deliverable | Owner | Acceptance Criteria |
|:------------|:------|:--------------------|
| `marketplace.listings` schema | Marketplace & UI | All columns, indexes, and RLS policies applied |
| `marketplace.categories` schema | Marketplace & UI | Hierarchical category tree (max 3 levels) |
| `marketplace.listing_media` schema | Marketplace & UI | S3 integration; upload → CDN URL pipeline |
| Listing CRUD API (`/v1/listings`) | Marketplace & UI | GET, POST, PUT, PATCH (status), DELETE (soft) |
| Category API (`/v1/categories`) | Marketplace & UI | Hierarchical tree fetch; slug-based lookup |
| `marketplace.listing_created` Outbox event | Marketplace & UI | Event in Outbox after each listing creation |
| `marketplace.listing_updated` Outbox event | Marketplace & UI | Event on every meaningful field change |
| Image upload pipeline (S3 + variants) | Marketplace & UI | Original + 4 processed variants created; EXIF stripped |
| Listing management grid (Tenant Dashboard) | Marketplace & UI | Loads 1,000 rows < 500ms; pagination working |

**Validation Gate**: Load test with 10,000 synthetic listings; all CRUD operations respond < 200ms P99.

#### Initiative 2.2: Public Storefront (Sprint 3 — Weeks 7-8)

| Deliverable | Owner | Acceptance Criteria |
|:------------|:------|:--------------------|
| Storefront Next.js app scaffolding | Marketplace & UI | Builds cleanly; all TypeScript errors resolved |
| Homepage (ISR, 60s revalidation) | Marketplace & UI | Lighthouse score > 90 for Performance, SEO |
| Category pages (ISR, 5m revalidation) | Marketplace & UI | Structured data (JSON-LD) present; CLS = 0 |
| Listing detail page | Marketplace & UI | Open Graph tags present; SSR latency < 200ms |
| Basic keyword search (`/v1/search` — BM25 fallback) | Intelligence | Returns relevant results; responds < 100ms |
| SEO: `sitemap.xml` + `robots.txt` | Marketplace & UI | Validated by Google Search Console |
| Core Web Vitals CI gate | Marketplace & UI | Lighthouse CI blocks PR if LCP > 3.0s or CLS > 0.15 |

**Validation Gate**: Google Lighthouse CI score ≥ 90 on all core metrics.

---

### Epic 3: Intelligence & Discovery (Sprints 4–5)

**Business Value**: Transforms the platform from a static listings directory into an AI-native marketplace. This is the primary competitive differentiator.  
**Risk**: High. Vector index rebuild times and LLM provider latency are external dependencies.  
**Complexity**: Very High.

#### Initiative 3.1: AI Infrastructure & Embeddings (Sprint 4 — Weeks 9-10)

| Deliverable | Owner | Acceptance Criteria |
|:------------|:------|:--------------------|
| `ai_cache` schema (model registry, prompt registry, inference log) | Intelligence | Schema applied with RLS |
| `vector_store.embeddings` schema (pgvector, 1536d) | Intelligence | HNSW index created; `<=>` operator query responds < 15ms |
| AI Gateway service (OpenAI provider) | Intelligence | `/v1/ai/complete` and `/v1/ai/embed` endpoints working |
| Token Guard (Redis leaky-bucket per tenant) | Intelligence | Exceeding quota returns 429; `quota_exceeded` event emitted |
| Semantic cache (Redis cosine threshold 0.96) | Intelligence | Cache hit rate > 60% on repeated queries in test |
| Outbox consumer: `listing_created` → embedding generation | Intelligence | Embedding stored in `vector_store.embeddings` within 30s of listing creation |
| HNSW index async rebuild pipeline | Intelligence | Index rebuild completes without blocking reads |

**Validation Gate**: 50,000 synthetic embeddings loaded; vector similarity query responds < 15ms P95.

#### Initiative 3.2: Discovery Engine (Sprint 5 — Weeks 11-12)

| Deliverable | Owner | Acceptance Criteria |
|:------------|:------|:--------------------|
| Stage 1: Vector Retrieval (`GET /v1/feed`, `GET /v1/search`) | Intelligence | 500 candidates returned < 15ms |
| Stage 2: Light Ranking (trust score × bid modifier) | Intelligence | 500 → 100 candidates in < 5ms |
| Stage 3: Neural Re-Ranking (cross-encoder model) | Intelligence | 100 → 25 candidates in < 30ms |
| Stage 4: Exploration injection (epsilon-greedy 10%) | Intelligence | 10% of feed items are exploration items |
| Personalized feed endpoint (`/v1/feed`) | Intelligence | Requires auth; uses user preference vector from Redis |
| Realtime preference vector update (click → Redis) | Intelligence | User vector updated within 1s of click event |
| Discovery Engine OTel instrumentation | Trust & Ops | All 4 stage spans visible in Jaeger |

**Validation Gate**: End-to-end feed request (SSR + WebSocket delivery) completes < 50ms P95 under 100 concurrent users.

---

### Epic 4: Trust & Safety (Sprint 6 — Weeks 13-14)

**Business Value**: Platform credibility. Without trust, marketplace supply collapses.  
**Risk**: Medium. High false-positive rates require tuning period.  
**Complexity**: Medium.

| Deliverable | Owner | Acceptance Criteria |
|:------------|:------|:--------------------|
| `trust_registry` schema (fraud_signals, moderation_items, trust_scores) | Trust & Ops | Schema applied; RLS enforced |
| Pre-publish LLM content scan pipeline | Trust & Ops | Toxic listing quarantined within 30s of submission |
| Trust score calculation (per-tenant) | Trust & Ops | Score updates on every moderation action |
| Behavioral anomaly detection (Redis sliding windows) | Trust & Ops | High-velocity click pattern flagged within 60s |
| Moderation queue API (`/v1/admin/moderation/queue`) | Trust & Ops | Super Admin can approve/reject with audit log |
| Moderation Console (Platform Console module) | Marketplace & UI | Queue visible; approve/reject actions working |
| `trust.fraud_detected` event | Trust & Ops | Event emitted on every automated quarantine |
| `trust.trust_score_updated` event | Trust & Ops | Event emitted after every score recalculation |

**Validation Gate**: 500-item regression test suite of pre-labeled toxic listings achieves ≥ 95% recall.

---

### Epic 5: Realtime & Observability (Sprint 7 — Weeks 15-16)

**Business Value**: Transforms UX from static → living. Critical for marketplace engagement.  
**Risk**: Low-Medium. Supabase Realtime is well-proven infrastructure.  
**Complexity**: Medium.

| Deliverable | Owner | Acceptance Criteria |
|:------------|:------|:--------------------|
| Supabase Realtime deployment | Trust & Ops | WebSocket connections established from Storefront and Dashboard |
| WAL listener → WebSocket push (listing status changes) | Trust & Ops | Listing approval pushed to tenant Dashboard < 500ms |
| Feed update push (new listings available banner) | Trust & Ops | Storefront receives notification of new listings in feed |
| Moderation push notification | Trust & Ops | Tenant notified when listing is quarantined |
| OTel: Prometheus + Grafana full deployment | Trust & Ops | All services streaming metrics; SLO dashboards live |
| AI telemetry dashboards | Trust & Ops | Token cost, cache hit rate, provider health visible |
| Error alerting (Sentry) | Trust & Ops | All services reporting errors; error rate alert configured |
| Outbox relay → Kafka migration | Platform Core | Outbox events flowing through Kafka; consumers validated |

**Validation Gate**: 1,000 concurrent WebSocket connections sustained; WAL-to-client latency < 500ms P99.

---

### Epic 6: Monetization & Billing (Sprint 8 — Weeks 17-18)

**Business Value**: Revenue. Platform cannot scale without sustainable revenue infrastructure.  
**Risk**: High. Billing bugs = financial liability. Double-billing = churn.  
**Complexity**: High.

| Deliverable | Owner | Acceptance Criteria |
|:------------|:------|:--------------------|
| `billing_ledger` schema (entries, outbox) | Finance Platform | Append-only enforced; no UPDATE/DELETE possible |
| Stripe webhook handler (subscription events) | Finance Platform | All subscription lifecycle events processed idempotently |
| Usage metering pipeline (Token Guard → Ledger) | Finance Platform | Every AI token consumption recorded within 1s |
| Overage billing calculation | Finance Platform | Overage costs calculated correctly for 100 test scenarios |
| Subscription plan enforcement (quota limits) | Finance Platform | Starter plan blocked from Growth features |
| Ad auction engine (generalized second-price) | Finance Platform | Top bid computed in < 50ms; charged winner correctly |
| Billing portal (Tenant Dashboard) | Marketplace & UI | Stripe Elements for payment; invoice list; usage meter |
| `monetization.quota_exceeded` event | Finance Platform | Event emitted when any quota crosses 95% threshold |

**Validation Gate**: Billing reconciliation test — ledger total matches Stripe expected charges for 100 synthetic tenant-months.

---

### Epic 7: Production Hardening (Sprints 9–10)

**Business Value**: Platform safety and confidence for launch.  
**Risk**: Discovery of bugs at this stage is expected and healthy.  
**Complexity**: Variable.

#### Sprint 9 — Weeks 19-20: Load & Security Hardening

| Deliverable | Owner | Acceptance Criteria |
|:------------|:------|:--------------------|
| Load test: 1M synthetic listings | Intelligence + Trust & Ops | Vector search P95 < 15ms; light ranking < 5ms |
| Load test: 100 concurrent feed requests | Intelligence | End-to-end feed < 50ms P95 |
| Penetration test (external scope) | Security | All Critical and High findings remediated |
| RLS audit (all tables verified) | Security + Platform Core | Automated test suite: 100% pass rate |
| Prompt injection test battery (200 scenarios) | Intelligence | 0 successful jailbreaks in test suite |
| WAF rules validation | Trust & Ops | SQL injection + XSS test suite blocked 100% |
| Secrets audit (no hardcoded values) | All Teams | GitGuardian scan: 0 findings |

#### Sprint 10 — Weeks 21-22: Documentation & Launch Readiness

| Deliverable | Owner | Acceptance Criteria |
|:------------|:------|:--------------------|
| OpenAPI specification (all public endpoints) | All API Teams | Swagger UI renders complete, accurate docs |
| Operational runbooks (RB-01 through RB-10) | Trust & Ops | All runbooks reviewed and approved by on-call engineers |
| Incident response playbook | Trust & Ops | Approved by Engineering Director |
| Tenant onboarding documentation | Marketplace & UI | Tested by 5 beta tenants |
| Data backup & recovery validation | Platform Core | Full restore tested in < 4 hours RTO |
| Disaster recovery plan | Platform Core | DR tested; failover completes < 30 min |

---

## 3. Dependency Graph

```
Sprint 0: Infrastructure
    │
    ▼
Sprint 1: Identity + Tenancy
    │
    ├──────────────────────────────────────┐
    ▼                                      ▼
Sprint 2: Marketplace Core         Sprint 4: AI Infrastructure
    │                                      │
    ▼                                      ▼
Sprint 3: Public Storefront        Sprint 5: Discovery Engine
    │                                      │
    └──────────────────────────────────────┘
                     │
                     ▼
              Sprint 6: Trust & Safety
                     │
                     ▼
              Sprint 7: Realtime + Observability
                     │
                     ▼
              Sprint 8: Monetization
                     │
                     ▼
              Sprint 9: Hardening
                     │
                     ▼
              Sprint 10: Launch Readiness
```

**Parallel Workstreams** (Sprints 2 & 4 can run simultaneously):
- **Marketplace & UI Team** works on Sprints 2-3 (Listings, Storefront).
- **Intelligence Team** works on Sprints 4-5 (AI Gateway, Discovery) in parallel.
- Both teams re-integrate in Sprint 5 when the Discovery Engine connects to real listing data.

---

## 4. Risk Mitigation Matrix

| Risk | Probability | Impact | Mitigation Strategy | Owner |
|:-----|:------------|:-------|:--------------------|:------|
| Vector search latency exceeds 50ms P95 | Medium | High | Aggressive HNSW tuning (`ef_search=200, m=16`); pre-compute anonymous feeds; fallback to BM25 | Intelligence |
| LLM provider outage (OpenAI) | High | High | Multi-provider fallback (OpenAI → Anthropic → local Llama-3); circuit breaker in Sprint 4 | Intelligence |
| Stripe billing webhook failure cascade | Medium | High | Idempotency keys on all webhook handlers; retry queue with DLQ; billing reconciliation job | Finance |
| RLS policy misconfiguration | Low | Critical | Automated RLS regression suite runs on every PR; security reviews for all DB migrations | Security |
| Kafka consumer lag under load | Medium | Medium | Auto-scaling consumer groups; DLQ for failed messages; lag alert at 10,000 messages | Platform Core |
| Event out-of-order delivery | Low | Medium | Strict idempotent consumer design; `event_id` deduplication tracking in Redis | All Teams |
| pgvector index rebuild blocking reads | Medium | Medium | Run index builds on replica; hot-swap index via `REINDEX CONCURRENTLY` | Intelligence |
| HNSW recall degradation after update | Medium | Medium | Monitor recall with periodic ground-truth evaluation; threshold alert < 80% recall | Intelligence |
| Trust false-positive rate > 5% | High | Medium | Human review queue for borderline scores (0.5-0.7); appeal mechanism for tenants | Trust & Ops |
| Embedding model provider deprecation | Low | Medium | Model registry abstraction allows provider swap without application changes | Intelligence |

---

## 5. Sprint Cadence & Ceremonies

| Ceremony | Frequency | Duration | Participants |
|:---------|:----------|:---------|:-------------|
| Sprint Planning | 2-week start | 2 hours | All teams |
| Daily Standup | Daily | 15 minutes | Per-team |
| Architecture Review | Weekly | 1 hour | Tech leads + architect |
| Cross-Team Sync | Weekly | 30 minutes | All team leads |
| Sprint Demo | 2-week end | 1 hour | All teams + stakeholders |
| Sprint Retrospective | 2-week end | 1 hour | All teams |
| Security Review | Per PR (automated) + Weekly (manual) | 30 min | Security + PR author |

---

## 6. Acceptance Criteria & Definition of Done

A deliverable is considered **Done** when ALL of the following are true:

| Criterion | Standard |
|:----------|:---------|
| **Functional** | All acceptance criteria from the sprint plan are met |
| **Tested** | Unit test coverage ≥ 80% for new code; integration tests written |
| **Observed** | OTel spans emitted for critical paths; logs structured correctly |
| **Secured** | RLS policies applied (if DB changes); SAST + SCA scans pass |
| **Documented** | OpenAPI spec updated; README updated if behavior changed |
| **Deployed** | Staging deployment successful; no production deploy blockers |
| **Reviewed** | PR approved by ≥ 2 reviewers; security reviewed if touching auth/billing/AI |
| **Validated** | Load test or functional test proves acceptance criteria under realistic conditions |
