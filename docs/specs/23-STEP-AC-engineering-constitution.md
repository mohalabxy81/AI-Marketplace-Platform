# STEP AC — PLATFORM IMPLEMENTATION MASTER SPECIFICATION
# THE ENGINEERING CONSTITUTION

> **Document Class**: Engineering Constitution — Implementation Authority  
> **Predecessor**: STEP AB (Supabase Production Blueprint + All Architecture Phases)  
> **Status**: Execution-Ready — Enterprise-Grade  
> **Scope**: AI-Native Multi-Tenant Marketplace Operating System  
> **Tenancy Scale**: 100,000+ tenants  
> **Version**: 1.0.0  
> **Date**: 2026-05-30  
> **Authority**: This document supersedes all prior implementation guidance and becomes the sole engineering reference for all implementation work.

---

> **CONSTITUTIONAL SEAL**: All previous phases are APPROVED and FROZEN.  
> This document transforms approved architecture into executable engineering contracts.  
> NO redesign. NO regeneration. EXECUTION ONLY.

---

## DOCUMENT MAP

| Section | Title | Status |
|:--------|:------|:-------|
| §1 | Platform Module Map | ✅ Complete |
| §2 | API Contracts | ✅ Complete |
| §3 | Service Contracts | ✅ Complete |
| §4 | Event Architecture | ✅ Complete |
| §5 | Realtime Contracts | See Part 2 |
| §6 | AI Contracts | See Part 2 |
| §7 | Frontend Contracts | See Part 2 |
| §8 | Authorization Contracts | See Part 2 |
| §9 | Integration Contracts | See Part 3 |
| §10 | Observability Contracts | See Part 3 |
| §11 | Backend Implementation Readiness | See Part 3 |
| §12 | Frontend Implementation Readiness | See Part 3 |
| §13 | STEP AD Handoff Package | See Part 3 |

---

# SECTION 1 — PLATFORM MODULE MAP

## 1.0 Decomposition Philosophy

The platform is decomposed into **24 bounded service modules** organized across 3 architectural tiers:

```
TIER 1 — KERNEL MODULES (Zero AI dependency; must remain operational at all times)
  Identity · Tenant · Organization · Team · RBAC · Billing · Subscription · Quota · Audit · Super Admin

TIER 2 — MARKETPLACE MODULES (Core business logic; AI-enhanced but not AI-dependent)
  Listing · Media · Lead · CRM · Moderation · Trust · Support · Notification

TIER 3 — COGNITIVE MODULES (AI-native; graceful degradation required)
  Search · Recommendation · Analytics · AI · Messaging · Realtime
```

Cross-tier communication rule: **Tier 1 never imports from Tier 3.** Tier 3 reads from Tier 2 via snapshots only. All cross-tier state synchronization flows through the Event Mesh.

---

## 1.1 MODULE: Identity Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Manages all authentication, authorization, session lifecycle, MFA, API key issuance, and cryptographic identity claims for all platform users |
| **Ownership** | Schema: `auth` — sole write authority |
| **Tier** | Kernel (Tier 1) |

**Inputs:**
- Registration requests (email, password, OAuth token, SAML assertion)
- Login credentials
- MFA verification codes
- Token refresh requests
- API key creation requests
- Password reset flows
- Email/phone verification codes

**Outputs:**
- JWT access tokens (RS256, 15-min TTL) containing: `user_id`, `tenant_id`, `org_id`, `role`, `scopes`, `plan_tier`, `email_verified`, `mfa_verified`
- Opaque refresh tokens (30-day TTL, rotating)
- JWKS public key endpoint (cached 1 hour)
- API key prefix + hashed credential pairs

**Dependencies:**
- Supabase Auth (managed identity provider)
- Redis (session invalidation cache, brute-force counters)
- Email Provider (verification, password reset)
- SMS Provider (MFA via SMS)

**Events Produced:**
- `identity.user_registered` — on successful registration
- `identity.user_login_success` — on successful login
- `identity.user_login_failed` — on failed attempt (with brute-force counter increment)
- `identity.session_revoked` — on logout or security revocation
- `identity.mfa_enrolled` — on MFA device registration
- `identity.api_key_created` — on API key issuance
- `identity.api_key_revoked` — on API key revocation
- `identity.password_reset_completed` — on password change via reset flow
- `identity.email_verified` — on email verification success

**Events Consumed:**
- None (Identity is an event source, not a consumer)

**Business Rules:**
- JWT must contain `tenant_id` claim injected from `tenant_config.tenant_members` at login
- Brute-force: 5 failed attempts → 15-min lockout per IP + account-level alert
- Password minimum: 8 chars, 1 uppercase, 1 number, 1 special character
- Email verification required before tenant provisioning
- MFA backup codes: 10 codes, each single-use
- Session revocation must propagate to Redis within 100ms (for real-time invalidation checking)

---

## 1.2 MODULE: Company Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Manages company/developer organization profiles within the marketplace — creation, verification, branding, trust scoring, and public presence |
| **Ownership** | Schema: `marketplace.companies` |
| **Tier** | Marketplace (Tier 2) |

**Inputs:**
- Company registration requests
- Profile update requests
- Logo/media upload events (from Media Service)
- Trust score update events (from Trust Service)
- Verification document submissions

**Outputs:**
- Company profile objects (public and private views)
- Company verification status
- Company trust score (read-through from Trust Service)
- Company listing portfolio references

**Dependencies:**
- Identity Service (user_id ownership validation)
- Tenant Service (tenant_id scoping)
- Media Service (logo, cover image processing)
- Trust Service (trust score reads)

**Events Produced:**
- `company.created` — on new company registration
- `company.verified` — on successful KYB verification
- `company.suspended` — on trust/moderation action
- `company.profile_updated` — on significant profile change

**Events Consumed:**
- `trust.trust_score_updated` — to update cached trust score on company profile
- `moderation.decision_made` — to update company verification status

---

## 1.3 MODULE: Organization Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Top-level billing and legal entity management — the organizational wrapper above tenants, managing multi-tenant hierarchies, invoicing entities, and KYC state |
| **Ownership** | Schema: `tenant_config.organizations` |
| **Tier** | Kernel (Tier 1) |

**Inputs:**
- Organization creation requests
- KYC document submissions
- Billing information updates
- Subscription plan purchases

**Outputs:**
- Organization objects with billing state
- KYC status and verification level
- Organization-level aggregated usage metrics
- Multi-tenant seat counts

**Dependencies:**
- Identity Service (owner user_id)
- Billing Service (invoice aggregation)
- External KYC Provider (document verification)

**Events Produced:**
- `organization.created` — on new org registration
- `organization.kyc_verified` — on KYC completion
- `organization.suspended` — on billing failure or fraud detection
- `organization.closed` — on account termination

**Events Consumed:**
- `billing.invoice_payment_failed` — triggers org suspension warning
- `trust.fraud_detected` — triggers org-level risk review

---

## 1.4 MODULE: Team Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Manages team structure within tenant workspaces — member groupings, team-level permissions, project assignments, and collaborative workspace organization |
| **Ownership** | Schema: `tenant_config.workspaces`, `tenant_config.tenant_members` |
| **Tier** | Kernel (Tier 1) |

**Inputs:**
- Team creation requests
- Member invitation flows
- Role assignment changes
- Team dissolution requests

**Outputs:**
- Team membership lists
- Workspace access grants
- Invitation tokens and URLs
- Member activity summaries

**Dependencies:**
- Identity Service (user identity validation)
- RBAC Service (role enforcement)
- Notification Service (invitation delivery)

**Events Produced:**
- `team.member_invited` — on invitation send
- `team.member_joined` — on invitation acceptance
- `team.member_removed` — on removal or departure
- `team.role_changed` — on role modification

**Events Consumed:**
- `identity.user_registered` — to match pending invitations to new registrants

---

## 1.5 MODULE: RBAC Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Role-Based Access Control enforcement — centralized permission matrix evaluation, JWT claim validation, scope enforcement, and dynamic permission overrides |
| **Ownership** | Runtime service (no dedicated schema; reads from `tenant_config` and JWT claims) |
| **Tier** | Kernel (Tier 1) |

**Inputs:**
- JWT access tokens (for role/scope extraction)
- Permission check requests (resource + action + subject)
- Role assignment changes (from Team Service)

**Outputs:**
- Boolean permission decisions (allow/deny)
- Computed permission sets per user+tenant context
- Audit entries for permission denials

**Dependencies:**
- Identity Service (JWT validation)
- Tenant Service (plan-based feature gates)

**Events Produced:**
- `rbac.permission_denied` — on access denial (fed to audit log)

**Events Consumed:**
- `team.role_changed` — to invalidate cached permission sets

**Permission Evaluation Order:**
1. JWT signature validation
2. Tenant membership verification
3. Role-level baseline permissions
4. Permission overrides (JSONB per membership record)
5. Plan-level feature gates (e.g., "analytics" requires growth+ plan)
6. Resource ownership check (can only edit own listings)

---

## 1.6 MODULE: Listing Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Core marketplace catalog management — listing lifecycle (draft → active → archived), versioning, attribute management, status transitions, and catalog integrity |
| **Ownership** | Schema: `marketplace.listings`, `marketplace.listing_versions`, `marketplace.listing_status_transitions` |
| **Tier** | Marketplace (Tier 2) |

**Inputs:**
- Listing creation requests
- Listing update requests
- Status transition commands (publish, pause, archive)
- Bulk operations (import CSV, batch publish)
- Moderation decisions (from Moderation Service via events)

**Outputs:**
- Listing objects (full, summary, and public variants)
- Version history snapshots
- Status transition records
- Listing catalog pagination results

**Dependencies:**
- Identity/RBAC Service (ownership + permission checks)
- Media Service (media references)
- Moderation Service (review queue trigger)
- AI Service (embedding generation trigger via event)
- Billing Service (listing quota enforcement)

**Events Produced:**
- `listing.created` — triggers moderation scan + embedding generation
- `listing.updated` — triggers re-embedding if content changed
- `listing.published` — triggers discovery index refresh
- `listing.paused` — triggers discovery candidate removal
- `listing.archived` — triggers cleanup cascade (favorites, alerts, recommendations)
- `listing.status_changed` — generic lifecycle event for audit

**Events Consumed:**
- `moderation.decision_made` — to update listing status (approved/rejected/quarantined)
- `ai.embedding_generated` — to mark listing as search-indexed

---

## 1.7 MODULE: Media Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Manages all media asset lifecycle — upload orchestration, image/video processing, CDN distribution, moderation pre-screening, and storage quota enforcement |
| **Ownership** | Schema: `marketplace.listing_media`; Storage: Supabase Storage buckets |
| **Tier** | Marketplace (Tier 2) |

**Inputs:**
- Presigned upload requests (from client)
- Upload completion notifications (from Storage)
- Media metadata updates (alt text, ordering, primary flag)
- Media deletion requests

**Outputs:**
- Presigned upload URLs (short-lived, 15 min)
- CDN-optimized URLs (WebP, AVIF, responsive sizes)
- Thumbnail URLs
- Media metadata records

**Dependencies:**
- Supabase Storage (blob storage backend)
- CDN Provider (image optimization + delivery)
- Moderation Service (image safety pre-screening)
- Billing Service (storage quota enforcement)

**Events Produced:**
- `media.uploaded` — on successful upload completion
- `media.processed` — on CDN optimization completion
- `media.moderation_flagged` — on safety scan failure
- `media.deleted` — on media removal

**Events Consumed:**
- `listing.archived` — triggers cascade deletion of orphaned media

**Processing Pipeline per Upload:**
1. Validate MIME type (allow: jpeg, png, webp, mp4, pdf)
2. Enforce file size limits (image: 20MB, video: 500MB, document: 50MB)
3. Generate UUID storage path: `{tenant_id}/{listing_id}/{uuid}.{ext}`
4. Trigger async image optimization (WebP conversion, 4 responsive sizes)
5. Trigger async safety scan via Moderation Service
6. Return CDN URL on completion

---

## 1.8 MODULE: Search Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | 4-stage discovery pipeline — vector retrieval, candidate filtering, light ranking, neural re-ranking, exploration/exploitation — delivering sub-50ms personalized search results |
| **Ownership** | Schema: `search_index.*` |
| **Tier** | Cognitive (Tier 3) |

**Inputs:**
- Search queries (text, filters, sort preferences)
- Feed generation requests (personalized, anonymous)
- Typeahead requests
- Clickstream interaction signals

**Outputs:**
- Ranked listing result sets (with explanation metadata)
- Search facets (categories, price ranges, tags)
- Typeahead suggestions
- Feed generation records

**Dependencies:**
- AI Service (query embedding generation, neural re-ranking)
- Personalization Service (user preference vectors)
- Recommendation Service (cross-sell signals)
- Trust Service (trust score signals)
- Billing Service (promoted listing bid signals)

**Events Produced:**
- `search.query_executed` — on every search request
- `search.feed_generated` — on every feed generation
- `search.zero_results` — when query returns no candidates (important for catalog gap analysis)

**Events Consumed:**
- `listing.published` — triggers candidate index refresh
- `listing.archived` — triggers candidate removal
- `ai.embedding_generated` — marks candidate as vector-searchable
- `trust.trust_score_updated` — updates ranking signals
- `billing.campaign_activated` — updates bid modifier in ranking features

**Latency Budget:**
- Stage 1 (vector retrieval): ≤15ms
- Stage 2 (light ranking): ≤10ms
- Stage 3 (neural re-ranking): ≤20ms
- Stage 4 (exploration): ≤5ms
- **Total P99 target**: ≤50ms

---

## 1.9 MODULE: Recommendation Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Generates personalized recommendation snapshots — user-based collaborative filtering, item-based similarity, trending surfaces, cross-sell suggestions, and new listing exploration |
| **Ownership** | Schema: `recommendations.*` |
| **Tier** | Cognitive (Tier 3) |

**Inputs:**
- User behavior profiles (from Personalization Service)
- Listing catalog snapshots (from Marketplace via materialized views)
- Feedback signals (clicks, dismissals, conversions on recommendation surfaces)

