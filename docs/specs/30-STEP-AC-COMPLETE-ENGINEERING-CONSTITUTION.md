# 🔥 STEP AC — PLATFORM IMPLEMENTATION MASTER SPECIFICATION
## The Complete Engineering Constitution

> **Status**: Sealed — Engineering-Ready
> **Version**: 1.0.0
> **Date**: 2026-05-31
> **Applies To**: All engineering teams across Backend, Frontend, AI, Data, Infrastructure
> **Basis**: Specs 01–29, Supabase Blueprint, DB Evolution Design, Master Feature Inventory

---

## SECTION 1 — PLATFORM MODULE MAP

### 1.1 Module Decomposition Principles

Each module is a bounded context owning its data, state, and business logic. Modules communicate exclusively via:
1. **Synchronous APIs** (within the same service boundary, HTTP/gRPC)
2. **Events** (cross-domain, via the Transactional Outbox → Kafka/Supabase Realtime)
3. **Shared Read Models** (Materialized Views in `analytics` schema — read-only)

No module may directly query another module's primary tables. This is the **Domain Boundary Law**.

---

### 1.2 Identity Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Manages authentication state, user profile data, device sessions, and multi-tenant membership. |
| **Ownership** | `auth` schema (GoTrue), `identity` schema |
| **Inputs** | JWT from Supabase GoTrue, OAuth callbacks, Magic Link tokens |
| **Outputs** | Enriched JWT with `tenant_id` + `role` claims, User Profile records |
| **Dependencies** | Supabase GoTrue, `platform.tenants` (read-only) |
| **Events Produced** | `identity.user_registered`, `identity.session_started`, `identity.session_ended`, `identity.mfa_enrolled`, `identity.password_changed` |
| **Events Consumed** | `tenant.provisioned` (to create default member record) |

**Business Rules:**
- Every user MUST have exactly one `auth.users` record.
- A user MAY belong to multiple tenants via `identity.tenant_members`.
- Only one `tenant_id` may be active per session (the "active context").
- Email is globally unique across the platform (enforced by GoTrue).

---

### 1.3 Company / Organization Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Lifecycle management for marketplace operator organizations (tenants). Provisioning, branding, plan assignment. |
| **Ownership** | `platform.tenants`, `platform.workspaces`, `platform.subscriptions` |
| **Inputs** | Registration form data, Stripe subscription events, plan change requests |
| **Outputs** | Tenant records, onboarding state, workspace config |
| **Dependencies** | Identity Service (Owner must exist), Billing Service |
| **Events Produced** | `tenant.provisioned`, `tenant.suspended`, `tenant.reactivated`, `tenant.deleted`, `tenant.plan_changed` |
| **Events Consumed** | `monetization.subscription_changed`, `monetization.invoice_payment_failed` |

**Business Rules:**
- A `tenant` is provisioned atomically: workspace + default admin member + starter subscription are created in one transaction.
- Suspension sets `status = 'suspended'` but does NOT delete data.
- Hard deletion is a GDPR compliance operation requiring Super Admin approval and an asynchronous data scrubbing pipeline.

---

### 1.4 RBAC Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Authorizes all platform actions. Maps (user, tenant, resource) triples to allowed operations. |
| **Ownership** | `identity.tenant_members`, `identity.role_permissions` |
| **Inputs** | JWT claims (`tenant_id`, `role`), API route + HTTP method, resource owner ID |
| **Outputs** | Boolean authorization decision, Permission set for UI rendering |
| **Dependencies** | Identity Service |
| **Events Produced** | `identity.role_changed`, `identity.member_invited`, `identity.member_removed` |
| **Events Consumed** | None |

**Business Rules:**
- Role hierarchy: `super_admin > tenant_owner > tenant_admin > manager > agent > viewer > anonymous`.
- Permissions are additive upward in the hierarchy.
- A user's role is scoped strictly to one tenant. The same user may be `admin` in Tenant A and `viewer` in Tenant B.
- The `service_role` key (Deno Edge Functions) bypasses RBAC entirely. It is the system's internal privileged identity.

---

### 1.5 Listing Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Core marketplace inventory. CRUD for all product/service/AI-agent listings. Manages the listing lifecycle from draft to archived. |
| **Ownership** | `marketplace.listings`, `marketplace.categories`, `marketplace.listing_attributes` |
| **Inputs** | Seller form submissions, bulk CSV imports, API creates |
| **Outputs** | Published listings, draft records, status events |
| **Dependencies** | Identity Service (seller must exist), Media Service, Trust Service (pre-publish scan) |
| **Events Produced** | `marketplace.listing_created`, `marketplace.listing_updated`, `marketplace.listing_published`, `marketplace.listing_archived`, `marketplace.listing_status_changed` |
| **Events Consumed** | `trust.content_approved` (→ auto-publish), `trust.content_quarantined` (→ block publish), `monetization.quota_exceeded` (→ block create) |

**Business Rules:**
- Status state machine: `DRAFT → PENDING_REVIEW → ACTIVE → ARCHIVED`. Reversing (e.g., re-editing a published listing) transitions back to `PENDING_REVIEW`.
- A listing CANNOT be published if: (a) the tenant's listing quota is exhausted, OR (b) Trust service has flagged the listing `HIGH` or `CRITICAL`.
- `title` and `description` are the canonical text for vector embedding. Any edit to either field MUST trigger a re-embed event.

---

### 1.6 Media Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Upload, store, process, and serve listing media (images, videos, PDFs). |
| **Ownership** | `marketplace.listing_media`, Supabase Storage buckets |
| **Inputs** | Raw file upload streams, listing_id association |
| **Outputs** | CDN URLs, processed thumbnail URLs, processing_status events |
| **Dependencies** | Listing Service (FK), Storage Provider |
| **Events Produced** | `media.upload_started`, `media.processing_completed`, `media.processing_failed` |
| **Events Consumed** | `marketplace.listing_archived` (→ move media to cold storage) |

