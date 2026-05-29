# SPEC 18 — MINIMUM VIABLE PRODUCT & VERSION ROADMAP

> **Basis**: [PLANNER.md](file:///home/mohal665544/pr1/PLANNER.md) — Platform Master Architecture  
> **Status**: Execution-Ready v3 (Maximum Depth)  
> **Version**: 3.0.0  
> **Last Updated**: 2026-05-30  
> **Owned By**: Product & Engineering Leadership

---

## 1. Versioning Philosophy

The platform release strategy follows **Hypothesis-Driven Versioning**. Each version is designed to validate a specific market or technical hypothesis before investing in the next layer of complexity. No version should be "features for features' sake" — each must advance a testable business thesis.

| Version | Core Hypothesis | Timeline | Go-to-Market |
|:--------|:----------------|:---------|:-------------|
| **MVP** | Multi-tenant AI search is 2× more relevant than keyword search | Sprints 0-7 (~14 weeks) | Private Beta (50 tenants) |
| **V1** | Usage-based monetization + trust systems make the platform self-sustaining | Sprints 8-10 (+8 weeks) | Public Beta |
| **V2** | Personalization flywheel drives organic engagement growth | +12 weeks after V1 | General Availability |
| **V3** | Platform becomes an ecosystem (API-first, partner integrations, marketplace intelligence as a service) | +16 weeks after V2 | Enterprise Launch |

---

## 2. MVP (Private Beta) — Hypothesis Validation

### 2.1 Scope Boundaries

The MVP scope is strictly defined by what is necessary to prove the three platform hypotheses. Anything outside this scope is explicitly deferred.

**MVP Hypotheses:**
1. **Multi-Tenant Safety**: Multiple tenants can co-exist in shared infrastructure with zero data leakage.
2. **AI Discovery**: Vector semantic search yields measurably better results than keyword search (measured by user engagement: CTR, session depth, conversion).
3. **Automated Trust**: LLM-based content moderation can automate ≥ 90% of trust decisions without human review.

### 2.2 In-Scope Domain Capabilities

#### Identity & Tenant Domain
| Capability | In MVP | Notes |
|:-----------|:-------|:-------|
| User registration (email/password) | ✅ | |
| Google OAuth login | ✅ | |
| Organization creation + tenant provisioning | ✅ | |
| RBAC: Owner, Admin, Member, Viewer roles | ✅ | |
| JWT with tenant claims | ✅ | |
| SAML/SSO enterprise login | ❌ | V2 |
| Custom domain mapping | ❌ | V1 |
| Advanced seat management | ❌ | V1 |

#### Marketplace Domain
| Capability | In MVP | Notes |
|:-----------|:-------|:-------|
| Listing CRUD (title, description, price, category, tags) | ✅ | |
| Image upload (1 primary + up to 5 gallery images) | ✅ | |
| Basic 2-level category taxonomy | ✅ | Platform-managed; no tenant-custom categories |
| Listing status workflow (Draft → Review → Active → Archived) | ✅ | |
| Soft delete + recovery | ✅ | |
| Multi-currency pricing | ❌ | V1 |
| Dynamic custom attributes (per category) | ❌ | V2 |
| Listing versioning / changelog | ❌ | V2 |
| Reviews & ratings system | ❌ | V2 |
| Bulk import (CSV) | ❌ | V1 |

#### AI Infrastructure Domain
| Capability | In MVP | Notes |
|:-----------|:-------|:-------|
| OpenAI embedding generation (text-embedding-3-small, 1536d) | ✅ | |
| Basic Token Guard (hard quota, no tier differentiation) | ✅ | |
| LLM content moderation (GPT-4o-mini) | ✅ | |
| Semantic cache (Redis cosine match) | ❌ | V1 — defer for cost optimization |
| Multi-provider fallback (Anthropic) | ❌ | V1 |
| Local model execution (Llama-3) | ❌ | V2 |
| Embedding model versioning / migration | ❌ | V1 |

#### Discovery Domain
| Capability | In MVP | Notes |
|:-----------|:-------|:-------|
| Stage 1: Vector retrieval (pgvector HNSW, top-500) | ✅ | |
| Stage 2: Light ranking (trust score + freshness) | ✅ | |
| Keyword search fallback (pg_trgm BM25) | ✅ | Fallback when vector index unavailable |
| Stage 3: XGBoost neural re-ranking | ❌ | V1 — needs behavioral data first |
| Stage 4: Exploration injection | ❌ | V1 |
| Real-time preference vector updates (fast loop) | ❌ | V1 — defer personalization flywheel |
| Collaborative filtering | ❌ | V2 |
| Sponsored listings boost in ranking | ❌ | V1 |

#### Trust & Safety Domain
| Capability | In MVP | Notes |
|:-----------|:-------|:-------|
| Pre-publish LLM content scan (toxicity, spam) | ✅ | |
| Automatic quarantine on high-risk score | ✅ | |
| Admin approve/reject quarantined listings | ✅ | |
| `trust.fraud_detected` event | ✅ | |
| Basic trust score (per-tenant) | ✅ | |
| Behavioral anomaly detection (velocity patterns) | ❌ | V1 |
| Trust score decay model (time-weighted) | ❌ | V1 |
| IP/device fingerprinting | ❌ | V1 |
| Complex fraud scoring model | ❌ | V2 |

#### Realtime Domain
| Capability | In MVP | Notes |
|:-----------|:-------|:-------|
| WebSocket connection (authenticated) | ✅ | |
| Push: listing status change notification | ✅ | |
| Push: quota warning notification | ✅ | |
| Live feed updates (new listings banner) | ❌ | V1 |
| Live impression/view counters | ❌ | V2 |

#### Monetization Domain
| Capability | In MVP | Notes |
|:-----------|:-------|:-------|
| Fixed plan limits (hard quotas) | ✅ | |
| Manual billing (invoice-based) | ✅ | For private beta tenants |
| Stripe subscription billing | ❌ | V1 |
| Usage-based overage billing | ❌ | V1 |
| Ad auction / sponsored discovery | ❌ | V1 |

#### Frontend Domain
| Capability | In MVP | Notes |
|:-----------|:-------|:-------|
| Marketplace Storefront (basic) | ✅ | Search + category pages + listing detail |
| Tenant Dashboard (listing management) | ✅ | CRUD + moderation queue |
| Super Admin Console | ✅ (minimal) | Moderation queue only; no full console |
| Tenant analytics dashboard | ❌ | V1 |
| Embedded widget | ❌ | V2 |

### 2.3 MVP Launch Criteria (Private Beta Gate)

The MVP MUST meet ALL of the following before opening to private beta tenants:

| Category | Criterion | Validation Method | Pass/Fail |
|:---------|:----------|:------------------|:----------|
| **Security — Critical** | Zero cross-tenant data leakage possible | Automated pentest: Tenant A JWT queries Tenant B data → must return 0 rows | Fail = No Launch |
| **Security — Critical** | No successful prompt injection in test battery (200 scenarios) | Pre-flight classifier blocks all test cases | Fail = No Launch |
| **Performance** | Discovery search P95 latency < 100ms | Load test: 50,000 listings, 100 concurrent users | Fail = No Launch |
| **Performance** | Listing creation to embedding ready < 30s | End-to-end test: create listing → verify embedding in vector store | Fail = No Launch |
| **Reliability** | Event outbox idempotency: 0 duplicate events in chaos test | Chaos: restart outbox relay during 100-listing publish; verify counts | Fail = No Launch |
| **Trust** | LLM moderation recall ≥ 95% on 500-item test suite | Regression: 500 pre-labeled toxic/spam listings | Fail = No Launch |
| **Trust** | False positive rate ≤ 5% (legitimate listings quarantined) | Regression: 500 pre-labeled legitimate listings | Fail = No Launch |
| **Observability** | All critical path spans visible in Jaeger | Manual inspection of 20 representative traces | Fail = No Launch |
| **RLS** | Automated RLS test suite: 100% pass | Run full suite on production DB configuration | Fail = No Launch |

---

## 3. V1 (Public Beta) — Self-Sustaining Platform

**Hypothesis**: Usage-based monetization creates a financially self-sustaining platform that grows organically.

**Timeline**: +8 weeks after MVP private beta launch.  
**Target**: 500+ active tenants, first $10K MRR.

### 3.1 V1 New Capabilities

| Domain | New Capabilities |
|:-------|:----------------|
| **Monetization** | Stripe subscription billing; usage-based overage billing; AI token cost metering; invoice generation; billing portal in Tenant Dashboard |
| **Monetization** | Ad auction engine (generalized second-price CPC); sponsored listing boost in ranking Stage 2 |
| **AI Infrastructure** | Semantic cache (Redis cosine 0.96 threshold); multi-provider fallback (OpenAI → Anthropic); embedding model versioning |
| **Discovery** | Stage 3 XGBoost re-ranking (trained on MVP behavioral data); Stage 4 exploration injection (ε=0.10) |
| **Discovery** | Real-time preference vector updates (fast loop); personalized feed for authenticated users |
| **Trust & Safety** | Behavioral anomaly detection (Redis sliding windows); trust score decay model; IP/device fingerprinting |
| **Marketplace** | Bulk listing import (CSV/Excel); custom domain mapping per tenant; multi-currency price display |
| **Frontend** | Full Tenant Analytics Dashboard; Billing portal; Super Admin Platform Console (full feature) |
| **Realtime** | Live feed update push (new listings banner); live inquiry notification |

### 3.2 V1 Acceptance Criteria

| Criterion | Target |
|:----------|:-------|
| Discovery relevance lift over keyword search | CTR improvement ≥ 30% (measured via A/B test) |
| AI inference cost per active tenant per month | < $5 USD at Growth plan usage levels |
| Semantic cache hit rate | ≥ 60% |
| Stage 3 re-ranker NDCG@10 | ≥ 0.75 (vs. Stage 2 baseline) |
| MRR | ≥ $10,000 |
| Churn rate (monthly) | ≤ 8% |
| Platform uptime | ≥ 99.5% |

---

## 4. V2 (General Availability) — Personalization Flywheel

**Hypothesis**: Behavioral data collected in V1 enables a personalization flywheel that drives organic engagement growth, reducing CAC and improving NRR.

**Timeline**: +12 weeks after V1 launch.  
**Target**: 2,000+ active tenants, $100K MRR, DAU/MAU stickiness ≥ 25%.

### 4.1 V2 New Capabilities

| Domain | New Capabilities |
|:-------|:----------------|
| **Discovery** | Collaborative filtering (user-to-user, item-to-item); cold-start resolution for new tenants (content-based bootstrapping); slow-loop offline model retraining (weekly XGBoost rebuild) |
| **Marketplace** | Reviews & ratings system (buyer reviews); seller response to reviews; dynamic custom attributes (per-category); listing versioning with changelog |
| **Marketplace** | Location-based discovery (geo-radius filtering in vector search); listing expiry dates |
| **AI Infrastructure** | Local model execution (Llama-3-8B for cost-sensitive operations); custom embedding fine-tuning per tenant (enterprise tier) |
| **Identity** | SAML/SSO enterprise login (Okta, Azure AD, Google Workspace); audit log export for enterprise compliance |
| **Analytics** | Cohort retention analysis; LTV calculation dashboard; attribution model (first-touch, last-touch, linear); competitive benchmarking (anonymized) |
| **Trust** | Complex fraud scoring model (multi-signal ML); seller verification tiers (verified badge); community reporting system |
| **Frontend** | Embedded widget (vanilla JS, shadow DOM); mobile-responsive PWA optimizations; white-label theming per tenant |

### 4.2 V2 Acceptance Criteria

| Criterion | Target |
|:----------|:-------|
| 30-day user retention | ≥ 25% |
| DAU/MAU ratio (stickiness) | ≥ 25% |
| Personalization lift (vs. V1 non-personalized) | Session depth ≥ 40% improvement |
| Collaborative filtering cold-start resolution | New tenant achieves ≥ 70% of personalization quality within 72 hours |
| Platform NRR | ≥ 110% |
| MRR | ≥ $100,000 |

---

## 5. V3 (Enterprise Launch) — Ecosystem Platform

**Hypothesis**: By opening the platform's AI and discovery infrastructure via public APIs, it becomes a marketplace intelligence platform (MaaP) — generating revenue from both the marketplace AND the intelligence layer.

**Timeline**: +16 weeks after V2 launch.  
**Target**: First enterprise contracts ($10K+ MRR per tenant), $500K ARR.

### 5.1 V3 New Capabilities

| Domain | New Capabilities |
|:-------|:----------------|
| **Platform API (Public)** | Fully documented, versioned public API for the entire platform; API key management; partner developer portal |
| **Discovery-as-a-Service** | Tenants can expose their discovery engine to third-party applications via API; vector search API for external data |
| **Marketplace Intelligence API** | Trend API (rising categories, price signals, demand signals); competitive intelligence signals (anonymized); embedding API for partner content indexing |
| **AI Gateway (Public)** | Enterprise tenants can route custom LLM workflows through the platform's AI Gateway (with their own provider keys); custom model registry per enterprise |
| **Multi-Region** | Active-passive multi-region deployment (EU + US regions); data residency controls (GDPR EU data isolation) |
| **Enterprise Identity** | Advanced directory sync (SCIM provisioning); custom SSO domain per tenant; hardware key (YubiKey) enforcement for enterprise admins |
| **White-Label** | Complete UI white-label (replace all platform branding); custom email domain; embedded widget with full theming API |
| **Partner Ecosystem** | Partner/reseller program; commission tracking; co-billing arrangements |

### 5.2 V3 Acceptance Criteria

| Criterion | Target |
|:----------|:-------|
| API developer satisfaction (NPS) | ≥ 50 |
| Enterprise tenant contracts signed | ≥ 5 at $10K+ MRR each |
| ARR | ≥ $500,000 |
| Multi-region latency (EU requests) | < 50ms P95 from European clients |
| API uptime SLA offered | 99.9% (contractual) |
| Data residency compliance | SOC 2 Type II report available |

---

## 6. Feature Flag Strategy Across Versions

Features that span multiple versions use feature flags for controlled rollout:

| Feature | Flag Name | MVP | V1 | V2 | V3 |
|:--------|:----------|:----|:---|:---|:---|
| Stage 3 re-ranking | `discovery_stage3_enabled` | Off | On (A/B) | On | On |
| Personalized feed | `discovery_personalization_enabled` | Off | On | On | On |
| Semantic cache | `ai_semantic_cache_enabled` | Off | On | On | On |
| Sponsored listings | `monetization_sponsored_enabled` | Off | On | On | On |
| Collaborative filtering | `discovery_collab_filter_enabled` | Off | Off | On | On |
| Public API | `platform_public_api_enabled` | Off | Off | Off | On |
| Multi-region routing | `infra_multiregion_enabled` | Off | Off | Off | On |