**Outputs:**
- Per-user recommendation snapshots (refreshed every 4h)
- Item-to-item similarity graph (top-20 per listing, refreshed weekly)
- Trending listings snapshots (hourly, daily, weekly)
- Cross-sell candidate sets

**Dependencies:**
- Personalization Service (user behavior profiles)
- AI Service (embedding comparisons for item similarity)
- Search Service (candidate pool)

**Events Produced:**
- `recommendation.snapshot_generated` — on recommendation rebuild
- `recommendation.feedback_received` — on user interaction with recommendation surface

**Events Consumed:**
- `listing.published` — triggers item similarity recomputation
- `listing.archived` — removes from all recommendation snapshots
- `personalization.profile_updated` — triggers user recommendation refresh

---

## 1.10 MODULE: Analytics Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | High-throughput telemetry ingestion, KPI aggregation, funnel analysis, cohort retention, revenue attribution, and tenant-facing dashboard data delivery |
| **Ownership** | Schema: `analytics.*` (PostgreSQL aggregates) + ClickHouse (raw events) |
| **Tier** | Cognitive (Tier 3) |

**Inputs:**
- All platform events via Event Mesh (read-only consumer)
- Clickstream events (via dedicated ingestion endpoint)
- Scheduled aggregation jobs (hourly, daily, weekly)

**Outputs:**
- Dashboard KPI responses
- Time-series data
- Funnel conversion reports
- Cohort retention tables
- AI usage reports
- Revenue attribution reports
- Tenant health scores (for Super Admin)

**Dependencies:**
- ClickHouse (raw event storage and OLAP queries)
- Kafka (event stream consumption)
- PostgreSQL `analytics` schema (pre-aggregated snapshots)

**Events Produced:**
- None (Analytics is a pure consumer; it does not produce business events)

**Events Consumed:**
- ALL events from ALL domains (pattern: `#` wildcard subscriber)

---

## 1.11 MODULE: AI Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Unified AI inference gateway — LLM completions, embedding generation, semantic caching, token quota enforcement (Token Guard), provider failover, and AI governance |
| **Ownership** | Schema: `ai_ops.*` |
| **Tier** | Cognitive (Tier 3) — but Token Guard is Tier 1 |

**Inputs:**
- Chat completion requests
- Embedding generation requests
- Prompt template execution requests
- Token quota check requests

**Outputs:**
- Chat completion responses (streaming + non-streaming)
- Embedding vectors (1536-dim, text-embedding-3-small)
- Cached responses (semantic similarity ≥0.96)
- Token usage records
- Provider health status

**Dependencies:**
- OpenAI API (primary provider)
- Anthropic API (fallback provider)
- Redis (semantic cache, token bucket state)
- Billing Service (quota enforcement sync)

**Events Produced:**
- `ai.inference_completed` — on every successful inference
- `ai.embedding_generated` — on embedding completion (consumed by Search + Recommendation)
- `ai.cache_hit` — on semantic cache hit
- `ai.quota_exceeded` — when tenant token budget exhausted
- `ai.provider_degraded` — on upstream provider health failure
- `ai.moderation_flagged` — when AI safety filter blocks a request

**Events Consumed:**
- `billing.quota_reset` — to reset token bucket counters at billing period boundary
- `listing.created` — triggers automatic listing embedding generation

---

## 1.12 MODULE: Notification Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Multi-channel notification delivery — in-app inbox, email, push, SMS — with template management, delivery tracking, preference enforcement, and deduplication |
| **Ownership** | Schema: `notifications.*` |
| **Tier** | Marketplace (Tier 2) |

**Inputs:**
- Notification trigger events from all domains (via Event Mesh)
- Template management requests (from Super Admin)
- Preference update requests (from users)

**Outputs:**
- In-app notification objects (for inbox display)
- Email deliveries (via Email Provider integration)
- Push notifications (via push provider)
- SMS messages (via SMS Provider)
- Delivery status records

**Dependencies:**
- Event Mesh (trigger source)
- Email Provider (SendGrid/Postmark)
- Push Provider (FCM/APNs)
- SMS Provider (Twilio)

**Events Produced:**
- `notification.delivered` — on successful delivery
- `notification.failed` — on delivery failure (with retry metadata)
- `notification.read` — on in-app notification mark-as-read

**Events Consumed:**
- `listing.published` — notifies watchers and saved search alerts
- `lead.created` — notifies assigned agent
- `moderation.decision_made` — notifies listing owner
- `billing.invoice_generated` — notifies billing contact
- `team.member_invited` — delivers invitation email
- `ai.quota_exceeded` — notifies tenant admin

---

## 1.13 MODULE: Messaging Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Real-time buyer-seller direct messaging — conversation lifecycle, message threading, read receipts, typing indicators, message moderation, and conversation archival |
| **Ownership** | Schema: `conversations.*`, `messages.*` |
| **Tier** | Marketplace (Tier 2) |

**Inputs:**
- Message send requests
- Conversation creation requests
- Read receipt confirmations
- Typing indicator signals
- Moderation scan completions

**Outputs:**
- Message objects
- Conversation objects
- Unread count badges
- Read receipt states
- Typing presence states

**Dependencies:**
- Identity Service (participant validation)
- Supabase Realtime (live message delivery)
- Moderation Service (message content scanning)
- AI Service (optional: AI-assisted reply suggestions)

**Events Produced:**
- `messaging.message_sent` — on message creation
- `messaging.conversation_started` — on new conversation
- `messaging.message_read` — on read receipt

**Events Consumed:**
- `moderation.message_flagged` — to quarantine flagged messages

---

## 1.14 MODULE: CRM Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Customer relationship management — contact management, interaction timeline, lead pipeline visibility, activity logging, and tenant-level CRM data exports |
| **Ownership** | Schema: `marketplace.leads` (CRM view) |
| **Tier** | Marketplace (Tier 2) |

**Inputs:**
- Lead status update requests
- Contact note creation requests
- Pipeline stage change requests
- Activity log entries

**Outputs:**
- CRM contact objects
- Lead pipeline views
- Activity timelines
- Export CSV/JSON packages

**Dependencies:**
- Lead Service (underlying lead data)
- Messaging Service (conversation references)
- AI Service (optional: AI-generated contact summaries)

**Events Produced:**
- `crm.lead_stage_changed` — on pipeline progression
- `crm.contact_note_added` — on note creation

**Events Consumed:**
- `lead.created` — to create CRM contact record
- `messaging.conversation_started` — to link conversation to CRM contact

---

## 1.15 MODULE: Lead Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Lead capture, assignment routing, AI-powered lead scoring, qualification tracking, and conversion attribution |
| **Ownership** | Schema: `marketplace.leads` |
| **Tier** | Marketplace (Tier 2) |

**Inputs:**
- Lead form submissions (from listing detail pages)
- Anonymous lead captures (with optional email)
- Agent assignment requests
- Lead status updates (new → contacted → qualified → converted/lost)

**Outputs:**
- Lead objects (with AI-computed score)
- Lead assignment records
- Conversion attribution data
- Lead performance reports

**Dependencies:**
- Listing Service (listing context)
- AI Service (lead scoring via LLM analysis)
- Notification Service (new lead alerts)
- Analytics Service (conversion tracking)

**Events Produced:**
- `lead.created` — triggers agent notification + AI scoring
- `lead.assigned` — notifies assigned agent
- `lead.converted` — triggers revenue attribution in Analytics
- `lead.scored` — on AI scoring completion

**Events Consumed:**
- `ai.inference_completed` — (for lead scoring results)

---

## 1.16 MODULE: Billing Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Financial system of record — subscription management, usage metering, invoice generation, write-only financial ledger, Stripe synchronization, credit management, and promoted listing campaign billing |
| **Ownership** | Schema: `billing_ledger.*` |
| **Tier** | Kernel (Tier 1) |

**Inputs:**
- Subscription creation/change requests
- Stripe webhook events (payment_intent, invoice, subscription)
- Usage metering events (from all domains via Event Mesh)
- Promoted listing bid configurations
- Credit purchase requests

**Outputs:**
- Invoice objects
- Subscription status
- Usage meter readings
- Ledger entries (append-only)
- Payment method records
- Campaign billing reports

**Dependencies:**
- Stripe (payment processing, subscription management)
- Event Mesh (usage event consumption)
- Notification Service (invoice delivery, payment alerts)
- Quota Service (limit enforcement sync)

**Events Produced:**
- `billing.subscription_created` — on plan activation
- `billing.subscription_changed` — on plan upgrade/downgrade
- `billing.subscription_canceled` — on cancellation
- `billing.invoice_generated` — on invoice creation
- `billing.invoice_paid` — on successful payment
- `billing.invoice_payment_failed` — on payment failure
- `billing.quota_reset` — at billing period boundary (consumed by AI Service)
- `billing.campaign_activated` — on promoted listing campaign start
- `billing.campaign_exhausted` — on campaign budget depletion

**Events Consumed:**
- ALL `ai.inference_completed` events → token metering
- ALL `media.uploaded` events → storage metering
- `listing.created` → listing count metering
- `stripe.webhook.*` → payment state synchronization

---

## 1.17 MODULE: Subscription Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Subscription plan lifecycle management — trial periods, plan transitions, grandfathering, cancellation flows, and reactivation |
| **Ownership** | Schema: `billing_ledger.subscriptions`, `tenant_config.tenant_subscriptions` |
| **Tier** | Kernel (Tier 1) |

**Inputs:**
- Plan selection requests
- Upgrade/downgrade requests
- Cancellation requests (with feedback collection)
- Trial extension requests (Super Admin)
- Reactivation requests

**Outputs:**
- Active subscription state
- Plan feature set (consumed by RBAC)
- Trial expiry notifications
- Cancellation confirmation records

**Dependencies:**
- Billing Service (payment processing)
- RBAC Service (feature gate updates)
- Notification Service (trial expiry, payment reminders)

**Events Produced:**
- `subscription.trial_started` — on trial activation
- `subscription.trial_expiring` — 7 days and 1 day before trial end
- `subscription.activated` — on paid plan start
- `subscription.canceled` — on cancellation
- `subscription.reactivated` — on reactivation

**Events Consumed:**
- `billing.invoice_paid` → activates/maintains subscription
- `billing.invoice_payment_failed` → triggers grace period logic

---

## 1.18 MODULE: Quota Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Real-time resource quota tracking and enforcement — AI tokens, listing counts, seat limits, storage quotas, API rate limits — across all plan tiers |
| **Ownership** | Schema: `tenant_config.quota_meters` |
| **Tier** | Kernel (Tier 1) |

**Inputs:**
- Quota increment events (from all resource-consuming services)
- Quota check requests (pre-operation enforcement)
- Billing period reset signals

**Outputs:**
- Current quota readings (per resource, per tenant)
- Quota exceeded signals
- Usage percentage alerts (75%, 90%, 100%)
- Quota reset confirmations

**Dependencies:**
- Redis (real-time counter state — increment operations)
- PostgreSQL `quota_meters` (persistent state, reset records)
- Notification Service (quota warning alerts)

**Events Produced:**
- `quota.threshold_warning` — at 75% and 90% consumption
- `quota.exceeded` — at 100% (blocks further resource use)
- `quota.reset` — at billing period boundary

**Events Consumed:**
- `billing.quota_reset` → triggers meter reset
- `ai.inference_completed` → increments AI token meter
- `listing.created` → increments listing count meter
- `media.uploaded` → increments storage meter

---

## 1.19 MODULE: Moderation Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Content moderation pipeline — AI-first pre-screening, human review queue, case lifecycle management, appeal workflows, decision publishing, and reviewer performance tracking |
| **Ownership** | Schema: `moderation.*` |
| **Tier** | Marketplace (Tier 2) |

**Inputs:**
- Listing content for AI review (triggered by `listing.created`)
- Media assets for safety scanning (triggered by `media.uploaded`)
- Message content for toxicity check (triggered by `messaging.message_sent`)
- Human reviewer decisions
- Appeal submissions

**Outputs:**
- Moderation case objects
- AI scan results (with confidence scores)
- Human review decisions
- Appeal records
- Reviewer performance metrics

**Dependencies:**
- AI Service (toxicity classification, content analysis)
- Listing Service (status update via events)
- Notification Service (decision notifications)
- Super Admin Interface (human review queue)

**Events Produced:**
- `moderation.case_opened` — on new content flagging
- `moderation.ai_scan_completed` — on AI pre-screening result
- `moderation.decision_made` — on human review completion (approve/reject/escalate)
- `moderation.appeal_received` — on appeal submission
- `moderation.appeal_resolved` — on appeal decision

**Events Consumed:**
- `listing.created` → triggers AI pre-screening
- `media.uploaded` → triggers image safety scan
- `messaging.message_sent` → triggers message toxicity check

---

## 1.20 MODULE: Trust Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Behavioral anomaly detection, trust score computation, fraud signal processing, account lockouts, and platform-wide reputation management |
| **Ownership** | Schema: `trust_registry.*` |
| **Tier** | Marketplace (Tier 2) |

**Inputs:**
- Platform behavioral signals (login patterns, listing volumes, messaging rates, billing anomalies)
- Moderation decisions (reputation impact)
- Manual trust adjustments (from Super Admin)

**Outputs:**
- Trust scores (per tenant, company, user — range 0.0–1.0)
- Fraud detection signals
- Account lock states
- Behavioral anomaly reports

**Dependencies:**
- Event Mesh (behavioral signal consumption)
- AI Service (anomaly pattern analysis)
- Notification Service (trust-related alerts)
- Super Admin Interface (manual review queue)

**Events Produced:**
- `trust.trust_score_updated` — on score recalculation
- `trust.fraud_detected` — on high-confidence fraud signal
- `trust.account_locked` — on automatic lockout
- `trust.account_unlocked` — on manual unlock by Super Admin

**Events Consumed:**
- ALL behavioral events (login, listing creation, bid changes, payment failures)

---