**Business Rules:**
- Images MUST be validated for MIME type and magic bytes before storage.
- After upload, images are processed asynchronously: resized to standard dimensions (800x600, 400x300, 200x200) and converted to WebP.
- Primary media for a listing is designated by `is_primary = true`. Only one image may be primary per listing.

---

### 1.7 Search Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Unified search pipeline handling keyword, faceted, and semantic (vector) queries. |
| **Ownership** | `discovery.search_logs`, `ai.embeddings` (reads), `marketplace.listings` (reads) |
| **Inputs** | User query string, active filters (category, price range, location), tenant context |
| **Outputs** | Ordered list of listing IDs with relevance scores |
| **Dependencies** | Listing Service (data), AI Service (embeddings), Discovery/Recommendation Service (re-ranking) |
| **Events Produced** | `discovery.search_executed` |
| **Events Consumed** | `marketplace.listing_updated` (→ invalidate search cache for affected listings) |

**Business Rules:**
- All searches are scoped to the active `tenant_id` (RLS enforced).
- The search pipeline runs in three stages: (1) Candidate Retrieval (HNSW vector + keyword), (2) Re-Ranking (XGBoost model with user signals), (3) Diversity Injection (ensure no single category dominates top 10).
- Zero-result searches MUST be logged for query analysis and AI-powered query suggestion.

---

### 1.8 Recommendation Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Generates personalized listing recommendations for individual users based on behavioral history, embeddings, and collaborative filtering signals. |
| **Ownership** | `intelligence.user_embeddings`, `intelligence.recommendation_cache` |
| **Inputs** | `user_id`, session context, recent interaction history |
| **Outputs** | Ranked list of listing IDs for the personalized feed |
| **Dependencies** | AI Service (embeddings), Discovery/Search Service (candidates), Analytics Service (CTR signals) |
| **Events Produced** | `discovery.feed_generated`, `discovery.item_impressed` |
| **Events Consumed** | `discovery.item_clicked` (→ update user preference model), `marketplace.listing_status_changed` (→ invalidate cached feeds) |

---

### 1.9 Analytics Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Collects, aggregates, and serves all platform telemetry. Powers tenant dashboards and Super Admin KPI views. |
| **Ownership** | `analytics.raw_events`, `analytics.daily_metrics`, `analytics.tenant_kpis` |
| **Inputs** | Frontend telemetry batches (via Edge Function), domain events from Outbox |
| **Outputs** | Aggregated metrics, time-series data, KPI snapshots |
| **Dependencies** | All services (consumes all events), Billing Service (revenue metrics) |
| **Events Produced** | None (Analytics is a terminal consumer — it does not produce business events) |
| **Events Consumed** | ALL domain events for aggregation |

---

### 1.10 AI Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Manages all LLM interactions: embedding generation, chat completions, structured extraction, and semantic caching. Acts as a proxy enforcing quotas, semantic caching, and PII redaction before reaching external LLM providers. |
| **Ownership** | `ai.embeddings`, `ai.semantic_cache`, `ai.inference_logs`, `ai.system_prompts` |
| **Inputs** | Text to embed, prompt + context for completion, model config |
| **Outputs** | Vector embeddings, LLM completions, inference cost records |
| **Dependencies** | OpenAI / Anthropic API, Monetization Service (quota check), Identity Service (tenant context) |
| **Events Produced** | `ai.inference_completed`, `ai.embedding_generated`, `ai.budget_warning`, `ai.provider_fallback` |
| **Events Consumed** | `marketplace.listing_created` / `listing_updated` (→ trigger re-embed) |

---

### 1.11 Notification Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Delivers transactional notifications across all channels: in-app (WebSocket), email, and SMS. |
| **Ownership** | `communication.notifications`, `communication.notification_preferences` |
| **Inputs** | Domain events (e.g., `monetization.invoice_paid`), direct dispatch requests |
| **Outputs** | Delivered notifications, read receipts |
| **Dependencies** | Email Provider (Resend/SendGrid), SMS Provider (Twilio), Supabase Realtime |
| **Events Produced** | `notification.delivered`, `notification.failed` |
| **Events Consumed** | Virtually all domain events that have user-visible outcomes |

---

### 1.12 Messaging Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Manages buyer-seller conversations. Persistent, ordered, tenant-scoped message threads. |
| **Ownership** | `communication.conversations`, `communication.messages` |
| **Inputs** | New message payloads, conversation creation requests |
| **Outputs** | Stored messages, realtime WebSocket events, email digests |
| **Dependencies** | Identity Service (participants), Realtime backplane, Trust Service (content scan) |
| **Events Produced** | `communication.message_sent`, `communication.conversation_created` |
| **Events Consumed** | None |

---

### 1.13 CRM & Lead Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Tracks buyer intent signals, manages lead lifecycle, and surfaces AI-scored lead quality to sellers. |
| **Ownership** | `crm.leads`, `crm.lead_activities`, `crm.saved_listings` |
| **Inputs** | User interactions (saved listings, contact form submissions, inquiry messages) |
| **Outputs** | Lead records, AI lead quality scores, seller notifications |
| **Dependencies** | Listing Service, Identity Service, AI Service (scoring), Analytics Service |
| **Events Produced** | `crm.lead_created`, `crm.lead_status_changed`, `crm.lead_scored` |
| **Events Consumed** | `discovery.item_clicked` (→ create implied lead signal) |

---

### 1.14 Billing Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Manages subscription lifecycle, invoice generation, and payment processing via Stripe. |
| **Ownership** | `monetization.ledger_events`, `monetization.invoices`, `platform.subscriptions` |
| **Inputs** | Stripe webhooks, plan upgrade/downgrade requests, manual admin overrides |
| **Outputs** | Invoice records, subscription state, entitlement grants |
| **Dependencies** | Stripe, Company Service, Quota Service |
| **Events Produced** | `monetization.subscription_changed`, `monetization.invoice_generated`, `monetization.payment_received` |
| **Events Consumed** | None (billing is a source, not a sink) |

