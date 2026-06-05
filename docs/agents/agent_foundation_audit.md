# Agent Foundation Audit Report
**Project:** AI-Driven Adaptive Marketplace Infrastructure  
**Supabase Project:** `mdegkyxdnbfzegeauxpl` — ACTIVE_HEALTHY (eu-west-1, PostgreSQL 17.6)  
**Audit Date:** 2026-06-05  
**Phase:** AT — Agent Platform Implementation Program

---

## 1. Live Database Inventory

### Schema
All production tables live in the `public` schema (35 tables total). The domain-segmented schema approach from local migrations (AA1/AA2) has **not yet been applied** to the live project — the live DB predates that work.

### Applied Migrations (9 total)
| Version | Name |
|---------|------|
| 20260511042007 | 00_initial_schema |
| 20260513020700 | add_listing_status_tags_and_bucket |
| 20260516230336 | add_analytics_tables |
| 20260516231757 | phase_2_2_step_6_communication |
| 20260516232925 | create_company_ui_settings |
| 20260523093405 | phase3_reverso_admin_foundation |
| 20260523093446 | super_admin_schema |
| 20260523093454 | super_admin_schema_part2 |
| 20260523093513 | reverso_v2_additive |

---

## 2. Existing AI Components

| Table | Purpose | Agent Readiness |
|-------|---------|-----------------|
| `public.semantic_embeddings` | pgvector embeddings for listings/users | ✅ Ready — extend for agent memory |
| `public.ai_inference_logs` | LLM call tracking, token usage | ✅ Ready — extend for agent metrics |
| `public.ai_configurations` | Model configs per tenant | ✅ Ready — agents will read this |
| `public.ai_experiments` | A/B testing for AI features | 🟡 Extend — add agent experiment type |
| `public.ai_insights` | AI-generated insight records | 🟡 Extend — agents write here |

**Key Finding:** pgvector is installed under `extensions` schema and already used via `semantic_embeddings`. Agent memory can extend this table or create a dedicated `agent_memory` table using the same vector type.

---

## 3. Existing Automation / Event Components

| Component | Type | Details |
|-----------|------|---------|
| `pgmq` | Message Queue | **INSTALLED** — full queue infrastructure with send/read/archive/pop functions |
| `pg_net` | HTTP | Installed — agents can trigger outbound HTTP calls from DB functions |
| `pg_cron` | Scheduler | Installed — agent schedules can use `cron.schedule()` |
| `realtime.*` | Pub/Sub | Partitioned messages tables — agents can subscribe to realtime events |
| `supabase_functions.hooks` | Webhooks | Edge function hooks available |

**Key Finding:** `pgmq` is already installed and operational. This is the **ideal backbone for the Agent Event Bus** — zero additional extension work required.

---

## 4. Existing Trust / Moderation Components

| Table | Purpose | Agent Hookup |
|-------|---------|-------------|
| `public.trust_verifications` | Company/user trust checks | Trust Agent reads + writes |
| `public.fraud_scores` | ML fraud scoring records | Fraud Agent reads + writes |
| `public.moderation_queues` | Content moderation work queue | Moderation Agent reads + writes |
| `public.moderation_actions` | Moderation decisions log | Moderation Agent writes |

**Key Finding:** The Trust, Fraud, and Moderation data models exist. Agents need a registry entry + event subscriptions to become autonomous actors on these tables.

---

## 5. Existing Intelligence / Recommendation Components

| Component | Status |
|-----------|--------|
| Semantic similarity via pgvector | ✅ Active |
| AI insights table | ✅ Active |
| `user_interactions` table | ✅ Active — recommendation signal source |
| Recommendation logic | ❌ No autonomous agent yet |

---

## 6. Existing Billing / Governance Components

| Table | Purpose |
|-------|---------|
| `public.tenant_subscriptions` | Subscription state |
| `public.tenant_invoices` | Invoice records |
| `public.billing_events` | Payment events |
| `public.usage_tracking` | Token/resource usage |
| `public.quota_usage` | Quota enforcement |
| `public.tenant_entitlements` | Feature access |
| `public.audit_logs` | Tenant action log |
| `public.platform_audit_logs` | Platform-wide admin log |

---

## 7. Existing Helper Functions (public schema)

| Function | Purpose |
|----------|---------|
| `get_current_company_id()` | Session-scoped company resolution |
| `is_platform_admin_user()` | Admin privilege check |
| `is_super_admin()` | Super-admin check |
| `block_audit_mutation_trigger()` | Prevent audit log tampering |

---

## 8. Existing Edge Functions (3)

| Function | Purpose |
|----------|---------|
| `ai-embed` | Generate and store embeddings |
| `auth-context` | Set tenant/user context |
| `stripe-webhook` | Process Stripe payment events |

---

## 9. Extension Inventory (Agent-Relevant)

| Extension | Schema | Status | Agent Use |
|-----------|--------|--------|-----------|
| `vector` (pgvector) | extensions | ✅ Active | Agent Memory |
| `pgmq` | pgmq | ✅ Active | Agent Event Bus |
| `pg_net` | net | ✅ Active | Agent HTTP calls |
| `pg_cron` | cron | ✅ Active | Agent Scheduling |
| `pgcrypto` | extensions | ✅ Active | Agent secret hashing |
| `pg_trgm` | extensions | ✅ Active | Agent fuzzy search |
| `uuid-ossp` | extensions | ✅ Active | UUID generation |

---

## 10. Gap Analysis — What Needs to Be Built

| Component | Status | Action |
|-----------|--------|--------|
| Agent Registry | ❌ Missing | **Build Phase 2** |
| Agent Identity & RBAC | ❌ Missing | **Build Phase 3** |
| Agent Memory (dedicated) | ❌ Missing | **Build Phase 4** |
| Agent Event Bus tables | ❌ Missing | **Build Phase 5** (pgmq queues exist) |
| Agent Runtime | ❌ Missing | **Build Phase 6** |
| Agent Observability | ❌ Missing | **Build Phase 7** |
| First-Gen Agent Seeds | ❌ Missing | **Build Phase 8** |
| Orchestration Layer | ❌ Missing | **Build Phase 9** |

---

## 11. Readiness Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| Data Infrastructure | 8/10 | pgvector, pgmq, pg_cron all ready |
| AI Foundation | 7/10 | Embeddings + inference logs exist |
| Trust & Safety | 7/10 | Moderation and fraud tables exist |
| Billing & Governance | 9/10 | Full billing stack operational |
| Agent Platform | 1/10 | No agent primitives yet — building now |

**Overall Readiness: 6.4/10 → Target: 9.5/10 after implementation**

---

> **Conclusion:** The platform has excellent infrastructure foundations. pgmq, pgvector, pg_cron and all domain tables are operational. The Agent Platform can be built as a pure **extension layer** on top of existing systems — no rebuilding required.