## 1.21 MODULE: Audit Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Immutable audit log — platform-wide action recording, compliance-grade audit trail, regulatory export capability, and security event correlation |
| **Ownership** | Schema: `governance.audit_logs` |
| **Tier** | Kernel (Tier 1) |

**Inputs:**
- All security-relevant events from all domains
- Admin action records (from Super Admin Interface)
- API request logs (sampled)

**Outputs:**
- Structured audit log entries (append-only)
- Compliance export packages (JSON/CSV)
- Security event correlation reports

**Dependencies:**
- Event Mesh (event consumption for audit trail)
- PostgreSQL governance schema (append-only writes)

**Events Produced:**
- None (Audit is a pure sink)

**Events Consumed:**
- ALL security-relevant events across all domains

---

## 1.22 MODULE: Support Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Customer support ticket lifecycle — ticket creation, triage, assignment, resolution tracking, SLA enforcement, and customer satisfaction measurement |
| **Ownership** | Schema: `governance.support_tickets` |
| **Tier** | Marketplace (Tier 2) |

**Inputs:**
- Ticket creation requests (from users)
- Agent replies (from support team)
- Ticket escalation requests
- Customer satisfaction survey responses

**Outputs:**
- Support ticket objects
- SLA status indicators
- Resolution confirmations
- CSAT scores

**Dependencies:**
- Identity Service (requester identity)
- Notification Service (ticket status emails)
- AI Service (optional: AI-powered first-response drafting)

**Events Produced:**
- `support.ticket_created` — on new ticket
- `support.ticket_resolved` — on resolution
- `support.sla_breached` — on SLA expiry without resolution

**Events Consumed:**
- `moderation.decision_made` → auto-creates support ticket for rejected listings

---

## 1.23 MODULE: Super Admin Service

| Attribute | Contract |
|:----------|:---------|
| **Purpose** | Platform operations control plane — tenant management, moderation oversight, billing overrides, system configuration, global announcements, schema migration tracking, and compliance audit access |
| **Ownership** | Schema: `governance.*` |
| **Tier** | Kernel (Tier 1) |

**Inputs:**
- Admin authenticated requests (Super Admin role only)
- Platform health metrics (from Observability)
- Escalated moderation cases
- Manual trust interventions

**Outputs:**
- Platform-wide operational dashboards
- Tenant management actions (suspend, unsuspend, extend trial)
- Moderation queue views and decision tools
- Billing override records
- System configuration changes
- Global announcement publishing

**Dependencies:**
- ALL services (cross-cutting read access)
- Audit Service (all admin actions must be logged)
- Notification Service (global announcements)

**Events Produced:**
- `admin.tenant_suspended` — on Super Admin tenant suspension
- `admin.trust_override_applied` — on manual trust score adjustment
- `admin.global_announcement_published` — on platform-wide announcement

**Events Consumed:**
- `trust.fraud_detected` — populates admin fraud queue
- `moderation.case_opened` → escalated cases appear in admin queue
- `support.sla_breached` → surfaces in admin SLA dashboard

---

# SECTION 2 — API CONTRACTS

## 2.0 API Governance Standards

### 2.0.1 Versioning Policy
- **URL versioning**: All APIs are prefixed `/api/v1/`
- **Breaking changes** require a new version prefix: `/api/v2/`
- **Non-breaking additions** (new optional fields, new endpoints) are allowed in-version
- **Deprecated endpoints** return `Sunset: {ISO-8601 date}` header with 6-month warning

### 2.0.2 Universal Request Headers

```
Authorization: Bearer {jwt_access_token}    — Required on authenticated endpoints
Content-Type: application/json              — Required on POST/PATCH/PUT
X-Request-ID: {uuid-v4}                    — Client-generated; echoed in response
X-Idempotency-Key: {uuid-v4}               — Required on all mutation endpoints (POST/PATCH/DELETE)
X-Tenant-ID: {uuid}                        — Optional override (validated against JWT claims)
Accept-Language: {bcp47}                   — Optional; defaults to en-US
```

### 2.0.3 Universal Response Envelope

**Success:**
```json
{
  "data": { ... },
  "meta": {
    "request_id": "uuid",
    "timestamp": "ISO-8601 UTC",
    "version": "1.0"
  }
}
```

**Paginated:**
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 1450,
    "total_pages": 58,
    "has_next": true,
    "has_prev": false,
    "next_cursor": "opaque_string"
  },
  "meta": { ... }
}
```

**Error:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Human-readable description",
    "field_errors": [
      { "field": "email", "code": "INVALID_FORMAT", "message": "Must be a valid email address" }
    ],
    "request_id": "uuid",
    "documentation_url": "https://docs.platform.io/errors/VALIDATION_ERROR"
  }
}
```

### 2.0.4 Rate Limit Headers (on all responses)
```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 47
X-RateLimit-Reset: 1748642400
X-RateLimit-Policy: tenant_standard
Retry-After: 13          (only when rate-limited)
```

### 2.0.5 Idempotency Enforcement
- All `POST`, `PATCH`, `DELETE` mutation endpoints MUST accept `X-Idempotency-Key`
- Keys are stored for 24 hours
- Duplicate key within window returns cached original response
- Idempotency key scope: `{tenant_id}:{key_value}` (cross-tenant collision prevention)

---

## 2.1 Authentication APIs

### POST /api/v1/auth/register
```
Method: POST
Route: /api/v1/auth/register
Description: Create a new user account and provision initial tenant/organization
Authentication: None (public)
Authorization: None
Rate Limit: 10 req/min per IP; 3 req/hour per email address
Idempotency: Required (X-Idempotency-Key)

Request Body:
{
  "email": string (required, valid RFC 5321 email, max 320 chars),
  "password": string (required, 8-128 chars, complexity rules enforced),
  "full_name": string (required, 2-100 chars, Unicode-safe),
  "organization_name": string | null (2-200 chars; null if joining via invitation),
  "invitation_token": string | null (JWT invitation token; required if joining existing tenant),
  "referral_code": string | null (validated against referral registry),
  "timezone": string | null (IANA timezone, e.g. "America/New_York"),
  "locale": string | null (BCP-47, e.g. "en-US")
}

Response 201 Created:
{
  "data": {
    "user_id": "uuid",
    "email": "string",
    "tenant_id": "uuid",
    "organization_id": "uuid",
    "session": {
      "access_token": "string (JWT RS256, 15-min TTL)",
      "refresh_token": "string (opaque, 30-day TTL, httpOnly cookie)",
      "expires_at": "ISO-8601 UTC"
    },
    "onboarding_status": "EMAIL_VERIFICATION_PENDING",
    "tenant_provisioning_status": "PROVISIONING"
  },
  "meta": { ... }
}

Errors:
  400 VALIDATION_ERROR     — Request schema invalid
  409 EMAIL_ALREADY_EXISTS — Email already registered
  404 INVALID_INVITATION   — Invitation token not found or expired
  429 RATE_LIMITED         — Too many registration attempts

Side Effects:
  - Creates user record in auth.users
  - Creates organization + tenant records (if new org)
  - Attaches user to tenant via tenant_members
  - Enqueues email verification task
  - Provisions tenant workspace (async, ~5-10 seconds)
  - Triggers Notification Service for welcome email

Events Emitted:
  - identity.user_registered
  - organization.created (if new org)
  - team.member_joined (if invitation flow)
```

### POST /api/v1/auth/login
```
Method: POST
Route: /api/v1/auth/login
Description: Authenticate user and issue session tokens
Authentication: None
Authorization: None
Rate Limit: 10 req/min per IP; 5 failed attempts → 15-min lockout per account
Idempotency: Not required (idempotent by nature)

Request Body:
{
  "email": string (required),
  "password": string (required),
  "mfa_code": string | null (6-digit TOTP; required if MFA enrolled),
  "mfa_method": "totp" | "sms" | "email" | null,
  "device_fingerprint": string | null (browser fingerprint hash for trusted device tracking),
  "remember_device": boolean (default false; extends refresh token TTL to 90 days)
}

Response 200 OK:
{
  "data": {
    "user_id": "uuid",
    "tenant_id": "uuid",
    "session": {
      "access_token": "string",
      "refresh_token": "string",
      "expires_at": "ISO-8601 UTC"
    },
    "mfa_required": false,
    "user": {
      "email": "string",
      "full_name": "string",
      "avatar_url": "string | null",
      "role": "string",
      "plan_tier": "string"
    }
  }
}

Response 200 OK (MFA challenge — when MFA enrolled but code not provided):
{
  "data": {
    "mfa_required": true,
    "mfa_challenge_token": "string (short-lived, 5-min TTL)",
    "available_methods": ["totp", "sms"],
    "masked_phone": "+1 *** *** 4567"
  }
}

Errors:
  401 INVALID_CREDENTIALS   — Wrong email or password
  401 ACCOUNT_LOCKED        — Brute-force lockout active
  401 MFA_CODE_INVALID      — Wrong MFA code
  403 ACCOUNT_SUSPENDED     — Account suspended
  403 EMAIL_NOT_VERIFIED    — Email verification pending

Side Effects:
  - Creates session record
  - Updates last_login_at
  - Increments/resets login_attempts counter
  - Writes login_attempts audit record

Events Emitted:
  - identity.user_login_success
  - identity.user_login_failed (on failure)
```

### POST /api/v1/auth/refresh
```
Method: POST
Route: /api/v1/auth/refresh
Description: Exchange a valid refresh token for new access + refresh tokens (rotation)
Authentication: None (refresh token is the credential)
Rate Limit: 20 req/min per refresh token

Request Body:
{
  "refresh_token": string (required)
}

Response 200:
{
  "data": {
    "access_token": "string",
    "refresh_token": "string (new; old is invalidated)",
    "expires_at": "ISO-8601 UTC"
  }
}

Errors:
  401 TOKEN_INVALID   — Refresh token not found, expired, or revoked
  401 TOKEN_REUSED    — Refresh token already rotated (replay attack detection)

Side Effects:
  - Invalidates old refresh token
  - Issues new refresh token
  - Refreshes session expiry in Redis

Events Emitted:
  - None (high-frequency; would generate excessive events)
```

### POST /api/v1/auth/logout
```
Method: POST
Route: /api/v1/auth/logout
Description: Invalidate current session and revoke refresh token
Authentication: JWT (required)
Rate Limit: 30 req/min

Request Body:
{
  "refresh_token": string (required),
  "all_devices": boolean (default false; if true, revokes all active sessions)
}

Response 204 No Content

Side Effects:
  - Revokes refresh token
  - Adds access token to Redis deny list (TTL = remaining JWT lifetime)
  - If all_devices: revokes all sessions for user

Events Emitted:
  - identity.session_revoked
```

### POST /api/v1/auth/mfa/enroll
```
Method: POST
Route: /api/v1/auth/mfa/enroll
Description: Begin MFA enrollment for authenticated user
Authentication: JWT (required)
Idempotency: Required

Request Body:
{
  "method": "totp" | "sms" | "email" (required),
  "phone_number": string | null (E.164 format; required if method=sms)
}

Response 200:
{
  "data": {
    "enrollment_id": "uuid",
    "method": "totp",
    "totp_secret": "BASE32_SECRET (only for method=totp)",
    "totp_uri": "otpauth://...",
    "qr_code_data_url": "data:image/png;base64,...",
    "backup_codes": ["code1", "code2", ... (10 codes)]
  }
}
```

### POST /api/v1/auth/password/reset-request
```
Method: POST
Route: /api/v1/auth/password/reset-request
Description: Send password reset email to registered user
Authentication: None
Rate Limit: 3 req/15-min per email; 10 req/hour per IP

Request Body:
{
  "email": string (required)
}

Response 200:
{ "data": { "message": "If the email exists, a reset link was sent." } }
(Always returns 200 to prevent email enumeration)

Side Effects:
  - Generates reset token (SHA-256 hash stored, plaintext emailed)
  - Sends password reset email via Notification Service
  - Token TTL: 1 hour, single-use
```

### GET /.well-known/jwks.json
```
Method: GET
Route: /.well-known/jwks.json
Description: Public JWKS endpoint for JWT signature verification
Authentication: None
Cache-Control: public, max-age=3600, stale-while-revalidate=86400

Response 200:
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "alg": "RS256",
      "kid": "string (key ID, rotated every 90 days)",
      "n": "string (modulus)",
      "e": "AQAB"
    }
  ]
}

Side Effects: None
Events Emitted: None
```

---

## 2.2 Company APIs

### POST /api/v1/companies
```
Method: POST
Route: /api/v1/companies
Description: Register a new company profile within the tenant workspace
Authentication: JWT (required)
Authorization: tenant_member with role >= editor
Idempotency: Required

Request Body:
{
  "name": string (required, 2-200 chars),
  "slug": string (required, 2-60 chars, lowercase alphanumeric + hyphens),
  "description": string (10-5000 chars, markdown),
  "website_url": string | null (valid URL),
  "industry": string (required, from enum: technology, finance, healthcare, ...),
  "company_size": "1-10" | "11-50" | "51-200" | "201-500" | "500+" | null,
  "founded_year": integer | null (1800-current_year),
  "headquarters": {
    "country_code": string (ISO 3166-1 alpha-2),
    "city": string | null,
    "state": string | null
  } | null
}

Response 201:
{
  "data": {
    "company_id": "uuid",
    "slug": "string",
    "status": "UNVERIFIED",
    "trust_score": 0.5,
    "created_at": "ISO-8601 UTC"
  }
}

Errors:
  409 SLUG_TAKEN             — Slug already in use within tenant
  403 LISTING_QUOTA_EXCEEDED — Company limit reached on current plan

Side Effects:
  - Creates company record
  - Enqueues trust score initialization

Events Emitted:
  - company.created
```