---

### 1.15 Quota Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Enforces plan-based resource limits in real-time. Prevents tenant over-consumption. |
| **Ownership** | `monetization.quota_usage` (fast-path cache + DB), `platform.subscriptions` (entitlement source) |
| **Inputs** | Resource consumption events (API calls, AI tokens, storage writes) |
| **Outputs** | Allow/Block decisions, quota warning events |
| **Dependencies** | Billing Service (entitlement), Redis (fast cache) |
| **Events Produced** | `monetization.quota_consumed`, `monetization.quota_warned`, `monetization.quota_exceeded`, `monetization.quota_reset` |
| **Events Consumed** | `monetization.subscription_changed` (→ reset quotas on upgrade) |

---

### 1.16 Moderation Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | AI-first content moderation pipeline with human review escalation. Evaluates listings, messages, and user profiles. |
| **Ownership** | `trust.moderation_queue`, `trust.moderation_decisions` |
| **Inputs** | Content entities (text, images), user reports |
| **Outputs** | Moderation decisions (approve/quarantine/reject), listing status updates |
| **Dependencies** | AI Service (content classification), Listing Service (status update), Trust Service (score update) |
| **Events Produced** | `trust.content_quarantined`, `trust.content_approved`, `trust.escalation_created` |
| **Events Consumed** | `marketplace.listing_created`, `communication.message_sent` |

---

### 1.17 Trust Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Maintains composite trust scores for tenants, users, and listings. Detects fraud via behavioral analysis. |
| **Ownership** | `intelligence.trust_scores`, `trust.fraud_alerts`, `trust.behavioral_signals` |
| **Inputs** | Behavioral events (rapid listing creation, IP anomalies), verification events, violation history |
| **Outputs** | Trust scores (0.0–1.0), fraud alerts, automated enforcement actions |
| **Dependencies** | Analytics Service (behavioral baseline), Moderation Service, Identity Service |
| **Events Produced** | `trust.trust_score_updated`, `trust.fraud_detected`, `trust.account_suspended` |
| **Events Consumed** | `marketplace.listing_created`, `identity.session_started`, `moderation.*` |

---

### 1.18 Audit Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Immutable, append-only recording of all sensitive platform actions for compliance and forensic investigation. |
| **Ownership** | `governance.audit_logs` |
| **Inputs** | Triggered by all sensitive operations across all services |
| **Outputs** | Immutable audit records |
| **Dependencies** | All services (write-only) |
| **Events Produced** | None |
| **Events Consumed** | All events produce a corresponding audit record |

---

### 1.19 Support Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Manages tenant support ticket lifecycle, agent assignment, and resolution tracking. |
| **Ownership** | `support.tickets`, `support.ticket_comments` |
| **Inputs** | Ticket creation requests, agent replies, status changes |
| **Outputs** | Ticket records, SLA status, escalation triggers |
| **Dependencies** | Identity Service, Notification Service |
| **Events Produced** | `support.ticket_created`, `support.ticket_resolved`, `support.sla_breached` |
| **Events Consumed** | `tenant.suspended` (→ auto-create support ticket) |

---

### 1.20 Super Admin Service

| Attribute | Specification |
|:---|:---|
| **Purpose** | Platform control plane for operators. Cross-tenant visibility, billing overrides, moderation governance, feature flag management. |
| **Ownership** | `governance.admin_actions`, `governance.feature_flags` |
| **Inputs** | Super Admin API calls (verified via `is_super_admin` JWT claim) |
| **Outputs** | Cross-tenant operational actions, platform config changes |
| **Dependencies** | All services (read-access bypass via admin RLS policies) |
| **Events Produced** | `governance.admin_action_taken` |
| **Events Consumed** | All domain events (passive monitoring) |

---

## SECTION 2 — API CONTRACTS

> **Full API catalog defined in [Spec 09](09-api-contracts.md) and [Spec 23](23-STEP-AC-engineering-constitution.md).**
> The following addendum provides the complete endpoint map with side effects.

### 2.1 Authentication APIs

| Method | Route | Auth | Description | Side Effects |
|:---|:---|:---|:---|:---|
| POST | `/auth/v1/signup` | None | Register new user | Emits `identity.user_registered` |
| POST | `/auth/v1/token` | None | Magic link / OAuth token exchange | Emits `identity.session_started` |
| POST | `/api/auth/context` | Bearer JWT | Set active tenant context | Updates `app_metadata.tenant_id`, forces JWT refresh |
| POST | `/auth/v1/logout` | Bearer JWT | Invalidate session | Emits `identity.session_ended` |
| GET | `/api/auth/me` | Bearer JWT | Current user + active tenant profile | None |

### 2.2 Company / Tenant APIs

| Method | Route | Auth | Auth Role | Description | Side Effects |
|:---|:---|:---|:---|:---|:---|
| POST | `/api/organizations` | Bearer JWT | Any Authenticated | Create new organization (tenant) | Emits `tenant.provisioned`, creates Stripe customer |
| GET | `/api/organizations/:id` | Bearer JWT | Member | Get organization details | None |
| PATCH | `/api/organizations/:id` | Bearer JWT | Admin+ | Update branding, settings | Invalidates tenant brand cache |
| DELETE | `/api/organizations/:id` | Bearer JWT | Owner | Initiate tenant deletion (async) | Emits `tenant.deleted`, triggers GDPR scrub pipeline |
| GET | `/api/organizations/:id/members` | Bearer JWT | Admin+ | List members with roles | None |
| POST | `/api/organizations/:id/members/invite` | Bearer JWT | Admin+ | Invite user to org | Emits `identity.member_invited`, sends invite email |
| PATCH | `/api/organizations/:id/members/:userId` | Bearer JWT | Admin+ | Update member role | Emits `identity.role_changed` |
| DELETE | `/api/organizations/:id/members/:userId` | Bearer JWT | Admin+ | Remove member from org | Emits `identity.member_removed` |