### GET /api/v1/companies/{company_id}
```
Method: GET
Route: /api/v1/companies/{company_id}
Description: Retrieve full company profile with trust metadata
Authentication: JWT (optional; public fields returned if unauthenticated)
Authorization: public fields always visible; private fields require tenant membership

Response 200:
{
  "data": {
    "company_id": "uuid",
    "name": "string",
    "slug": "string",
    "description": "string",
    "logo_url": "string | null",
    "website_url": "string | null",
    "industry": "string",
    "company_size": "string | null",
    "founded_year": "integer | null",
    "headquarters": { ... },
    "trust_score": 0.87,
    "verification_status": "VERIFIED" | "UNVERIFIED" | "PENDING",
    "listing_count": 42,
    "average_rating": 4.6,
    "review_count": 128,
    "created_at": "ISO-8601 UTC"
  }
}
```

### PATCH /api/v1/companies/{company_id}
```
Method: PATCH
Route: /api/v1/companies/{company_id}
Description: Update company profile fields
Authentication: JWT
Authorization: Company owner or tenant admin
Idempotency: Required

Request Body: (all fields optional)
{
  "name": string | null,
  "description": string | null,
  "website_url": string | null,
  "industry": string | null,
  "company_size": string | null,
  "headquarters": object | null
}

Response 200:
{ "data": { "company_id": "uuid", "updated_fields": ["name", "description"] } }

Events Emitted:
  - company.profile_updated
```

---

## 2.3 User APIs

### GET /api/v1/users/me
```
Method: GET
Route: /api/v1/users/me
Description: Get authenticated user's profile and current tenant context
Authentication: JWT (required)

Response 200:
{
  "data": {
    "user_id": "uuid",
    "email": "string",
    "full_name": "string",
    "avatar_url": "string | null",
    "phone": "string | null",
    "email_verified": true,
    "phone_verified": false,
    "mfa_enabled": true,
    "kyc_status": "NONE" | "PENDING" | "VERIFIED",
    "current_tenant": {
      "tenant_id": "uuid",
      "name": "string",
      "role": "string",
      "permissions": ["string"],
      "plan_tier": "string"
    },
    "preferences": {
      "timezone": "string",
      "locale": "string",
      "notification_channels": { "email": true, "push": false }
    },
    "created_at": "ISO-8601 UTC"
  }
}
```

### PATCH /api/v1/users/me
```
Method: PATCH
Route: /api/v1/users/me
Description: Update authenticated user's profile
Authentication: JWT (required)
Idempotency: Required

Request Body: (all optional)
{
  "full_name": string | null (2-100 chars),
  "phone": string | null (E.164 format),
  "timezone": string | null (IANA timezone),
  "locale": string | null (BCP-47),
  "notification_preferences": {
    "email": boolean,
    "push": boolean,
    "sms": boolean
  } | null
}

Response 200:
{ "data": { "user_id": "uuid", "updated_fields": ["full_name"] } }
```

### POST /api/v1/users/me/avatar
```
Method: POST
Route: /api/v1/users/me/avatar
Description: Upload user avatar image
Authentication: JWT (required)
Content-Type: multipart/form-data
File Constraints: JPEG/PNG/WebP, max 5MB, min 64x64px

Response 200:
{
  "data": {
    "avatar_url": "https://cdn.platform.io/avatars/{user_id}/avatar.webp",
    "thumbnail_url": "https://cdn.platform.io/avatars/{user_id}/avatar_64.webp"
  }
}
```

---

## 2.4 Team APIs

### GET /api/v1/tenants/{tenant_id}/members
```
Method: GET
Route: /api/v1/tenants/{tenant_id}/members
Description: List all members of a tenant workspace
Authentication: JWT
Authorization: Any tenant member (viewer+ role)
Query Params:
  page: integer (default 1)
  limit: integer (default 25, max 100)
  role: "owner" | "admin" | "editor" | "viewer" | "api_user" | null
  status: "active" | "pending" | "suspended" | null
  search: string | null (name or email search)

Response 200:
{
  "data": [
    {
      "member_id": "uuid",
      "user_id": "uuid",
      "email": "string",
      "full_name": "string",
      "avatar_url": "string | null",
      "role": "string",
      "status": "string",
      "joined_at": "ISO-8601 UTC",
      "last_active_at": "ISO-8601 UTC | null",
      "workspace_count": 3
    }
  ],
  "pagination": { ... }
}
```

### POST /api/v1/tenants/{tenant_id}/members/invite
```
Method: POST
Route: /api/v1/tenants/{tenant_id}/members/invite
Description: Send workspace invitation to an email address
Authentication: JWT
Authorization: tenant admin or owner
Idempotency: Required
Rate Limit: 20 req/hour per tenant

Request Body:
{
  "email": string (required, valid email),
  "role": "admin" | "editor" | "viewer" | "api_user" (required),
  "message": string | null (optional personal message, max 500 chars),
  "workspace_ids": ["uuid"] | null (specific workspace access; null = all workspaces)
}

Response 200:
{
  "data": {
    "invitation_id": "uuid",
    "email": "string",
    "role": "string",
    "expires_at": "ISO-8601 UTC (7 days)",
    "invitation_url": "https://platform.io/invite/{token}"
  }
}

Side Effects:
  - Creates invitation record
  - Sends invitation email via Notification Service

Events Emitted:
  - team.member_invited
```

### PATCH /api/v1/tenants/{tenant_id}/members/{member_id}
```
Method: PATCH
Route: /api/v1/tenants/{tenant_id}/members/{member_id}
Description: Change a member's role or status
Authentication: JWT
Authorization: tenant owner only (for role changes); admin for status changes

Request Body:
{
  "role": "admin" | "editor" | "viewer" | "api_user" | null,
  "status": "active" | "suspended" | null,
  "permissions_override": object | null (JSONB permission delta)
}

Response 200:
{ "data": { "member_id": "uuid", "updated_fields": ["role"] } }

Events Emitted:
  - team.role_changed
```

### DELETE /api/v1/tenants/{tenant_id}/members/{member_id}
```
Method: DELETE
Route: /api/v1/tenants/{tenant_id}/members/{member_id}
Description: Remove a member from tenant workspace
Authentication: JWT
Authorization: tenant owner or admin (cannot remove owner)
Idempotency: Required

Response 204 No Content

Side Effects:
  - Removes membership record
  - Revokes all active sessions scoped to this tenant for this user
  - Transfers owned listings to tenant admin if needed

Events Emitted:
  - team.member_removed
```

---

## 2.5 Role APIs

### GET /api/v1/roles
```
Method: GET
Route: /api/v1/roles
Description: List available roles and their permission sets
Authentication: JWT
Authorization: tenant admin+

Response 200:
{
  "data": [
    {
      "role": "admin",
      "display_name": "Administrator",
      "description": "Full tenant management access",
      "permissions": ["listings:read", "listings:write", "members:manage", "analytics:read"],
      "is_assignable": true
    }
  ]
}
```

### GET /api/v1/roles/{role}/permissions
```
Method: GET
Route: /api/v1/roles/{role}/permissions
Description: Get detailed permission matrix for a specific role
Authentication: JWT
Authorization: tenant admin+

Response 200:
{
  "data": {
    "role": "editor",
    "permissions": {
      "listings": { "create": true, "read": true, "update": true, "delete": false },
      "media": { "upload": true, "delete": true },
      "analytics": { "read": true },
      "members": { "read": true, "manage": false },
      "billing": { "read": false, "manage": false }
    }
  }
}
```

---

## 2.6 Listing APIs

*(Reference: Spec 09 §4 — extended here with complete contract)*

### POST /api/v1/listings
*(see Spec 09 §4.1 — authoritative reference, no duplication)*

**Extended Side Effects for STEP AC:**
- Creates listing in `DRAFT` status
- Creates initial version snapshot (version 1)
- Increments listing quota meter
- Publishes `listing.created` event
- Triggers async AI embedding generation (via AI Service)
- Triggers async moderation scan (via Moderation Service)
- Returns immediately — does NOT wait for embedding or moderation completion

### PATCH /api/v1/listings/{listing_id}
**Re-embedding Logic:**
- If `title`, `description`, or `tags` changed → queues re-embedding
- If price, attributes, or media changed only → no re-embedding (only metadata refresh)
- Re-moderation required if description or title changed significantly (AI delta check)

### POST /api/v1/listings/{listing_id}/publish
```
Method: POST
Route: /api/v1/listings/{listing_id}/publish
Description: Transition listing from DRAFT or PAUSED to PENDING_REVIEW (triggers moderation)
Authentication: JWT
Authorization: Listing owner (editor+)
Idempotency: Required

Response 200:
{
  "data": {
    "listing_id": "uuid",
    "status": "PENDING_REVIEW",
    "estimated_review_minutes": 5,
    "moderation_case_id": "uuid"
  }
}

Errors:
  422 INCOMPLETE_LISTING     — Missing required fields for publication
  422 EMBEDDING_NOT_READY    — Embedding generation still in progress
  429 LISTING_QUOTA_EXCEEDED — Active listing limit reached

Events Emitted:
  - listing.status_changed
  - moderation.case_opened
```

### POST /api/v1/listings/bulk-import
```
Method: POST
Route: /api/v1/listings/bulk-import
Description: Import multiple listings from CSV or JSON payload
Authentication: JWT
Authorization: tenant admin
Content-Type: multipart/form-data OR application/json
Rate Limit: 5 req/hour per tenant

Request (JSON):
{
  "format": "json" | "csv",
  "listings": [ { same as POST /listings body } ],
  "import_mode": "draft" | "publish_after_review",
  "conflict_strategy": "skip" | "update" | "error"
}

Response 202 Accepted:
{
  "data": {
    "import_job_id": "uuid",
    "status": "PROCESSING",
    "total_submitted": 47,
    "estimated_completion_seconds": 120,
    "webhook_url": "string | null (for completion notification)"
  }
}

Side Effects:
  - Creates background import job
  - Processes listings asynchronously
  - Delivers completion webhook or notification when done
```

---

## 2.7 Media APIs

### POST /api/v1/media/upload-url
```
Method: POST
Route: /api/v1/media/upload-url
Description: Generate presigned upload URL for direct client-to-storage upload
Authentication: JWT
Authorization: tenant member (editor+)
Idempotency: Required

Request Body:
{
  "filename": string (required, max 255 chars),
  "content_type": string (required; allowed: image/jpeg, image/png, image/webp, video/mp4, application/pdf),
  "file_size_bytes": integer (required; validated against limits),
  "listing_id": "uuid | null",
  "purpose": "listing_primary" | "listing_gallery" | "company_logo" | "user_avatar" | "document"
}

Response 200:
{
  "data": {
    "upload_id": "uuid",
    "upload_url": "https://storage.platform.io/upload?token=...",
    "upload_method": "PUT",
    "upload_headers": { "Content-Type": "image/jpeg" },
    "expires_at": "ISO-8601 UTC (15 min)",
    "max_file_size_bytes": 20971520,
    "completion_webhook_path": "/api/v1/media/upload-url/{upload_id}/complete"
  }
}

Errors:
  415 UNSUPPORTED_MEDIA_TYPE — Content type not allowed
  413 FILE_TOO_LARGE         — Exceeds plan storage limits
  429 STORAGE_QUOTA_EXCEEDED — Tenant storage limit reached
```

### POST /api/v1/media/upload-url/{upload_id}/complete
```
Method: POST
Route: /api/v1/media/upload-url/{upload_id}/complete
Description: Confirm upload completion and trigger processing pipeline
Authentication: JWT
Idempotency: Required

Request Body:
{
  "storage_path": string (path returned by storage provider),
  "actual_file_size_bytes": integer
}

Response 200:
{
  "data": {
    "media_id": "uuid",
    "status": "PROCESSING",
    "cdn_url": null,
    "estimated_processing_seconds": 10
  }
}

Side Effects:
  - Triggers image optimization pipeline
  - Triggers safety scan
  - Increments storage quota meter
  - When complete: updates record with CDN URLs and emits media.processed

Events Emitted:
  - media.uploaded
```

### DELETE /api/v1/media/{media_id}
```
Method: DELETE
Route: /api/v1/media/{media_id}
Description: Delete a media asset permanently
Authentication: JWT
Authorization: Media owner or tenant admin
Idempotency: Required

Response 204 No Content

Side Effects:
  - Removes storage object
  - Removes CDN cache entry
  - Decrements storage quota meter
  - Removes media record from associated listing

Events Emitted:
  - media.deleted
```

---

## 2.8 Search APIs

*(Reference: Spec 09 §5 — complete search contract)*

### POST /api/v1/feed
*(see Spec 09 §5.1 — authoritative; STEP AC adds:)*

**Latency Contract:**
- P50 target: ≤20ms
- P95 target: ≤45ms
- P99 target: ≤100ms
- Degradation behavior: If neural re-ranking exceeds 30ms budget → skip Stage 3, return Stage 2 results with `feed_source: "DEGRADED"`

**Caching Contract:**
- Anonymous feeds: cached 5 minutes by category+filter hash
- Authenticated feeds: not cached (personalized per user)
- Sponsored items: refreshed every 30 seconds

### GET /api/v1/search
*(see Spec 09 §5.2)*

### GET /api/v1/search/suggestions
*(see Spec 09 §5.3)*

### POST /api/v1/interactions
*(see Spec 09 §5.4)*

### GET /api/v1/search/saved
```
Method: GET
Route: /api/v1/search/saved
Description: List user's saved search configurations
Authentication: JWT

Response 200:
{
  "data": [
    {
      "saved_search_id": "uuid",
      "name": "string",
      "query_params": { "q": "AI agents", "category_id": "uuid", ... },
      "alert_enabled": true,
      "alert_frequency": "daily",
      "new_result_count": 3,
      "last_matched_at": "ISO-8601 UTC",
      "created_at": "ISO-8601 UTC"
    }
  ]
}
```

### POST /api/v1/search/saved
```
Method: POST
Route: /api/v1/search/saved
Description: Save current search configuration with optional alert
Authentication: JWT
Idempotency: Required

Request Body:
{
  "name": string (required, 1-100 chars),
  "query_params": object (required, same shape as search query params),
  "alert_enabled": boolean (default false),
  "alert_frequency": "instant" | "daily" | "weekly" | null
}

Response 201:
{ "data": { "saved_search_id": "uuid", "name": "string" } }
```

---

## 2.9 Recommendation APIs

### GET /api/v1/recommendations/for-you
```
Method: GET
Route: /api/v1/recommendations/for-you
Description: Get personalized listing recommendations for authenticated user
Authentication: JWT
Rate Limit: 30 req/min per user

Query Params:
  limit: integer (default 10, max 25)
  surface: "homepage" | "sidebar" | "email" (default "homepage")

Response 200:
{
  "data": {
    "recommendations": [
      {
        "listing_id": "uuid",
        "title": "string",
        "price": "decimal",
        "media_url": "string",
        "category": { "id": "uuid", "name": "string" },
        "company": { "id": "uuid", "name": "string", "verified": true },
        "rating": { "average": 4.7, "count": 89 },
        "recommendation_score": 0.94,
        "recommendation_reason": "Based on your interest in RAG architectures"
      }
    ],
    "snapshot_age_seconds": 1240,
    "next_refresh_seconds": 12560
  }
}
```

### GET /api/v1/listings/{listing_id}/related
```
Method: GET
Route: /api/v1/listings/{listing_id}/related
Description: Get listings similar to a given listing (item-to-item similarity)
Authentication: JWT (optional; anonymous returns public results)
Query Params:
  limit: integer (default 6, max 20)
  relation_type: "similar" | "complementary" | "alternative" | null

Response 200:
{
  "data": {
    "related_listings": [ { ...listing_summary... } ],
    "computed_at": "ISO-8601 UTC"
  }
}
```

### GET /api/v1/recommendations/trending
```
Method: GET
Route: /api/v1/recommendations/trending
Description: Get trending listings across the platform or within a category
Authentication: JWT (optional)
Query Params:
  scope: "platform" | "category" (default "platform")
  category_id: uuid (required if scope=category)
  period: "hourly" | "daily" | "weekly" (default "daily")
  limit: integer (default 10, max 25)

Response 200:
{
  "data": {
    "trending": [ { ...listing_summary... } ],
    "period": "daily",
    "computed_at": "ISO-8601 UTC"
  }
}
```

---

## 2.10 Analytics APIs

*(Reference: Spec 09 §7 + Spec 13 — complete analytics contract)*

### GET /api/v1/analytics/dashboard
*(see Spec 09 §7.1)*

### GET /api/v1/analytics/listings/{listing_id}
*(see Spec 09 §7.2)*

### GET /api/v1/analytics/funnels
*(see Spec 09 §7.3)*

### GET /api/v1/analytics/ai-usage
*(see Spec 09 §7.4)*

### GET /api/v1/analytics/search
```
Method: GET
Route: /api/v1/analytics/search
Description: Search performance analytics — query volumes, zero-result rates, top queries
Authentication: JWT
Authorization: tenant admin+
Rate Limit: 30 req/min

Query Params:
  period: "7d" | "30d" | "90d" | "custom"
  start_date: ISO-8601 date
  end_date: ISO-8601 date

Response 200:
{
  "data": {
    "period": { "start": "date", "end": "date" },
    "total_searches": 142000,
    "zero_result_rate": 0.032,
    "average_results_returned": 18.4,
    "top_queries": [
      { "query": "RAG pipeline", "count": 4200, "ctr": 0.34 }
    ],
    "top_zero_result_queries": [
      { "query": "blockchain escrow agent", "count": 89 }
    ],
    "search_by_category": [
      { "category_id": "uuid", "name": "string", "search_count": 12000, "ctr": 0.28 }
    ],
    "latency_percentiles": {
      "p50_ms": 18,
      "p95_ms": 41,
      "p99_ms": 87
    }
  }
}
```

### GET /api/v1/analytics/revenue
```
Method: GET
Route: /api/v1/analytics/revenue
Description: Revenue attribution and conversion analytics
Authentication: JWT
Authorization: tenant owner or admin
Rate Limit: 30 req/min

Response 200:
{
  "data": {
    "period": { "start": "date", "end": "date" },
    "total_leads": 842,
    "qualified_leads": 234,
    "conversions": 67,
    "lead_to_conversion_rate": 0.079,
    "attributed_revenue_usd": 48200.00,
    "revenue_by_listing": [ { "listing_id": "uuid", "title": "string", "conversions": 12, "revenue_usd": 8400 } ],
    "revenue_by_channel": { "FEED": 0.52, "SEARCH": 0.31, "DIRECT": 0.17 }
  }
}
```

---

## 2.11 CRM APIs

### GET /api/v1/crm/contacts
```
Method: GET
Route: /api/v1/crm/contacts
Description: List CRM contacts (buyers who have submitted leads)
Authentication: JWT
Authorization: tenant member (editor+)
Query Params:
  page, limit, search, status, assigned_to

Response 200:
{
  "data": [
    {
      "contact_id": "uuid",
      "buyer_user_id": "uuid | null",
      "name": "string",
      "email": "string (masked if anonymous)",
      "phone": "string | null",
      "lead_count": 3,
      "last_interaction_at": "ISO-8601 UTC",
      "assigned_agent_id": "uuid | null",
      "ai_quality_score": 0.72
    }
  ],
  "pagination": { ... }
}
```

### GET /api/v1/crm/contacts/{contact_id}/timeline
```
Method: GET
Route: /api/v1/crm/contacts/{contact_id}/timeline
Description: Full interaction timeline for a CRM contact
Authentication: JWT

Response 200:
{
  "data": {
    "contact_id": "uuid",
    "timeline": [
      {
        "event_type": "LEAD_SUBMITTED" | "MESSAGE_SENT" | "LISTING_VIEWED" | "STAGE_CHANGED" | "NOTE_ADDED",
        "timestamp": "ISO-8601 UTC",
        "summary": "string",
        "details": { ... }
      }
    ]
  }
}
```

### POST /api/v1/crm/contacts/{contact_id}/notes
```
Method: POST
Route: /api/v1/crm/contacts/{contact_id}/notes
Description: Add a CRM note to a contact record
Authentication: JWT
Idempotency: Required

Request Body:
{
  "content": string (required, 1-5000 chars, markdown),
  "is_private": boolean (default false)
}

Response 201:
{ "data": { "note_id": "uuid", "created_at": "ISO-8601 UTC" } }
```

---

## 2.12 Lead APIs

### GET /api/v1/leads
```
Method: GET
Route: /api/v1/leads
Description: List all leads within tenant workspace with filtering
Authentication: JWT
Authorization: tenant member (editor+)
Query Params:
  status: "new" | "contacted" | "qualified" | "converted" | "lost" | null
  listing_id: uuid | null
  assigned_to: uuid | null
  score_min: float | null (AI lead score minimum)
  page, limit, sort

Response 200:
{
  "data": [
    {
      "lead_id": "uuid",
      "listing": { "id": "uuid", "title": "string" },
      "contact": { "name": "string", "email": "string", "phone": "string | null" },
      "message": "string",
      "status": "new",
      "ai_score": 0.83,
      "assigned_agent_id": "uuid | null",
      "created_at": "ISO-8601 UTC"
    }
  ],
  "pagination": { ... }
}
```

### POST /api/v1/listings/{listing_id}/leads
```
Method: POST
Route: /api/v1/listings/{listing_id}/leads
Description: Submit a lead inquiry for a listing (buyer action)
Authentication: JWT (optional; anonymous leads allowed with contact info)
Idempotency: Required
Rate Limit: 5 req/hour per IP + email combination

Request Body:
{
  "name": string (required, 2-100 chars),
  "email": string (required, valid email),
  "phone": string | null (E.164 format),
  "message": string (required, 10-2000 chars),
  "source": "SEARCH" | "FEED" | "DIRECT" | "REFERRAL" | null,
  "utm_params": { "source": "string", "medium": "string", "campaign": "string" } | null
}

Response 201:
{
  "data": {
    "lead_id": "uuid",
    "confirmation_message": "Your inquiry has been submitted. Expect a response within 24 hours.",
    "estimated_response_hours": 24
  }
}

Side Effects:
  - Creates lead record
  - Triggers AI lead scoring (async)
  - Notifies assigned agent
  - Logs UTM attribution

Events Emitted:
  - lead.created
```

### PATCH /api/v1/leads/{lead_id}
```
Method: PATCH
Route: /api/v1/leads/{lead_id}
Description: Update lead status or assignment
Authentication: JWT
Authorization: Assigned agent or tenant admin

Request Body:
{
  "status": "contacted" | "qualified" | "converted" | "lost" | null,
  "assigned_agent_id": "uuid | null",
  "loss_reason": string | null (required if status=lost)
}

Response 200:
{ "data": { "lead_id": "uuid", "status": "qualified" } }

Events Emitted:
  - crm.lead_stage_changed
```

---

## 2.13 Billing APIs

### GET /api/v1/billing/subscription
```
Method: GET
Route: /api/v1/billing/subscription
Description: Get current subscription state and plan details
Authentication: JWT
Authorization: tenant owner or admin

Response 200:
{
  "data": {
    "subscription_id": "uuid",
    "plan": {
      "tier": "professional",
      "display_name": "Professional",
      "monthly_price_cents": 9900,
      "billing_cycle": "monthly"
    },
    "status": "active",
    "current_period_start": "ISO-8601 UTC",
    "current_period_end": "ISO-8601 UTC",
    "trial_ends_at": "ISO-8601 UTC | null",
    "cancel_at_period_end": false,
    "quotas": {
      "ai_tokens_monthly": 1000000,
      "max_active_listings": 500,
      "max_seats": 20,
      "storage_gb": 100
    },
    "usage": {
      "ai_tokens_used": 342891,
      "active_listings": 127,
      "seats_used": 8,
      "storage_used_gb": 23.4
    }
  }
}
```

### POST /api/v1/billing/subscription/upgrade
```
Method: POST
Route: /api/v1/billing/subscription/upgrade
Description: Upgrade subscription plan with prorated billing
Authentication: JWT
Authorization: tenant owner
Idempotency: Required

Request Body:
{
  "target_plan_tier": "starter" | "professional" | "business" | "enterprise" (required),
  "billing_cycle": "monthly" | "annual" (required),
  "promo_code": string | null
}

Response 200:
{
  "data": {
    "subscription_id": "uuid",
    "new_plan_tier": "business",
    "effective_at": "ISO-8601 UTC",
    "proration_credit_cents": 4500,
    "next_invoice_cents": 14500,
    "stripe_session_url": "string | null (for payment confirmation if needed)"
  }
}
```

### GET /api/v1/billing/invoices
```
Method: GET
Route: /api/v1/billing/invoices
Description: List billing invoices for tenant
Authentication: JWT
Authorization: tenant owner or admin
Query Params: page, limit, status

Response 200:
{
  "data": [
    {
      "invoice_id": "uuid",
      "stripe_invoice_id": "in_xxx",
      "amount_cents": 9900,
      "currency": "usd",
      "status": "paid" | "open" | "void" | "uncollectible",
      "invoice_date": "ISO-8601 date",
      "due_date": "ISO-8601 date | null",
      "paid_at": "ISO-8601 UTC | null",
      "pdf_url": "string",
      "line_items": [
        { "description": "Professional Plan (Monthly)", "amount_cents": 9900 }
      ]
    }
  ],
  "pagination": { ... }
}
```

### GET /api/v1/billing/usage
```
Method: GET
Route: /api/v1/billing/usage
Description: Detailed usage metering breakdown for current billing period
Authentication: JWT
Authorization: tenant owner or admin

Response 200:
{
  "data": {
    "period": { "start": "ISO-8601 UTC", "end": "ISO-8601 UTC" },
    "resources": [
      {
        "resource_type": "ai_tokens",
        "display_name": "AI Tokens",
        "used": 342891,
        "limit": 1000000,
        "utilization_pct": 34.3,
        "overage_units": 0,
        "overage_cost_cents": 0
      },
      {
        "resource_type": "storage_gb",
        "display_name": "Storage",
        "used": 23.4,
        "limit": 100,
        "utilization_pct": 23.4
      }
    ],
    "estimated_overage_this_period_cents": 0
  }
}
```

### POST /api/v1/billing/campaigns
```
Method: POST
Route: /api/v1/billing/campaigns
Description: Create a promoted listing campaign (CPC/CPM bidding)
Authentication: JWT
Authorization: tenant admin+
Idempotency: Required

Request Body:
{
  "listing_id": "uuid" (required),
  "bid_type": "CPC" | "CPM" (required),
  "bid_amount_cents": integer (required, min 10),
  "daily_budget_cents": integer (required, min 500),
  "total_budget_cents": integer | null (null = unlimited),
  "start_date": "ISO-8601 date" (required),
  "end_date": "ISO-8601 date | null",
  "target_categories": ["uuid"] | null,
  "target_keywords": ["string"] | null
}

Response 201:
{
  "data": {
    "campaign_id": "uuid",
    "status": "PENDING_REVIEW",
    "estimated_daily_impressions": 5000
  }
}
```

---

## 2.14 Subscription APIs

### GET /api/v1/billing/plans
```
Method: GET
Route: /api/v1/billing/plans
Description: List all available subscription plans (public)
Authentication: None (public)

Response 200:
{
  "data": [
    {
      "plan_id": "uuid",
      "tier": "starter",
      "display_name": "Starter",
      "monthly_price_cents": 2900,
      "annual_price_cents": 29000,
      "currency": "usd",
      "features": {
        "max_active_listings": 50,
        "max_seats": 5,
        "ai_tokens_monthly": 100000,
        "storage_gb": 10,
        "analytics": "basic",
        "custom_domain": false,
        "priority_support": false
      },
      "is_popular": false
    }
  ]
}
```

### POST /api/v1/billing/checkout
```
Method: POST
Route: /api/v1/billing/checkout
Description: Create Stripe Checkout session for plan purchase
Authentication: JWT
Authorization: tenant owner
Idempotency: Required

Request Body:
{
  "plan_tier": string (required),
  "billing_cycle": "monthly" | "annual" (required),
  "success_url": string (required, your domain only),
  "cancel_url": string (required, your domain only),
  "promo_code": string | null
}

Response 200:
{
  "data": {
    "checkout_session_id": "cs_xxx",
    "checkout_url": "https://checkout.stripe.com/c/pay/cs_xxx"
  }
}
```