### 2.3 Listing APIs

| Method | Route | Auth | Auth Role | Description | Side Effects |
|:---|:---|:---|:---|:---|:---|
| POST | `/api/listings` | Bearer JWT | Agent+ | Create listing (status=DRAFT) | Quota check → Emits `marketplace.listing_created` → Trust scan triggered |
| GET | `/api/listings` | Bearer/None | Any | List active listings (paginated) | None |
| GET | `/api/listings/:id` | Bearer/None | Any | Get single listing | Emits `discovery.item_impressed` (if authenticated) |
| PATCH | `/api/listings/:id` | Bearer JWT | Listing Owner / Admin | Update listing fields | If content changed → Emits `marketplace.listing_updated` → Re-embed triggered |
| DELETE | `/api/listings/:id` | Bearer JWT | Listing Owner / Admin | Soft-delete listing | Emits `marketplace.listing_archived` |
| POST | `/api/listings/:id/publish` | Bearer JWT | Listing Owner / Admin | Transition DRAFT → PENDING_REVIEW | Trust scan initiated |
| POST | `/api/listings/:id/save` | Bearer JWT | Authenticated | Save/unsave listing to favorites | Emits `crm.listing_saved` |

### 2.4 Search & Discovery APIs

| Method | Route | Auth | Description | Side Effects |
|:---|:---|:---|:---|:---|
| GET | `/api/search` | Bearer/None | Keyword + semantic hybrid search with filters | Emits `discovery.search_executed` |
| GET | `/api/feed` | Bearer JWT | Personalized recommendation feed | Emits `discovery.feed_generated` |
| GET | `/api/listings/:id/similar` | Bearer/None | Semantically similar listings | None |
| POST | `/api/search/suggest` | Bearer/None | Query autocomplete + spell correction | None |

### 2.5 Analytics APIs

| Method | Route | Auth | Auth Role | Description |
|:---|:---|:---|:---|:---|
| GET | `/api/analytics/overview` | Bearer JWT | Admin+ | Tenant KPI summary (MTD) |
| GET | `/api/analytics/listings/:id` | Bearer JWT | Admin+ | Per-listing performance metrics |
| GET | `/api/analytics/team` | Bearer JWT | Admin+ | Team activity metrics |
| GET | `/api/analytics/revenue` | Bearer JWT | Owner | Revenue and billing summary |

### 2.6 Billing APIs

| Method | Route | Auth | Auth Role | Description | Side Effects |
|:---|:---|:---|:---|:---|:---|
| GET | `/api/billing/subscription` | Bearer JWT | Owner/Admin | Current plan + status | None |
| POST | `/api/billing/checkout` | Bearer JWT | Owner | Create Stripe checkout session | Creates Stripe session, redirects to Stripe |
| POST | `/api/billing/portal` | Bearer JWT | Owner | Open Stripe customer portal | Creates Stripe portal session |
| GET | `/api/billing/invoices` | Bearer JWT | Owner/Admin | List historical invoices | None |
| GET | `/api/billing/usage` | Bearer JWT | Owner/Admin | Current period quota usage | None |

### 2.7 Moderation & Trust APIs

| Method | Route | Auth | Auth Role | Description | Side Effects |
|:---|:---|:---|:---|:---|:---|
| POST | `/api/reports` | Bearer JWT | Any | Submit content report | Emits `trust.report_submitted`, creates moderation case |
| GET | `/api/admin/moderation/queue` | Bearer JWT | Super Admin | Platform moderation queue | None |
| POST | `/api/admin/moderation/:caseId/resolve` | Bearer JWT | Super Admin | Resolve moderation case | Emits `trust.content_approved` or `trust.content_quarantined` |

### 2.8 Admin APIs (Super Admin Only)

| Method | Route | Description | Side Effects |
|:---|:---|:---|:---|
| GET | `/api/admin/tenants` | List all tenants with search/filter | None |
| GET | `/api/admin/tenants/:id` | Full tenant details + billing state | None |
| POST | `/api/admin/tenants/:id/suspend` | Suspend tenant | Emits `tenant.suspended` |
| POST | `/api/admin/tenants/:id/reactivate` | Reactivate tenant | Emits `tenant.reactivated` |
| GET | `/api/admin/platform/metrics` | Global platform KPIs | None |
| GET | `/api/admin/audit-logs` | Filtered audit log search | None |
| PATCH | `/api/admin/feature-flags/:key` | Update feature flag value | Invalidates flag cache globally |

---

## SECTION 3 — SERVICE CONTRACTS

### 3.1 Standard Service Contract Template

Every service adheres to the following operational contract:

**Idempotency**: All state-mutating operations accept an `Idempotency-Key` header. Duplicate requests with the same key within a 24-hour window return the original response without side effects.

**Retry Rules**: Services implement exponential backoff for downstream failures: initial delay 100ms, factor 2x, max 5 retries, max delay 30s. After exhaustion, the error is written to `outbox.dead_letter`.

**Caching Rules**:
- Read-heavy, slow-changing data (tenant branding, subscription plan features) → Redis with 5-minute TTL.
- User session data → Redis with 15-minute TTL (matching JWT access token lifetime).
- Quota state → Redis with 60-second TTL; background refresh.
- Listing data → TanStack Query cache client-side; 30-second stale-while-revalidate.

**Concurrency Rules**: Optimistic locking via `updated_at` timestamp comparison for all UPDATE operations on business entities. Conflict results in HTTP 409 with the current server state.

**Rate Limits**: Per the table in Spec 15 §6.1. All limits enforced via Redis sliding window, keyed by `tenant_id:endpoint`.

---

## SECTION 4 — EVENT ARCHITECTURE

> **Full event catalog with payload schemas in [Spec 08](08-event-contracts.md).**

### 4.1 Complete Event Taxonomy