---

## 2.15 Notification APIs

### GET /api/v1/notifications
```
Method: GET
Route: /api/v1/notifications
Description: Get paginated in-app notification inbox for authenticated user
Authentication: JWT
Query Params:
  page, limit (default 25), read: boolean | null, type: string | null

Response 200:
{
  "data": {
    "notifications": [
      {
        "notification_id": "uuid",
        "type": "LEAD_RECEIVED" | "LISTING_APPROVED" | "BILLING_ALERT" | ...,
        "title": "string",
        "body": "string",
        "action_url": "string | null",
        "is_read": false,
        "created_at": "ISO-8601 UTC"
      }
    ],
    "unread_count": 5,
    "pagination": { ... }
  }
}
```

### POST /api/v1/notifications/mark-read
```
Method: POST
Route: /api/v1/notifications/mark-read
Description: Mark one or all notifications as read
Authentication: JWT
Idempotency: Required

Request Body:
{
  "notification_ids": ["uuid"] | null (null = mark all as read),
}

Response 200:
{ "data": { "marked_count": 5 } }
```

### GET /api/v1/notifications/preferences
```
Method: GET
Route: /api/v1/notifications/preferences
Description: Get user notification channel preferences
Authentication: JWT

Response 200:
{
  "data": {
    "channels": {
      "email": { "enabled": true, "types": ["BILLING", "LEADS", "SECURITY"] },
      "push": { "enabled": false },
      "sms": { "enabled": false }
    }
  }
}
```

---

## 2.16 Messaging APIs

### GET /api/v1/conversations
```
Method: GET
Route: /api/v1/conversations
Description: List all conversations for authenticated user
Authentication: JWT
Query Params: page, limit, status: "active" | "archived"

Response 200:
{
  "data": [
    {
      "conversation_id": "uuid",
      "listing": { "id": "uuid", "title": "string", "media_url": "string" },
      "other_participant": { "user_id": "uuid", "name": "string", "avatar_url": "string | null" },
      "last_message": {
        "content": "string (truncated to 100 chars)",
        "sent_at": "ISO-8601 UTC",
        "is_mine": true
      },
      "unread_count": 2,
      "status": "active"
    }
  ],
  "pagination": { ... }
}
```

### POST /api/v1/conversations
```
Method: POST
Route: /api/v1/conversations
Description: Start a new conversation about a listing
Authentication: JWT
Idempotency: Required

Request Body:
{
  "listing_id": "uuid" (required),
  "initial_message": string (required, 1-2000 chars)
}

Response 201:
{
  "data": {
    "conversation_id": "uuid",
    "realtime_channel": "conversations:{conversation_id}",
    "created_at": "ISO-8601 UTC"
  }
}
```

### GET /api/v1/conversations/{conversation_id}/messages
```
Method: GET
Route: /api/v1/conversations/{conversation_id}/messages
Description: Get paginated message history for a conversation
Authentication: JWT
Authorization: Conversation participant only
Query Params: before_message_id, limit (default 50, max 100)

Response 200:
{
  "data": {
    "messages": [
      {
        "message_id": "uuid",
        "sender": { "user_id": "uuid", "name": "string", "avatar_url": "string | null" },
        "content": "string",
        "content_type": "text" | "file",
        "status": "sent" | "delivered" | "read",
        "sent_at": "ISO-8601 UTC"
      }
    ],
    "has_more": true
  }
}
```

### POST /api/v1/conversations/{conversation_id}/messages
```
Method: POST
Route: /api/v1/conversations/{conversation_id}/messages
Description: Send a message in a conversation
Authentication: JWT
Authorization: Conversation participant
Idempotency: Required

Request Body:
{
  "content": string (required, 1-5000 chars),
  "content_type": "text" | "file" (default "text"),
  "media_id": "uuid | null" (required if content_type=file)
}

Response 201:
{
  "data": {
    "message_id": "uuid",
    "sent_at": "ISO-8601 UTC",
    "realtime_delivered": true
  }
}

Side Effects:
  - Delivers message via Supabase Realtime to conversation channel
  - Triggers moderation scan (async)
  - Updates unread count for other participants

Events Emitted:
  - messaging.message_sent
```

---

## 2.17 Support APIs

### POST /api/v1/support/tickets
```
Method: POST
Route: /api/v1/support/tickets
Description: Create a support ticket
Authentication: JWT
Idempotency: Required
Rate Limit: 10 req/hour per user

Request Body:
{
  "subject": string (required, 5-200 chars),
  "body": string (required, 20-10000 chars, markdown),
  "category": "BILLING" | "TECHNICAL" | "LISTING" | "ACCOUNT" | "OTHER" (required),
  "priority": "LOW" | "NORMAL" | "HIGH" | "URGENT" (default "NORMAL"),
  "attachments": ["media_id"] | null (max 5)
}

Response 201:
{
  "data": {
    "ticket_id": "uuid",
    "ticket_number": "TKT-20260530-00142",
    "status": "OPEN",
    "sla_due_at": "ISO-8601 UTC",
    "estimated_response_hours": 4
  }
}
```

### GET /api/v1/support/tickets
```
Method: GET
Route: /api/v1/support/tickets
Description: List user's support tickets
Authentication: JWT
Query Params: status, page, limit

Response 200:
{
  "data": [
    {
      "ticket_id": "uuid",
      "ticket_number": "string",
      "subject": "string",
      "status": "OPEN" | "IN_PROGRESS" | "WAITING_CUSTOMER" | "RESOLVED" | "CLOSED",
      "priority": "string",
      "created_at": "ISO-8601 UTC",
      "last_reply_at": "ISO-8601 UTC | null"
    }
  ]
}
```

---

## 2.18 Admin APIs

*(Reference: Spec 09 §8 — extended here)*

### GET /api/v1/admin/dashboard
*(see Spec 09 §8.1)*

### GET /api/v1/admin/tenants
```
Method: GET
Route: /api/v1/admin/tenants
Description: List all platform tenants with health metrics
Authentication: JWT (super_admin role)
Query Params:
  status, plan_tier, search, health_score_max, page, limit

Response 200:
{
  "data": [
    {
      "tenant_id": "uuid",
      "org_name": "string",
      "plan_tier": "string",
      "status": "string",
      "health_score": 0.87,
      "listing_count": 142,
      "seat_count": 8,
      "ai_tokens_used_this_month": 342891,
      "monthly_revenue_cents": 9900,
      "created_at": "ISO-8601 UTC",
      "last_active_at": "ISO-8601 UTC"
    }
  ],
  "pagination": { ... },
  "summary": {
    "total_tenants": 4821,
    "active_tenants": 4640,
    "mrr_cents": 48221900
  }
}
```

### POST /api/v1/admin/tenants/{tenant_id}/suspend
```
Method: POST
Route: /api/v1/admin/tenants/{tenant_id}/suspend
Description: Suspend a tenant account immediately
Authentication: JWT (super_admin)
Idempotency: Required

Request Body:
{
  "reason": string (required, 10-1000 chars),
  "notify_tenant": boolean (default true),
  "suspension_type": "FRAUD" | "PAYMENT" | "POLICY" | "MANUAL"
}

Response 200:
{ "data": { "tenant_id": "uuid", "suspended_at": "ISO-8601 UTC" } }

Side Effects:
  - Suspends all tenant sessions immediately
  - Removes all listings from discovery index
  - Sends suspension email if notify_tenant=true
  - Creates audit log entry

Events Emitted:
  - admin.tenant_suspended
```

### GET /api/v1/admin/moderation/queue
```
Method: GET
Route: /api/v1/admin/moderation/queue
Description: Get human review moderation queue
Authentication: JWT (super_admin or moderator role)
Query Params: priority, type, page, limit

Response 200:
{
  "data": [
    {
      "case_id": "uuid",
      "case_type": "LISTING" | "MESSAGE" | "MEDIA" | "REVIEW",
      "subject_id": "uuid",
      "tenant_id": "uuid",
      "priority": "HIGH" | "NORMAL" | "LOW",
      "ai_confidence_score": 0.87,
      "ai_flags": ["POTENTIAL_SPAM", "MISLEADING_DESCRIPTION"],
      "created_at": "ISO-8601 UTC",
      "sla_due_at": "ISO-8601 UTC",
      "content_preview": "string"
    }
  ],
  "pagination": { ... }
}
```

### POST /api/v1/admin/moderation/cases/{case_id}/decide
```
Method: POST
Route: /api/v1/admin/moderation/cases/{case_id}/decide
Description: Submit a human moderation decision
Authentication: JWT (super_admin or moderator)
Idempotency: Required

Request Body:
{
  "decision": "APPROVE" | "REJECT" | "ESCALATE" (required),
  "reason": string (required for REJECT, 10-2000 chars),
  "policy_violation_codes": ["string"] | null,
  "trust_impact": "NONE" | "MINOR" | "MAJOR" | "CRITICAL" (default "NONE")
}

Response 200:
{ "data": { "case_id": "uuid", "decision": "REJECT", "decided_at": "ISO-8601 UTC" } }

Events Emitted:
  - moderation.decision_made
```

---

# SECTION 3 — SERVICE CONTRACTS

## 3.1 Identity Service Contract

**Public Interface:**
- `POST /api/v1/auth/*` — all authentication endpoints
- `GET /.well-known/jwks.json` — public key publication
- Internal gRPC: `ValidateToken(token: string) → TokenClaims | Error`
- Internal gRPC: `GetUser(user_id: UUID) → UserProfile | Error`
- Internal gRPC: `RevokeSession(session_id: UUID) → void`

**Internal Responsibilities:**
- JWT signature verification (RS256, key rotation every 90 days)
- Session state management (Redis-backed, 15-min access token, 30-day refresh)
- Brute-force detection (sliding window counter per IP + account)
- MFA challenge lifecycle (TOTP verification, backup code consumption)

**State Ownership:**
- Primary: `auth.users`, `auth.sessions`, `auth.mfa_enrollments`, `auth.api_keys`
- Redis: `session:{session_id}` (deny list), `brute_force:{ip}:{email}` (counters)

**Business Rules:**
1. Access token TTL: 900 seconds (15 minutes). Non-configurable per-tenant.
2. Refresh token rotation: each use issues new refresh token; previous immediately invalidated.
3. Replay detection: Redis stores last 100 consumed refresh token hashes per user (24h window)
4. Session limit: max 10 concurrent active sessions per user (oldest evicted on overflow)
5. API key prefix: first 8 chars visible; remainder stored as bcrypt hash (cost 12)

**Failure Handling:**
- Redis unavailable: Fall through to database session validation (slower but safe)
- Supabase Auth unavailable: Return 503 with retry-after header
- JWT signing key unavailable: Return 503; NEVER fall back to unsigned tokens

**Retry Rules:**
- Identity endpoints: No automatic retries (idempotent by design or stateful)

**Idempotency Rules:**
- `POST /register`, `POST /mfa/enroll`: 24h idempotency window
- `POST /login`: Not idempotent (different timestamps per call; does not need key)

**Caching Rules:**
- JWKS public keys: Cache-Control max-age=3600, CDN-cacheable
- User profiles: Cached in Redis for 60s with key `user:{user_id}:profile`
- Permission sets: Cached in Redis for 300s with key `user:{user_id}:tenant:{tenant_id}:perms`

**Concurrency Rules:**
- Session creation: Optimistic locking via unique constraint on session_id
- Brute-force counters: Redis INCR (atomic) + EXPIREAT (sliding window reset)

**Rate Limits:**
- `/auth/login`: 10 req/min per IP, 5 failures → 15-min lock
- `/auth/register`: 10 req/min per IP, 3 req/hour per email
- `/auth/refresh`: 20 req/min per refresh token

**Observability Requirements:**
- Trace every auth request with `auth.method` span attribute
- Metric: `auth.login.success_rate` (counter, by tenant_id)
- Metric: `auth.login.failure_rate` (counter, by failure_reason)
- Metric: `auth.token_refresh.rate` (counter)
- Alert: Login failure rate > 10% over 5min window → PagerDuty P2

---

## 3.2 Listing Service Contract

**Public Interface:**
- `POST/GET/PATCH/DELETE /api/v1/listings/*`
- Internal gRPC: `GetListingSnapshot(listing_id: UUID) → ListingSnapshot | Error`
- Internal gRPC: `BatchGetListingSnapshots(ids: UUID[]) → ListingSnapshot[]`

**Internal Responsibilities:**
- Listing CRUD with version snapshotting
- Status machine enforcement (DRAFT → PENDING_REVIEW → ACTIVE → PAUSED → ARCHIVED)
- Quota enforcement (pre-check before creation)
- Outbox event publishing (transactional, same DB transaction as record creation)

**State Ownership:**
- `marketplace.listings` — live state
- `marketplace.listing_versions` — immutable snapshot log
- `marketplace.listing_status_transitions` — state machine audit log

**Business Rules:**
1. A listing cannot transition from ARCHIVED to any active state (terminal state)
2. A listing with open moderation cases cannot be published (blocked until decision)
3. Re-embedding is required if `title`, `description`, or `tags` change; blocked from discovery until complete
4. A listing cannot be published if its company_id is suspended
5. Bulk imports are rate-limited to 500 listings/batch and 5 batches/hour per tenant

**Failure Handling:**
- Quota check failure: Return 429 QUOTA_EXCEEDED immediately; do not create partial record
- Outbox write failure: Rollback entire transaction (no partial state)
- AI embedding timeout (>30s): Mark listing with `embedding_status: FAILED`; retry via cron

**Retry Rules:**
- Embedding generation: 3 retries with exponential backoff (5s, 15s, 45s)
- Moderation trigger: 3 retries with 30s interval

**Idempotency Rules:**
- `POST /listings`: 24h window; same idempotency key returns same listing_id
- `PATCH /listings/{id}`: 24h window; re-delivery returns same version number

**Caching Rules:**
- Listing detail pages: CDN-cacheable for ANONYMOUS requests only, max-age=120s
- Listing detail (authenticated): Not cached (personalized pricing, sponsored flags)
- Category tree: Cached 1 hour (rarely changes)

**Rate Limits:**
- `POST /listings`: 100 req/hour per tenant
- `GET /listings`: 300 req/min per tenant

---

## 3.3 Search Service Contract

**Public Interface:**
- `POST /api/v1/feed` — personalized feed generation
- `GET /api/v1/search` — text search
- `GET /api/v1/search/suggestions` — typeahead
- `POST /api/v1/interactions` — clickstream ingestion
- Internal gRPC: `GenerateFeed(context: FeedContext) → FeedResult`

**Internal Responsibilities:**
- 4-stage ranking pipeline execution (vector → filter → light rank → neural rerank)
- Search candidate cache management
- Clickstream event ingestion and routing to Kafka
- Exploration/exploitation (ε-greedy MAB, ε=0.10)

**State Ownership:**
- `search_index.search_candidates` — candidate index
- `search_index.feed_generations` — feed audit log
- `search_index.search_queries` — query log
- Redis: `tenant:{tenant_id}:user:{user_id}:preference_vector` (fast-loop preference cache)

**Business Rules:**
1. Every feed request MUST be tenant-scoped; cross-tenant result leakage is a P0 security incident
2. Sponsored listings: max 3 per 25-item feed page (12% cap)
3. Exploration allocation: 10% of feed items reserved for new/unexplored categories
4. Zero-result fallback: Return category-wide trending listings when query yields no candidates
5. Latency budget breach (>100ms): Return cached or degraded result; log latency_breach metric

**Failure Handling:**
- pgvector index unavailable: Fall back to keyword search (PostgreSQL full-text search)
- Neural re-ranker unavailable (AI Service down): Skip Stage 3, use Stage 2 scores
- Redis preference cache miss: Use global category popularity for ranking

**Caching Rules:**
- Anonymous feed by category: Redis 5-min TTL
- Search results by query hash: Redis 2-min TTL (invalidated on new listings in category)
- Typeahead suggestions: Redis 30-min TTL

**Rate Limits:**
- `POST /api/v1/feed`: 60 req/min per user
- `GET /api/v1/search`: 120 req/min per user
- `GET /api/v1/search/suggestions`: 300 req/min per user

---

## 3.4 AI Service Contract

**Public Interface:**
- `POST /api/v1/ai/chat/completions` — LLM completion
- `POST /api/v1/ai/chat/completions/stream` — streaming completion
- `POST /api/v1/ai/embeddings` — embedding generation
- Internal gRPC: `GenerateEmbedding(text: string, model: string) → Vector`
- Internal gRPC: `CheckQuota(tenant_id: UUID, token_estimate: int) → QuotaStatus`

**State Ownership:**
- `ai_ops.inference_logs` — complete inference audit trail
- `ai_ops.semantic_cache` — cached LLM responses
- `ai_ops.model_registry` — available models
- Redis: `tenant:{tenant_id}:token_bucket` (leaky bucket rate limiter)
- Redis: `semantic_cache:{request_hash}` (fast cache lookup)

**Business Rules:**
1. Semantic cache: Hash prompt with SHA-256 → look up embedding similarity ≥0.96 → return cached response
2. Token Guard: Leaky bucket per tenant, refill rate = monthly_limit / (days_in_month × 86400) tokens/second
3. Provider failover order: OpenAI (primary) → Anthropic (secondary) → local Ollama (tertiary, if configured)
4. All AI requests MUST log tenant_id, user_id, model, input/output tokens, cost, cache_hit
5. Content moderation: Run platform AI safety filter before forwarding to external provider

**Failure Handling:**
- OpenAI timeout (>10s): Retry once, then failover to Anthropic
- Anthropic unavailable: Return `503 SERVICE_UNAVAILABLE` with `ai.provider_degraded` event
- Cache write failure: Log warning, continue without cache (graceful degradation)

**Idempotency Rules:**
- Inference requests with same idempotency key: Return cached result from `ai_ops.semantic_cache`

**Rate Limits:**
- Per tenant: Monthly token budget (enforced via Token Guard leaky bucket)
- Per user: 100 req/min for chat; 500 req/min for embeddings

**Observability Requirements:**
- Metric: `ai.inference.latency_ms` (histogram by model, cache_hit)
- Metric: `ai.inference.token_count` (counter by model, direction: input/output)
- Metric: `ai.cache.hit_rate` (gauge)
- Alert: Provider error rate > 5% over 2 min → PagerDuty P1

---

## 3.5 Billing Service Contract

**Public Interface:**
- `GET/POST /api/v1/billing/*`
- `POST /api/webhooks/stripe` — Stripe webhook receiver
- Internal gRPC: `CheckQuota(tenant_id: UUID, resource: string) → QuotaStatus`
- Internal gRPC: `IncrementUsage(tenant_id: UUID, resource: string, amount: int) → void`

**State Ownership:**
- `billing_ledger.*` (append-only; no UPDATE/DELETE)
- `tenant_config.tenant_subscriptions` (subscription state sync)
- `tenant_config.quota_meters` (real-time usage counters)

**Business Rules:**
1. Ledger is IMMUTABLE: No UPDATE or DELETE operations are permitted on `billing_ledger.ledger_entries`
2. Adjustments are credits (negative amounts): Never modify existing entries
3. Stripe is the system of truth for payment state; internal DB reflects Stripe state post-webhook
4. Double-billing prevention: Idempotency key required on all billing mutations; stored for 7 days
5. Grace period: 7 days after payment failure before suspension (notification at day 1, 3, 7)

**Failure Handling:**
- Stripe webhook failure: Return 200 immediately, retry delivery handled by Stripe (up to 72h)
- Quota update failure: Log to dead letter queue; reconcile via cron job every 15 minutes
- Ledger write failure: Rollback; do not charge tenant for unlogged usage

**Idempotency Rules:**
- Stripe webhook events: Idempotent by `stripe_event_id`; check before processing
- Usage increment events: Idempotent by `usage_event_id` (from Kafka event)

**Rate Limits:**
- Billing read APIs: 60 req/min per tenant
- Billing mutation APIs: 10 req/min per tenant

---

## 3.6 Moderation Service Contract

**Public Interface:**
- Internal only (no public APIs; triggered by events)
- Internal gRPC: `SubmitForReview(content_type: string, content_id: UUID) → CaseID`
- Internal gRPC: `GetCaseStatus(case_id: UUID) → CaseStatus`
- Admin: `GET/POST /api/v1/admin/moderation/*`

**State Ownership:**
- `moderation.*`

**Business Rules:**
1. AI pre-screen must complete within 5 minutes; SLA breach escalates to human queue
2. Human review SLA: High priority 4h, Normal 24h, Low 72h
3. False positive threshold: If >15% of AI decisions are overturned by humans in 7-day window → retrain / increase human review rate
4. Content quarantine is immediate on flag; not reversible by listing owner
5. Appeal window: 14 days from decision

**Failure Handling:**
- AI scan timeout: Quarantine listing, escalate to human queue with TIMEOUT flag
- Human queue overflow (>500 pending cases): Page on-call moderator; auto-escalate oldest cases

**Rate Limits:**
- AI scan submissions: 1000/min (system-internal)
- Human decision submissions: 100/min per moderator

---

# SECTION 4 — EVENT ARCHITECTURE

## 4.0 Event Infrastructure Standards

### 4.0.1 Event Envelope Schema (Universal)
```json
{
  "event_id": "uuid-v4",
  "event_type": "domain.event_name",
  "schema_version": 1,
  "producer_service": "listing-service",
  "producer_domain": "marketplace",
  "tenant_id": "uuid | null (null for platform-level events)",
  "actor_id": "uuid | null (user or service identity)",
  "actor_type": "user | service | system",
  "timestamp": "ISO-8601 UTC",
  "correlation_id": "uuid (propagated from originating HTTP request)",
  "causation_id": "uuid (event_id of the event that caused this one)",
  "payload": { ... },
  "metadata": {
    "source": "API | SYSTEM | WEBHOOK | CRON",
    "environment": "production | staging | development",
    "schema_url": "https://events.platform.io/schemas/domain/event_name/v1"
  }
}
```

### 4.0.2 Event Delivery Guarantees
| Event Class | Delivery | Ordering | Consumer |
|:-----------|:---------|:---------|:---------|
| Business Events | At-least-once | Per-tenant ordered | Kafka Consumer Groups |
| Analytics Events | At-least-once | Unordered acceptable | ClickHouse Kafka Engine |
| Realtime Events | At-most-once | Session ordered | Supabase Realtime WAL |
| Audit Events | Exactly-once | Ordered per actor | PostgreSQL append-only |

### 4.0.3 Outbox Pattern Implementation
All business events MUST be written via the Outbox Pattern:
1. Domain service writes business record + outbox entry in same PostgreSQL transaction
2. Outbox Relay Service polls `event_outbox` table every 100ms
3. Relay publishes to Kafka topic; marks outbox entry as `published`
4. Consumer group processes event; updates consumer offset in Kafka

**Outbox Table Schema:**
```sql
CREATE TABLE event_outbox (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      UUID NOT NULL UNIQUE,
  event_type    TEXT NOT NULL,
  topic         TEXT NOT NULL,
  tenant_id     UUID,
  payload       JSONB NOT NULL,
  status        TEXT NOT NULL DEFAULT 'PENDING', -- PENDING | PUBLISHED | FAILED
  attempts      INTEGER NOT NULL DEFAULT 0,
  max_attempts  INTEGER NOT NULL DEFAULT 5,
  next_attempt_at TIMESTAMPTZ DEFAULT now(),
  published_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_outbox_pending ON event_outbox(next_attempt_at) WHERE status = 'PENDING';
```

---

## 4.1 Identity Events

### `identity.user_registered`
```json
{
  "event_type": "identity.user_registered",
  "schema_version": 1,
  "payload": {
    "user_id": "uuid",
    "email": "string (hashed for privacy: SHA-256)",
    "tenant_id": "uuid",
    "organization_id": "uuid",
    "registration_source": "web" | "mobile" | "api" | "invitation",
    "referral_code": "string | null",
    "invitation_id": "uuid | null"
  }
}
```
- **Producer**: Identity Service
- **Consumers**: Analytics Service (new user funnel), Notification Service (welcome email), Billing Service (trial activation)
- **Delivery**: At-least-once
- **Ordering**: Per-tenant ordered
- **Retention**: 2 years

### `identity.user_login_success`
```json
{
  "payload": {
    "user_id": "uuid",
    "tenant_id": "uuid",
    "session_id": "uuid",
    "login_method": "password" | "google" | "github" | "saml" | "api_key",
    "mfa_used": true,
    "device_type": "web" | "mobile" | "api",
    "ip_hash": "string (SHA-256 of IP)"
  }
}
```
- **Producer**: Identity Service
- **Consumers**: Analytics Service, Trust Service (behavioral signal), Audit Service

### `identity.user_login_failed`
```json
{
  "payload": {
    "email_hash": "string (SHA-256)",
    "tenant_id": "uuid | null",
    "failure_reason": "INVALID_PASSWORD" | "ACCOUNT_LOCKED" | "MFA_FAILED" | "ACCOUNT_SUSPENDED",
    "attempt_number": 3,
    "ip_hash": "string",
    "lockout_applied": false
  }
}
```
- **Producer**: Identity Service
- **Consumers**: Trust Service (brute-force signal), Audit Service

### `identity.session_revoked`
```json
{
  "payload": {
    "user_id": "uuid",
    "session_id": "uuid",
    "revocation_reason": "LOGOUT" | "SECURITY_EVENT" | "ADMIN_ACTION" | "INACTIVITY",
    "all_sessions": false
  }
}
```

### `identity.api_key_created`
```json
{
  "payload": {
    "key_id": "uuid",
    "user_id": "uuid",
    "tenant_id": "uuid",
    "key_prefix": "pk_live_abc1",
    "scopes": ["listings:read", "search:query"]
  }
}
```

---

## 4.2 Company Events

### `company.created`
```json
{
  "payload": {
    "company_id": "uuid",
    "tenant_id": "uuid",
    "name": "string",
    "industry": "string",
    "created_by_user_id": "uuid"
  }
}
```
- **Consumers**: Trust Service (trust score initialization), Analytics Service

### `company.verified`
```json
{
  "payload": {
    "company_id": "uuid",
    "tenant_id": "uuid",
    "verification_level": "BASIC" | "KYB" | "ENHANCED",
    "verified_by": "uuid (admin user or automated service)"
  }
}
```
- **Consumers**: Notification Service (verification confirmation), Search Service (trust score boost)

---

## 4.3 User Events

### `user.profile_updated`
```json
{
  "payload": {
    "user_id": "uuid",
    "tenant_id": "uuid",
    "updated_fields": ["full_name", "phone"],
    "email_changed": false
  }
}
```

### `user.kyc_completed`
```json
{
  "payload": {
    "user_id": "uuid",
    "kyc_level": "BASIC" | "ENHANCED",
    "verification_provider": "string"
  }
}
```
- **Consumers**: Trust Service, Billing Service (unlock higher limits)

---

## 4.4 Listing Events

### `listing.created`
```json
{
  "payload": {
    "listing_id": "uuid",
    "tenant_id": "uuid",
    "company_id": "uuid | null",
    "category_id": "uuid",
    "title": "string",
    "listing_type": "AGENT" | "TOOL" | "DATASET" | "SERVICE" | "TEMPLATE",
    "price_cents": 29900,
    "price_model": "SUBSCRIPTION",
    "created_by_user_id": "uuid",
    "embedding_required": true
  }
}
```
- **Producer**: Listing Service
- **Consumers**: 
  - AI Service → triggers embedding generation
  - Moderation Service → triggers content scan
  - Quota Service → increments listing count meter
  - Analytics Service → records creation event