| Domain | Event Name | Producer | Primary Consumers | Retention |
|:---|:---|:---|:---|:---|
| Identity | `identity.user_registered` | Auth Edge Function | Notification, Analytics | 90 days |
| Identity | `identity.session_started` | Auth Edge Function | Trust, Analytics | 30 days |
| Identity | `identity.role_changed` | RBAC Service | Audit, Analytics | 1 year |
| Tenant | `tenant.provisioned` | Company Service | Billing, AI, Analytics | Indefinite |
| Tenant | `tenant.suspended` | Billing / Super Admin | Notification, Support | Indefinite |
| Marketplace | `marketplace.listing_created` | Listing Service | AI (embed), Trust (scan), Analytics | 7 days |
| Marketplace | `marketplace.listing_updated` | Listing Service | AI (re-embed), Discovery | 7 days |
| Marketplace | `marketplace.listing_published` | Trust Service | Discovery, Analytics | 7 days |
| Discovery | `discovery.search_executed` | Search Service | Analytics, Intelligence | 30 days |
| Discovery | `discovery.item_clicked` | Frontend/API | Intelligence, Analytics, Monetization | 90 days |
| AI | `ai.inference_completed` | AI Edge Function | Monetization (billing), Analytics | 90 days |
| AI | `ai.embedding_generated` | AI Edge Function | Discovery (invalidate cache) | 30 days |
| Monetization | `monetization.subscription_changed` | Billing Service | Company, Quota, Analytics | Indefinite |
| Monetization | `monetization.quota_exceeded` | Quota Service | AI Gateway (block), Notification | 30 days |
| Monetization | `monetization.invoice_paid` | Stripe Webhook | Company (reactivate), Notification | Indefinite |
| Trust | `trust.fraud_detected` | Trust Service | Admin (alert), Audit | 1 year |
| Trust | `trust.content_approved` | Moderation Service | Listing (publish), Analytics | 90 days |
| Trust | `trust.content_quarantined` | Moderation Service | Listing (block), Notification | 1 year |
| Governance | `governance.admin_action_taken` | Super Admin Service | Audit | 7 years |

### 4.2 Event Delivery Requirements

- **At-Least-Once Delivery**: Guaranteed via the Transactional Outbox pattern.
- **Ordering**: Per-aggregate ordering guaranteed (Kafka partition key = `tenant_id:entity_id`).
- **Dead Letter Queue**: Events failing after 5 retries are moved to `outbox.dead_letter` and trigger a `trust.alert` for SRE investigation.
- **Schema Validation**: All events are validated against their JSON Schema before publication. Invalid events are rejected at the producer.

---

## SECTION 5 — REALTIME CONTRACTS

### 5.1 Channel Architecture

All Supabase Realtime channels follow the naming convention: `{domain}:{tenant_id}:{entity_type}:{entity_id}`

| Channel | Publisher | Subscribers | Authorization | Payload Contract |
|:---|:---|:---|:---|:---|
| `notifications:{tenant_id}:{user_id}` | Notification Service | The specific user | Verified JWT: `sub` must match `user_id` | `{ type, title, body, action_url, created_at }` |
| `chat:{tenant_id}:conv:{conversation_id}` | Messaging Service | Conversation participants | JWT sub must be in `conversation.participants` | `{ message_id, sender_id, body, sent_at }` |
| `feed:{tenant_id}` | Discovery Service | Tenant members | JWT `tenant_id` claim must match channel `tenant_id` | `{ listing_ids_added[], listing_ids_removed[] }` |
| `analytics:{tenant_id}` | Analytics Service | Tenant Admin+ | JWT `tenant_id` + role `admin` | `{ metric_name, new_value, delta, ts }` |
| `moderation:platform` | Moderation Service | Super Admins only | `is_super_admin = true` | `{ case_id, severity, entity_type, entity_id }` |
| `presence:{tenant_id}:listing:{id}` | Browser Client | Any authenticated user | JWT `tenant_id` must match | `{ user_id, joined_at }` (Presence API) |

### 5.2 Reconnection Rules

- Client uses Supabase Realtime SDK's built-in heartbeat (30s interval).
- On disconnect, exponential backoff reconnect: 1s, 2s, 4s, 8s, max 30s.
- On reconnect, client fetches the "diff" since the last known `created_at` timestamp via standard REST to avoid missing events during the disconnect window.

### 5.3 High-Frequency Events (Broadcast vs Postgres CDC)

Events occurring > 10x/second per entity MUST use the Broadcast channel (ephemeral, no DB write per event):
- Typing indicators in chat
- Live cursor position in collaborative editors
- Auction bid tickers

---

## SECTION 6 — AI CONTRACTS

### 6.1 Embedding Pipeline

| Attribute | Specification |
|:---|:---|
| **Trigger** | `marketplace.listing_created` or `marketplace.listing_updated` (content_changed: true) |
| **Input** | `{ listing_id, tenant_id, title, description }` |
| **Model** | `text-embedding-3-small` (OpenAI), 1536 dimensions |
| **Output** | `vector(1536)` stored in `ai.embeddings` |
| **Latency Target** | < 3 seconds end-to-end (outbox → embedded) |
| **Failure Strategy** | Retry 3x with exponential backoff. Log to `outbox.dead_letter` on failure. Listing remains `PENDING_REVIEW` until embedded. |
| **Observability** | Every embedding call logged to `ai.inference_logs` with `task_type = 'EMBEDDING'` |

### 6.2 Semantic Search

| Attribute | Specification |
|:---|:---|
| **Input** | User natural language query string, active filters |
| **Pipeline** | (1) Embed query (with L1 Redis cache on prompt hash), (2) HNSW ANN search in `ai.embeddings`, (3) Intersect with relational filters via SQL JOIN, (4) Return ranked IDs |
| **Model** | Same embedding model as corpus (`text-embedding-3-small`) |
| **Latency Target** | < 100ms P95 (cache miss), < 20ms P95 (cache hit) |
| **Failure Strategy** | If embedding fails, fall back to trigram full-text search (`pg_trgm`) |

### 6.3 Recommendation Engine

| Attribute | Specification |
|:---|:---|
| **Input** | `user_id`, last 50 interactions, current session context |
| **Pipeline** | (1) Load user embedding from `intelligence.user_embeddings`, (2) Cosine similarity against active listing embeddings, (3) Filter by trust score > 0.5, (4) Re-rank by CTR model, (5) Deduplicate against seen items |
| **Refresh Cycle** | User embedding updated asynchronously after each interaction (5-minute debounce) |
| **Cache Strategy** | Personalized feed cached in Redis per `user_id`, TTL 5 minutes |
| **Failure Strategy** | Serve non-personalized trending listings if user embedding not available |

### 6.4 Lead Scoring

| Attribute | Specification |
|:---|:---|
| **Input** | Lead interaction history (views, saves, messages, time-on-page) |
| **Model** | Logistic regression on behavioral features (fast, interpretable, no GPT needed) |
| **Output** | `quality_score FLOAT (0.0–1.0)`, `intent_class TEXT` (HOT/WARM/COLD) |
| **Trigger** | Scheduled: nightly batch. Real-time: on `crm.lead_status_changed` event. |
| **Storage** | `crm.leads.ai_quality_score`, `crm.leads.intent_class` |

### 6.5 Fraud Detection AI

| Attribute | Specification |
|:---|:---|
| **Input** | Behavioral signals: session frequency, IP, listing creation velocity, price variance |
| **Model** | Isolation Forest (anomaly detection) for baseline + LLM-based content analysis for listing fraud |
| **Output** | `fraud_score FLOAT`, `risk_tier ENUM('LOW','MEDIUM','HIGH','CRITICAL')` |
| **Latency Target** | < 500ms for real-time behavioral check; < 5s for content analysis |
| **Automated Actions** | MEDIUM → Warning. HIGH → Restrict. CRITICAL → Auto-suspend + alert Super Admin |

---

## SECTION 7 — FRONTEND CONTRACTS

### 7.1 Public Marketplace App

| Page | Required APIs | Realtime Channels | Permissions | Rendering Strategy |
|:---|:---|:---|:---|:---|
| `/` (Home Feed) | `GET /api/feed`, `GET /api/listings` | `feed:{tenant_id}` | Anonymous | Static Shell + Streaming RSC |
| `/search` | `GET /api/search`, `GET /api/search/suggest` | None | Anonymous | Server-side rendered |
| `/listings/:slug` | `GET /api/listings/:id`, `GET /api/listings/:id/similar` | `presence:{tenant_id}:listing:{id}` | Anonymous | SSR + Client hydration for presence |
| `/profile` | `GET /api/auth/me` | `notifications:{tenant_id}:{user_id}` | Authenticated | Client component |

### 7.2 Tenant Dashboard

| Page | Required APIs | Realtime Channels | Permissions | Rendering Strategy |
|:---|:---|:---|:---|:---|
| `/dashboard` | `GET /api/analytics/overview` | `analytics:{tenant_id}` | Admin+ | RSC with Suspense |
| `/dashboard/listings` | `GET /api/listings`, `POST /api/listings` | None | Agent+ | CSR with TanStack Query |
| `/dashboard/listings/:id/edit` | `GET /api/listings/:id`, `PATCH /api/listings/:id` | None | Owner / Admin | CSR |
| `/dashboard/team` | `GET /api/organizations/:id/members` | None | Admin+ | RSC |
| `/dashboard/inbox` | `GET /api/conversations`, `GET /api/messages` | `chat:{tenant_id}:conv:*` | Member+ | CSR |
| `/dashboard/analytics` | `GET /api/analytics/*` | `analytics:{tenant_id}` | Admin+ | RSC + client chart components |
| `/dashboard/billing` | `GET /api/billing/*`, `POST /api/billing/checkout` | None | Owner | CSR |
| `/dashboard/settings` | `GET /api/organizations/:id`, `PATCH /api/organizations/:id` | None | Owner | CSR |

### 7.3 Super Admin Console

| Page | Required APIs | Auth Requirement |
|:---|:---|:---|
| `/admin` | `GET /api/admin/platform/metrics` | `is_super_admin = true` |
| `/admin/tenants` | `GET /api/admin/tenants` | Super Admin |
| `/admin/tenants/:id` | `GET /api/admin/tenants/:id`, `POST suspend/reactivate` | Super Admin |
| `/admin/moderation` | `GET /api/admin/moderation/queue` | Super Admin |
| `/admin/billing` | `GET /api/admin/tenants/:id/billing` | Super Admin |
| `/admin/audit-logs` | `GET /api/admin/audit-logs` | Super Admin |
| `/admin/feature-flags` | `GET + PATCH /api/admin/feature-flags` | Super Admin |

---

## SECTION 8 — AUTHORIZATION CONTRACTS

### 8.1 RBAC Permission Matrix

| Resource / Action | super_admin | tenant_owner | tenant_admin | manager | agent | viewer | customer | anon |
|:---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| View own tenant data | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| View any tenant data | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create listing | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Update own listing | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Delete any listing (tenant) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Invite team members | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View analytics | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| View billing | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Change subscription plan | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Use AI features | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ (public) | ❌ |
| Access Super Admin console | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Suspend any tenant | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View audit logs (own tenant) | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| View all audit logs | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Submit content report | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Resolve moderation case | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage feature flags | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## SECTION 9 — INTEGRATION CONTRACTS

### 9.1 Supabase Integration

| Responsibility | Implementation |
|:---|:---|
| **Auth** | GoTrue. JWT with 15-minute access token, 30-day refresh token rotation. |
| **Database** | PostgreSQL 15+. All queries via PostgREST or typed Supabase client. No raw SQL from frontend. |
| **Security** | RLS enabled and `FORCE ROW LEVEL SECURITY` on all tenant-data tables. |
| **Failure Model** | All read failures return stale cache data with a `stale: true` response header. All write failures return 503 after PgBouncer pool exhaustion. |
| **Rate Limits** | Per Spec 15 §6.1. |
| **Secrets** | Supabase Vault for all database-level secrets (OpenAI key, Stripe key). |