- **Delivery**: At-least-once
- **Ordering**: Per-tenant ordered

### `listing.updated`
```json
{
  "payload": {
    "listing_id": "uuid",
    "tenant_id": "uuid",
    "changed_fields": ["title", "description", "price_cents"],
    "new_version": 3,
    "re_embedding_required": true,
    "re_moderation_required": false
  }
}
```
- **Consumers**: AI Service (conditional re-embedding), Search Service (candidate refresh)

### `listing.published`
```json
{
  "payload": {
    "listing_id": "uuid",
    "tenant_id": "uuid",
    "published_at": "ISO-8601 UTC",
    "embedding_ready": true,
    "category_id": "uuid",
    "is_sponsored": false
  }
}
```
- **Consumers**: Search Service (add to candidate index), Recommendation Service (item similarity), Notification Service (saved search alerts), Analytics Service

### `listing.paused`
```json
{
  "payload": {
    "listing_id": "uuid",
    "tenant_id": "uuid",
    "paused_by": "user | system | moderation",
    "paused_at": "ISO-8601 UTC"
  }
}
```
- **Consumers**: Search Service (remove from index), Recommendation Service (remove from snapshots)

### `listing.archived`
```json
{
  "payload": {
    "listing_id": "uuid",
    "tenant_id": "uuid",
    "archived_at": "ISO-8601 UTC",
    "archived_by": "user | system | admin"
  }
}
```
- **Consumers**: Search Service, Recommendation Service, Media Service (orphan cleanup), Quota Service (decrement counter), Favorites (notify favorited users)

### `listing.status_changed`
```json
{
  "payload": {
    "listing_id": "uuid",
    "tenant_id": "uuid",
    "from_status": "DRAFT",
    "to_status": "PENDING_REVIEW",
    "actor_id": "uuid",
    "actor_type": "user | system | moderator",
    "reason": "string | null"
  }
}
```

---

## 4.5 Media Events

### `media.uploaded`
```json
{
  "payload": {
    "media_id": "uuid",
    "listing_id": "uuid | null",
    "tenant_id": "uuid",
    "uploader_user_id": "uuid",
    "media_type": "IMAGE" | "VIDEO" | "DOCUMENT",
    "file_size_bytes": 2097152,
    "storage_path": "string",
    "content_type": "image/jpeg"
  }
}
```
- **Consumers**: Media Service (processing pipeline), Moderation Service (safety scan), Quota Service (storage meter)

### `media.processed`
```json
{
  "payload": {
    "media_id": "uuid",
    "cdn_url": "https://cdn.platform.io/...",
    "thumbnail_url": "string | null",
    "responsive_urls": {
      "320w": "string",
      "640w": "string",
      "1280w": "string"
    },
    "processing_time_ms": 1240
  }
}
```

### `media.moderation_flagged`
```json
{
  "payload": {
    "media_id": "uuid",
    "tenant_id": "uuid",
    "flag_reason": "EXPLICIT_CONTENT" | "VIOLENCE" | "SPAM" | "PROHIBITED_ITEM",
    "confidence_score": 0.94
  }
}
```

---

## 4.6 Interaction Events

### `interaction.click`
```json
{
  "payload": {
    "session_id": "uuid",
    "feed_id": "uuid | null",
    "listing_id": "uuid",
    "tenant_id": "uuid",
    "user_id": "uuid | null",
    "position": 4,
    "surface": "FEED" | "SEARCH" | "RECOMMENDATIONS" | "RELATED",
    "timestamp": "ISO-8601 UTC"
  }
}
```
- **Consumers**: Analytics Service, Personalization Service (fast-loop update), Search Service (click signal)

### `interaction.impression`
```json
{
  "payload": {
    "session_id": "uuid",
    "feed_id": "uuid",
    "listing_id": "uuid",
    "tenant_id": "uuid",
    "user_id": "uuid | null",
    "position": 2,
    "viewport_percent": 0.85,
    "dwell_time_ms": 3400
  }
}
```

### `interaction.favorite`
```json
{
  "payload": {
    "listing_id": "uuid",
    "user_id": "uuid",
    "tenant_id": "uuid",
    "action": "ADD" | "REMOVE",
    "collection_id": "uuid | null"
  }
}
```

---

## 4.7 Recommendation Events

### `recommendation.snapshot_generated`
```json
{
  "payload": {
    "snapshot_id": "uuid",
    "user_id": "uuid",
    "tenant_id": "uuid",
    "recommendation_type": "for_you" | "similar" | "trending" | "cross_sell",
    "listing_count": 25,
    "model_version": "v2.3.1",
    "generation_time_ms": 340
  }
}
```

### `recommendation.feedback_received`
```json
{
  "payload": {
    "snapshot_id": "uuid",
    "user_id": "uuid",
    "listing_id": "uuid",
    "action": "CLICKED" | "DISMISSED" | "FAVORITED" | "CONVERTED",
    "position": 3,
    "surface": "homepage"
  }
}
```

---

## 4.8 Analytics Events

*(Analytics consumes events from all domains — it produces none)*

**Key Analytics-tracked Events:**
- All `listing.*` events — for listing lifecycle analytics
- All `interaction.*` events — for engagement metrics
- All `search.*` events — for search analytics
- `lead.created`, `lead.converted` — for conversion funnel
- `billing.*` — for revenue analytics
- `ai.inference_completed` — for AI usage metrics

---

## 4.9 Billing Events

### `billing.subscription_created`
```json
{
  "payload": {
    "subscription_id": "uuid",
    "tenant_id": "uuid",
    "org_id": "uuid",
    "plan_tier": "professional",
    "billing_cycle": "monthly",
    "monthly_amount_cents": 9900,
    "trial_ends_at": "ISO-8601 UTC | null",
    "stripe_subscription_id": "sub_xxx"
  }
}
```
- **Consumers**: RBAC Service (activate plan features), Quota Service (set quota limits), Notification Service (welcome email)

### `billing.invoice_generated`
```json
{
  "payload": {
    "invoice_id": "uuid",
    "tenant_id": "uuid",
    "stripe_invoice_id": "in_xxx",
    "amount_cents": 9900,
    "currency": "usd",
    "due_date": "ISO-8601 date",
    "line_items": [ { "description": "string", "amount_cents": 9900 } ]
  }
}
```

### `billing.invoice_payment_failed`
```json
{
  "payload": {
    "invoice_id": "uuid",
    "tenant_id": "uuid",
    "amount_cents": 9900,
    "failure_reason": "CARD_DECLINED" | "INSUFFICIENT_FUNDS" | "CARD_EXPIRED",
    "retry_count": 1,
    "next_retry_at": "ISO-8601 UTC",
    "grace_period_ends_at": "ISO-8601 UTC"
  }
}
```
- **Consumers**: Notification Service (payment failure alert), Organization Service (suspension countdown)

### `billing.quota_reset`
```json
{
  "payload": {
    "tenant_id": "uuid",
    "resource_types": ["ai_tokens", "api_calls"],
    "new_period_start": "ISO-8601 UTC",
    "new_period_end": "ISO-8601 UTC",
    "new_limits": {
      "ai_tokens": 1000000,
      "api_calls": 100000
    }
  }
}
```
- **Consumers**: AI Service (reset token bucket), Quota Service (reset meters)

---

## 4.10 Moderation Events

### `moderation.case_opened`
```json
{
  "payload": {
    "case_id": "uuid",
    "content_type": "LISTING" | "MESSAGE" | "MEDIA" | "REVIEW",
    "content_id": "uuid",
    "tenant_id": "uuid",
    "trigger": "AUTO_FLAG" | "USER_REPORT" | "POLICY_VIOLATION",
    "initial_confidence": 0.87,
    "priority": "HIGH" | "NORMAL" | "LOW"
  }
}
```

### `moderation.decision_made`
```json
{
  "payload": {
    "case_id": "uuid",
    "content_type": "LISTING",
    "content_id": "uuid",
    "tenant_id": "uuid",
    "decision": "APPROVED" | "REJECTED" | "ESCALATED",
    "decision_maker_type": "AI" | "HUMAN",
    "decision_maker_id": "uuid",
    "policy_violations": ["MISLEADING_CONTENT"],
    "trust_impact": "NONE" | "MINOR" | "MAJOR" | "CRITICAL",
    "appeal_eligible": true,
    "appeal_deadline_at": "ISO-8601 UTC"
  }
}
```
- **Consumers**: Listing Service (update status), Trust Service (update trust score), Notification Service (notify listing owner)

---

## 4.11 Trust Events

### `trust.trust_score_updated`
```json
{
  "payload": {
    "entity_type": "TENANT" | "COMPANY" | "USER",
    "entity_id": "uuid",
    "tenant_id": "uuid",
    "previous_score": 0.78,
    "new_score": 0.82,
    "trigger_event": "moderation.decision_made",
    "trigger_event_id": "uuid",
    "change_factors": {
      "moderation_positive_delta": 0.04
    }
  }
}
```
- **Consumers**: Search Service (update ranking signals), Company Service (update profile trust display), Notification Service (significant score changes)

### `trust.fraud_detected`
```json
{
  "payload": {
    "actor_id": "uuid",
    "actor_type": "USER" | "TENANT" | "COMPANY",
    "tenant_id": "uuid",
    "risk_score": 0.94,
    "confidence": 0.87,
    "fraud_signals": [
      "RAPID_LISTING_CREATION",
      "UNUSUAL_PRICE_PATTERN",
      "MULTIPLE_ACCOUNT_INDICATORS"
    ],
    "recommended_action": "QUARANTINE" | "MANUAL_REVIEW" | "IMMEDIATE_SUSPEND",
    "auto_action_applied": "QUARANTINE"
  }
}
```
- **Consumers**: Super Admin Service (fraud queue), Organization Service (suspension trigger), Notification Service (alert tenant)

### `trust.account_locked`
```json
{
  "payload": {
    "tenant_id": "uuid",
    "lock_reason": "FRAUD_DETECTION" | "REPEATED_VIOLATIONS" | "MANUAL",
    "locked_by": "uuid | system",
    "unlock_process": "MANUAL_ADMIN_REVIEW"
  }
}
```

---

## 4.12 Support Events

### `support.ticket_created`
```json
{
  "payload": {
    "ticket_id": "uuid",
    "ticket_number": "TKT-20260530-00142",
    "tenant_id": "uuid",
    "requester_id": "uuid",
    "category": "BILLING",
    "priority": "HIGH",
    "sla_due_at": "ISO-8601 UTC"
  }
}
```

### `support.sla_breached`
```json
{
  "payload": {
    "ticket_id": "uuid",
    "ticket_number": "string",
    "priority": "HIGH",
    "sla_target_hours": 4,
    "elapsed_hours": 4.5,
    "assigned_agent_id": "uuid | null"
  }
}
```

---

## 4.13 AI Events

### `ai.inference_completed`
```json
{
  "payload": {
    "inference_id": "uuid",
    "tenant_id": "uuid",
    "user_id": "uuid | null",
    "model_id": "uuid",
    "model_name": "gpt-4o-mini",
    "input_tokens": 842,
    "output_tokens": 312,
    "total_tokens": 1154,
    "cost_usd": 0.000812,
    "latency_ms": 1240,
    "cache_hit": false,
    "task_type": "CHAT" | "EMBEDDING" | "MODERATION" | "ENRICHMENT" | "SCORING"
  }
}
```
- **Consumers**: Billing Service (token metering), Analytics Service (AI usage dashboard), Quota Service (token increment)

### `ai.embedding_generated`
```json
{
  "payload": {
    "inference_id": "uuid",
    "tenant_id": "uuid",
    "entity_type": "LISTING" | "QUERY" | "USER_PROFILE" | "MESSAGE",
    "entity_id": "uuid",
    "model": "text-embedding-3-small",
    "dimensions": 1536,
    "input_tokens": 420
  }
}
```
- **Consumers**: Search Service (marks candidate as vector-searchable), Listing Service (update embedding_status)

### `ai.quota_exceeded`
```json
{
  "payload": {
    "tenant_id": "uuid",
    "resource": "ai_tokens",
    "current_usage": 1000045,
    "limit": 1000000,
    "period_end": "ISO-8601 UTC",
    "overage_percentage": 0.0045
  }
}
```
- **Consumers**: Notification Service (quota exceeded alert), Quota Service (enforce hard block)

### `ai.provider_degraded`
```json
{
  "payload": {
    "provider": "openai" | "anthropic" | "google",
    "status": "degraded" | "down",
    "error_rate_pct": 12.4,
    "latency_p95_ms": 8400,
    "failover_activated": true,
    "failover_provider": "anthropic"
  }
}
```
- **Consumers**: Monitoring Service, Super Admin Service (dashboard alert)

---

## 4.14 Admin Events

### `admin.tenant_suspended`
```json
{
  "payload": {
    "tenant_id": "uuid",
    "suspended_by_admin_id": "uuid",
    "suspension_reason": "POLICY_VIOLATION",
    "suspension_type": "MANUAL",
    "notify_tenant": true,
    "suspended_at": "ISO-8601 UTC"
  }
}
```
- **Consumers**: Audit Service, Notification Service, Trust Service

### `admin.global_announcement_published`
```json
{
  "payload": {
    "announcement_id": "uuid",
    "title": "string",
    "body": "string",
    "severity": "INFO" | "WARNING" | "CRITICAL",
    "target_plan_tiers": ["professional", "business"] | null (null = all),
    "expires_at": "ISO-8601 UTC | null"
  }
}
```
- **Consumers**: Notification Service, Realtime Service (broadcast to admin channel)

### `admin.trust_override_applied`
```json
{
  "payload": {
    "entity_type": "TENANT" | "USER" | "COMPANY",
    "entity_id": "uuid",
    "previous_score": 0.34,
    "override_score": 0.75,
    "override_reason": "string",
    "admin_id": "uuid",
    "expires_at": "ISO-8601 UTC | null"
  }
}
```