### 9.2 Stripe Integration

| Responsibility | Implementation |
|:---|:---|
| **Data Flow** | Stripe Customer ↔ `platform.tenants`. Stripe Subscription ↔ `platform.subscriptions`. |
| **Webhook Ingestion** | Supabase Edge Function. Signature validated with `stripe.webhooks.constructEvent()` using webhook secret from Vault. |
| **Idempotency** | Every processed webhook event ID is stored in `monetization.processed_webhook_events`. Duplicate event → 200 OK, no action. |
| **Failure Model** | If DB write fails after webhook, return HTTP 500 to Stripe. Stripe retries with exponential backoff for up to 72 hours. |
| **Secrets** | `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` stored in Supabase Vault, injected into Edge Function env. |

### 9.3 OpenAI Integration

| Responsibility | Implementation |
|:---|:---|
| **Data Flow** | All OpenAI calls proxied through `ai-gateway` Edge Function. Never called directly from Next.js browser code. |
| **Pre-Flight** | Token quota check → PII redaction proxy → Prompt injection classifier → LLM call |
| **Post-Flight** | DLP output scanner → Usage logging to `ai.inference_logs` → Metering event to `outbox.events` |
| **Failure Model** | HTTP 429 (rate limit) → Exponential backoff retry, 3x. Provider error → Fallback to secondary model (Claude Haiku). Circuit breaker opens after 10 failures in 60 seconds. |
| **Rate Limits** | Enforced at tenant level via Quota Service before reaching OpenAI. |
| **Secrets** | `OPENAI_API_KEY` in Supabase Vault. |

### 9.4 Email Provider (Resend)

| Responsibility | Implementation |
|:---|:---|
| **Trigger** | Notification Service reads events and dispatches to Resend API. |
| **Templates** | React Email components rendered server-side, sent as HTML. Templates versioned in `communication.email_templates`. |
| **Failure Model** | If Resend API fails, event remains in `outbox.events` with `status = PENDING` for retry. |
| **Unsubscribe** | One-click unsubscribe link (RFC 8058 compliant) in every transactional email. |

---

## SECTION 10 — OBSERVABILITY CONTRACTS

### 10.1 Logging Standards

- **Format**: Structured JSON logs (no free-text logs in production).
- **Required Fields**: `timestamp`, `level`, `service`, `trace_id`, `tenant_id` (if applicable), `user_id` (if applicable), `message`.
- **Levels**: `DEBUG` (development only), `INFO` (request lifecycle, business events), `WARN` (recoverable errors, rate limit hits), `ERROR` (unrecoverable, requires alert).
- **Retention**: 30 days in hot storage (Datadog/Logflare), 1 year in cold storage (S3).

### 10.2 Metrics Standards

| Metric | Type | Labels | Alert Threshold |
|:---|:---|:---|:---|
| `api.request.duration_ms` | Histogram | `route`, `method`, `status` | P95 > 500ms → Warning |
| `db.query.duration_ms` | Histogram | `table`, `operation` | P95 > 100ms → Warning |
| `ai.inference.duration_ms` | Histogram | `model`, `task_type` | P95 > 3000ms → Warning |
| `ai.tokens.consumed` | Counter | `tenant_id`, `model` | N/A (quota tracking) |
| `realtime.connections.active` | Gauge | `tenant_id` | > 10,000 → Warning |
| `outbox.events.pending` | Gauge | None | > 1,000 → Warning |
| `outbox.events.dead_letter` | Counter | `event_type` | > 0 → Critical |

### 10.3 Tracing Standards

- **Standard**: OpenTelemetry W3C Trace Context.
- **Propagation**: `traceparent` header propagated from Next.js → Edge Function → Postgres (via session variable `request.headers`).
- **Sampling**: 100% sampling for errors; 10% sampling for healthy requests.

### 10.4 Audit Standards

Every event in `governance.audit_logs` MUST capture:
```
actor_id, actor_type, tenant_id, action_category, action_type,
target_entity, target_id, before_state (JSONB, PII masked),
after_state (JSONB, PII masked), ip_hash, trace_id, occurred_at
```
The table is protected by Postgres `RULE` preventing UPDATE or DELETE by any role.

---

## SECTION 11 — BACKEND IMPLEMENTATION READINESS

### 11.1 Backend Work Packages (Ordered by Dependency)

| # | Work Package | Depends On | Complexity | Effort |
|:---|:---|:---|:---|:---|
| BE-01 | Database Foundation (Migrations 001–008) | None | High | 3 days |
| BE-02 | RLS Policy Suite (all tables) | BE-01 | High | 2 days |
| BE-03 | Supabase Auth + JWT context injection | BE-01 | Medium | 1 day |
| BE-04 | Organization / Tenant CRUD APIs | BE-01, BE-02, BE-03 | Medium | 2 days |
| BE-05 | Listing CRUD + Status Machine APIs | BE-04 | Medium | 2 days |
| BE-06 | Outbox Pattern + Processor Edge Function | BE-01 | High | 2 days |
| BE-07 | AI Embedding Edge Function | BE-06 | High | 1 day |
| BE-08 | Semantic Search RPC + Search API | BE-07 | High | 2 days |
| BE-09 | Stripe Webhook Edge Function + Billing APIs | BE-04 | High | 3 days |
| BE-10 | Quota Enforcement (Redis Cache Layer) | BE-09 | High | 2 days |
| BE-11 | Trust Scoring + Fraud Detection | BE-06 | High | 3 days |
| BE-12 | Moderation Pipeline Edge Function | BE-11 | Medium | 2 days |
| BE-13 | Analytics Ingestion + Rollup Jobs | BE-06 | Medium | 2 days |
| BE-14 | Realtime Channel Authorization | BE-02, BE-03 | Medium | 1 day |
| BE-15 | Super Admin API Suite | BE-01–BE-14 | Low | 2 days |
| BE-16 | Notification Service (Email + In-App) | BE-06 | Medium | 2 days |

**Total Estimated Effort**: ~32 engineering days (6.5 weeks, 1 senior engineer)

### 11.2 Acceptance Criteria (Global)

1. All SQL migrations run idempotently via `supabase db push`.
2. RLS cross-tenant isolation test suite passes (Tenant A cannot read Tenant B's data).
3. All API endpoints return structured error responses per the Error Contract.
4. P95 latency SLOs met under simulated load (10 concurrent users per endpoint).
5. All events produced are validated against their JSON Schema before outbox insertion.

---

## SECTION 12 — FRONTEND IMPLEMENTATION READINESS

### 12.1 Frontend Work Packages (Ordered by Dependency)

| # | Work Package | Depends On | Complexity | Acceptance Criteria |
|:---|:---|:---|:---|:---|
| FE-01 | Next.js 15 App Router Setup + Route Groups | None | Low | Three route groups isolated, middleware routing verified |
| FE-02 | Supabase Auth + Zustand Auth Store | FE-01, BE-03 | Medium | Login/Logout cycle works, JWT refresh handled |
| FE-03 | Tenant Context Selection UI + JWT injection | FE-02, BE-04 | Medium | User can switch active workspace |
| FE-04 | Shared Component Library (shadcn + TailwindCSS v4) | FE-01 | Medium | DataTable, StatCard, FormField, ErrorBoundary complete |
| FE-05 | Tenant Dashboard Layout + Navigation | FE-03, FE-04 | Low | Sidebar, header, dark/light mode working |
| FE-06 | Listings CRUD Pages + Media Upload | FE-05, BE-05 | Medium | Create, edit, publish listing end-to-end |
| FE-07 | Analytics Dashboard Pages | FE-05, BE-13 | Medium | Charts render with real data, realtime updates |
| FE-08 | Team Management Pages | FE-05, BE-04 | Low | Invite, role change, remove member |
| FE-09 | Billing Pages (Plan + Invoices + Usage) | FE-05, BE-09 | Medium | Checkout flow, invoice list, quota bars |
| FE-10 | Inbox / Messaging Pages | FE-05, BE-14 | High | Real-time chat with Supabase Realtime |
| FE-11 | Super Admin Console | FE-02, BE-15 | Medium | Tenant list, moderation queue, feature flags |
| FE-12 | Public Marketplace Feed + Search | FE-04, BE-08 | High | Personalized feed, semantic search, listing detail |
| FE-13 | AI UX Layer (Insights + Recommendations) | FE-12, BE-07 | High | AI widgets, graceful degradation |
| FE-14 | Notification Bell + Realtime Presence | FE-02, BE-14 | Medium | Live unread count, presence on LDP |

---

## SECTION 13 — STEP AD HANDOFF PACKAGE

### 13.1 Edge Functions Required for Implementation

| Function Name | Trigger | Responsibility |
|:---|:---|:---|
| `auth-context` | HTTP POST (client) | Validate JWT, inject `tenant_id` + role into `app_metadata`, trigger session refresh |
| `outbox-processor` | DB Webhook (INSERT on `outbox.events`) + Cron (every 60s) | Read pending outbox events, route to handlers, update status |
| `ai-embed` | Triggered by `outbox-processor` on `listing_created/updated` | Call OpenAI Embedding API, store in `ai.embeddings` |
| `ai-inference` | HTTP POST (client) | Quota check → PII redact → LLM call → DLP scan → Stream response → Log usage |
| `stripe-webhook` | HTTP POST (Stripe) | Validate signature → idempotency check → update `ledger_events` + `subscriptions` |
| `telemetry-ingest` | HTTP POST (client batch) | Validate JWT → sanitize payload → bulk insert `analytics.raw_events` |
| `moderation-scan` | Triggered by `outbox-processor` on `listing_created` | Call OpenAI Moderation API → Update moderation queue |
| `trust-scorer` | Triggered by `outbox-processor` on `fraud.*` events | Recalculate trust score → Update `intelligence.trust_scores` |

### 13.2 Background Jobs (pg_cron Schedule)

| Job Name | Schedule (Cron) | Responsibility |
|:---|:---|:---|
| `daily_analytics_rollup` | `5 0 * * *` (00:05 UTC) | Aggregate `raw_events` into `daily_metrics` materialized views |
| `quota_reset_monthly` | `0 0 1 * *` (1st of month) | Reset `quota_usage` for tenants on monthly billing cycle |
| `embedding_refresh_check` | `0 2 * * 0` (Sunday 02:00) | Identify listings with embeddings > 30 days old, re-queue |
| `trust_score_decay` | `0 3 * * *` (03:00 daily) | Apply decay factor to trust scores of inactive tenants |
| `outbox_cleanup` | `0 4 * * *` (04:00 daily) | Archive `PROCESSED` outbox events older than 7 days |
| `cold_storage_archive` | `0 5 * * *` (05:00 daily) | Move `raw_events` partitions older than 30 days to S3 |

### 13.3 Production Readiness Checklist

- [ ] All 15 database schemas created and validated
- [ ] RLS cross-tenant isolation suite: 100% pass
- [ ] All Edge Functions deployed with Vault secrets injected
- [ ] Supabase Realtime publications scoped to required tables only
- [ ] `pg_cron` jobs registered and verified
- [ ] Stripe webhook endpoint verified in Stripe Dashboard
- [ ] OpenAI API key stored in Vault; not in `.env` files
- [ ] HNSW index built on `ai.embeddings` and memory usage verified < 80% available RAM
- [ ] P95 latency baselines measured for all critical paths
- [ ] Checklist script `python3 .agent/scripts/checklist.py .` returns 0 failures
- [ ] All domain events validated against their JSON Schema in CI
- [ ] RLS verification test runs in CI on every pull request
