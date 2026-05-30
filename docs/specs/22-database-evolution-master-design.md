# SPEC 22 — DATABASE EVOLUTION MASTER DESIGN

> **Basis**: [PLANNER.md](file:///home/mohal665544/pr1/PLANNER.md) — Master Platform Blueprint  
> **Predecessor Specs**: [Spec 02](file:///home/mohal665544/pr1/docs/specs/02-master-database-architecture.md), [Spec 03](file:///home/mohal665544/pr1/docs/specs/03-multi-tenant-data-model.md), [Spec 04](file:///home/mohal665544/pr1/docs/specs/04-marketplace-data-model.md)  
> **Status**: Execution-Ready — Enterprise-Grade  
> **Document Class**: Database Evolution Architecture  
> **Scope**: Evolutionary — existing Supabase foundation → Enterprise-Scale AI Marketplace OS  

---

## FOUNDATIONAL CONTEXT

This document is not a greenfield database design. It is an **evolution specification** — a structured, phase-gated transformation plan for an existing Supabase PostgreSQL foundation. The existing schema contains: `users`, `companies`, `listings`, `user_interactions`, `analytics_snapshots`, `ai_insights`, `notifications`, `conversations`, `messages`, `audit_logs`, `roles_permissions`, and `team_invites`. RLS, authentication, multi-tenancy, and a marketplace foundation are already operational.

The evolution target is a **production-grade AI-Native Marketplace Operating System** with the operational profile of:
- **Amazon Marketplace** — Catalog intelligence at scale
- **Airbnb** — Trust infrastructure and host/guest dynamics
- **TikTok** — Discovery pipelines, signal-driven ranking
- **Spotify** — Personalization loops, preference evolution
- **Stripe** — Financial ledger integrity and governance

---

## SECTION 1 — MASTER DATA ARCHITECTURE

### 1.1 Domain Map Overview

The platform's database is organized into **15 functional domains**, each with strict ownership, boundary, and lifecycle rules. The domains are grouped into three architectural tiers:

```
┌──────────────────────────────────────────────────────────────────┐
│  TIER 1 — KERNEL DOMAINS (Non-AI, Must Remain 100% Operational) │
│  Identity · Tenant · Governance · Billing                        │
├──────────────────────────────────────────────────────────────────┤
│  TIER 2 — MARKETPLACE DOMAINS (Core Business Logic)              │
│  Marketplace · Search · Trust · Moderation · Notifications       │
├──────────────────────────────────────────────────────────────────┤
│  TIER 3 — COGNITIVE DOMAINS (AI-Dependent, Degradable)           │
│  AI · Discovery · Recommendation · Personalization               │
│  Analytics · Realtime · Experimentation                           │
└──────────────────────────────────────────────────────────────────┘
```

Tier 1 domains have zero dependencies on Tier 3. If all AI/cognitive services fail, authentication, billing, listing reads, and core marketplace functions must remain fully operational.

---

### 1.2 Domain Catalog

#### DOMAIN 1: Identity Domain

| Attribute | Value |
|:----------|:------|
| **Schema** | `auth` |
| **Purpose** | Manages all authentication, session state, API key issuance, MFA enrollments, and cryptographic identity claims |
| **Ownership** | Identity Service (exclusive write authority) |
| **Boundaries** | Never writes outside `auth` schema. No other domain writes into `auth`. Cross-domain reads happen only via user_id UUID references |
| **Lifecycle** | Users are created at registration. Soft-deleted on account closure. Hard-deleted 90 days after soft-delete (GDPR compliance) |
| **Tenant Isolation** | Users exist at the platform level. Tenant membership is in `tenant_config`. The `auth` schema itself is NOT tenant-scoped |
| **Future Scalability** | Can be extracted to a dedicated identity microservice (e.g., Keycloak, Auth0 integration, or custom Go/OAuth2 service) without impacting other domains |

#### DOMAIN 2: Tenant Domain

| Attribute | Value |
|:----------|:------|
| **Schema** | `tenant_config` |
| **Purpose** | Controls workspace provisioning, plan entitlements, feature flag assignment, custom domain routing, and membership management |
| **Ownership** | Tenant Service (exclusive write authority) |
| **Boundaries** | All other domains reference `tenant_id` as a UUID foreign key but never write into `tenant_config` |
| **Lifecycle** | Tenant goes through: `provisioning` → `active` → `suspended` (optional) → `deprovisioning` → `archived` |
| **Tenant Isolation** | The `tenant_config` schema itself is not RLS-isolated (it IS the isolation authority). Super Admin has unrestricted read access |
| **Future Scalability** | Routing tables can be cached in Redis or Cloudflare KV for sub-millisecond tenant resolution at the edge |

#### DOMAIN 3: Marketplace Domain

| Attribute | Value |
|:----------|:------|
| **Schema** | `marketplace` |
| **Purpose** | Core listing catalog, category taxonomy, attribute system, company profiles, agent registrations, project groupings, reviews, and the complete listing lifecycle |
| **Ownership** | Marketplace Service (write authority); Discovery Service (read-only on listings and attributes) |
| **Boundaries** | Receives `tenant_id` from JWT claims. Publishes listing lifecycle events to the event outbox. Does NOT query AI, Discovery, or Billing directly |
| **Lifecycle** | Listings: `draft` → `pending_review` → `active` → `paused` → `archived`. Versions are immutable snapshots |
| **Tenant Isolation** | Full RLS on all tables via `tenant_id` column |
| **Future Scalability** | Listing catalog partitioned quarterly. At 10M+ listings, extract to a dedicated catalog service with a materialized view read layer |

#### DOMAIN 4: Discovery Domain

| Attribute | Value |
|:----------|:------|
| **Schema** | `search_index` |
| **Purpose** | Stores pre-computed search candidates, ranking signals, feed logs, query logs, and behavioral engagement signals used to drive the discovery pipeline |
| **Ownership** | Discovery Engine (write authority for ranking outputs); AI Service (contributes ranking signals via event mesh) |
| **Boundaries** | Reads from `marketplace` listings via materialized snapshots. Does NOT write back to `marketplace`. Publishes `feed.generated` events |
| **Lifecycle** | Search candidates are rebuilt on listing changes. Feed logs are purged after 30 days. Query logs retained 90 days for analytics |
| **Tenant Isolation** | All candidates and logs are tenant-scoped via `tenant_id` |
| **Future Scalability** | At 5M+ active listings, extract vector index to a dedicated pgvector cluster or Pinecone/Milvus. Search candidates move to Redis at high QPS |

#### DOMAIN 5: AI Domain

| Attribute | Value |
|:----------|:------|
| **Schema** | `ai_ops` |
| **Purpose** | Manages the complete AI operational layer: model registry, prompt registry, inference logs, semantic cache, token usage metering, AI experiments, provider health, and AI governance policies |
| **Ownership** | AI Infrastructure Service (exclusive write authority) |
| **Boundaries** | Receives inference requests from all domains. Writes usage events to the event outbox for billing consumption. Does NOT modify domain business data |
| **Lifecycle** | Prompt versions are immutable once published. Inference logs retained 90 days (then archived to ClickHouse). Cache entries have 7-day TTL |
| **Tenant Isolation** | Usage logs, cache entries, and policies are all `tenant_id` scoped |
| **Future Scalability** | Inference cache migrates to Redis with vector similarity lookup. At high volume, extract to a standalone AI Gateway with dedicated token metering workers |

#### DOMAIN 6: Recommendation Domain

| Attribute | Value |
|:----------|:------|
| **Schema** | `recommendations` |
| **Purpose** | Stores recommendation results, recommendation model outputs, cross-sell candidate snapshots, related listing associations, and recommendation feedback signals |
| **Ownership** | Recommendation Engine (write authority) |
| **Boundaries** | Reads from `marketplace` (listing metadata) and `personalization` (user profiles). Publishes recommendation served events to analytics |
| **Lifecycle** | Recommendation snapshots are refreshed hourly per user. Stale snapshots (>24h) are dropped. Feedback signals retained 180 days |
| **Tenant Isolation** | All recommendation outputs are tenant-scoped |
| **Future Scalability** | Recommendation snapshots move to Redis sorted sets for O(1) retrieval. Model outputs cached in a dedicated ML feature store |

#### DOMAIN 7: Personalization Domain

| Attribute | Value |
|:----------|:------|
| **Schema** | `personalization` |
| **Purpose** | Manages the complete user behavior profile: preference vectors, interaction histories, affinity scores, session signals, and the adaptive learning state for each user |
| **Ownership** | Intelligence Engine (write authority for slow-loop updates); Event consumers update fast-loop state in Redis (not in this schema) |
| **Boundaries** | Reads from `marketplace` for category affinity mapping. Never writes to other schemas. The fast-loop preference vector lives in Redis; this schema stores the slow-loop persistent state |
| **Lifecycle** | Preference vectors are updated by the daily batch job. Session signals (fast-loop) are ephemeral in Redis (TTL: 24h). Persistent profiles retained for the duration of the user's account |
| **Tenant Isolation** | Full tenant-scoping. User profiles cannot cross tenant boundaries |
| **Future Scalability** | Preference vectors at scale migrate to a dedicated ML feature store (e.g., Feast). The Redis layer handles real-time updates |

#### DOMAIN 8: Analytics Domain

| Attribute | Value |
|:----------|:------|
| **Schema** | `analytics` (PostgreSQL) + ClickHouse (external) |
| **Purpose** | The PostgreSQL `analytics` schema stores pre-aggregated snapshots and KPI materialized views. Raw event streams flow to ClickHouse via Kafka for OLAP queries |
| **Ownership** | Analytics Service (write authority on snapshots); Kafka consumers populate ClickHouse |
| **Boundaries** | Analytics is a write-once, read-many domain. It consumes events from ALL other domains via the event mesh. It NEVER writes back to business domains |
| **Lifecycle** | Real-time events flow in continuously. Snapshots generated hourly/daily. ClickHouse rows retained 2 years. Aggregated summaries retained indefinitely |
| **Tenant Isolation** | All analytics rows include `tenant_id`. ClickHouse queries are always filtered by tenant |
| **Future Scalability** | PostgreSQL analytics schema can be deprecated when ClickHouse reaches full coverage. Currently serves as a fallback for simple reporting |

#### DOMAIN 9: Trust & Safety Domain

| Attribute | Value |
|:----------|:------|
| **Schema** | `trust_registry` |
| **Purpose** | Maintains trust scores, fraud signals, verification records, quarantine states, moderation decisions, and the complete behavioral anomaly detection dataset |
| **Ownership** | Trust & Safety Service (exclusive write authority) |
| **Boundaries** | Reads listing and user data for risk evaluation. Writes quarantine flags that are consumed by the Marketplace domain. Publishes `trust.fraud_detected` and `trust.trust_score_updated` events |
| **Lifecycle** | Trust scores are recalculated on every significant behavioral event. Fraud signals are retained 1 year. Moderation decisions retained 2 years. Escalation records retained 1 year |
| **Tenant Isolation** | Trust scores and fraud signals are tenant-scoped. Platform-wide signals (cross-tenant fraud patterns) are stored in separate un-tenanted tables accessible only by Super Admin |
| **Future Scalability** | Fraud signal processing at high volume moves to a streaming ML pipeline (e.g., Flink). Trust score computation can be offloaded to a dedicated risk scoring microservice |

#### DOMAIN 10: Moderation Domain

| Attribute | Value |
|:----------|:------|
| **Schema** | `moderation` |
| **Purpose** | Manages the complete content moderation workflow: AI scan results, human review queues, case management, decision records, appeal workflows, and reviewer performance tracking |
| **Ownership** | Moderation Service (exclusive write authority) |
| **Boundaries** | Receives quarantine signals from Trust & Safety. Writes moderation decisions that update listing status in Marketplace domain via events. Publishes `moderation.decision_made` events |
| **Lifecycle** | Cases are created on quarantine. Open cases resolved by AI (<5 minutes) or human reviewers (<24h). Decisions archived for 2 years. Appeals retained 2 years |
| **Tenant Isolation** | Cases are tenant-scoped. Reviewer assignments are platform-level (reviewers work across all tenants) |
| **Future Scalability** | AI pre-screening at high volume moves to dedicated GPU workers. Human review queue can integrate with external moderation platforms |

#### DOMAIN 11: Billing Domain

| Attribute | Value |
|:----------|:------|
| **Schema** | `billing_ledger` |
| **Purpose** | The financial system of record: subscription management, invoice generation, usage metering, credit tracking, the write-only financial ledger, payment method storage, Stripe sync, and promoted listing campaigns |
| **Ownership** | Billing Service (exclusive write authority). The ledger itself is append-only and owned by a dedicated ledger writer |
| **Boundaries** | Consumes `monetization.*` events from all domains for usage metering. Syncs with Stripe via webhook. Publishes `billing.invoice_generated` and `monetization.quota_exceeded` events |
| **Lifecycle** | Subscriptions are continuous. Invoices generated monthly. Ledger entries are write-only (no deletes, no updates). Credits expire per plan rules |
| **Tenant Isolation** | Full tenant and organization isolation. Organization-level invoices aggregate tenant-level usage |
| **Future Scalability** | Extract ledger writer to a dedicated service with dedicated append-only Postgres instance for financial integrity. At global scale, consider an event-sourced ledger (e.g., EventStoreDB) |

#### DOMAIN 12: Notifications Domain

| Attribute | Value |
|:----------|:------|
| **Schema** | `notifications` |
| **Purpose** | Manages notification templates, delivery records, in-app notification inbox, push subscriptions, preference rules, and notification analytics |
| **Ownership** | Notification Service (exclusive write authority) |
| **Boundaries** | Consumes events from all domains to trigger notifications. Does NOT initiate business logic. Writes only to `notifications` schema |
| **Lifecycle** | In-app notifications retained 90 days. Email delivery logs retained 30 days. Push subscription records retained until revocation. Templates versioned and immutable once published |
| **Tenant Isolation** | All notifications are tenant-scoped. Template management is per-tenant with platform defaults |
| **Future Scalability** | Notification delivery workers scale horizontally. Email/SMS delivery integrations (SendGrid, Twilio) behind ACL wrappers |

#### DOMAIN 13: Realtime Domain

| Attribute | Value |
|:----------|:------|
| **Schema** | `realtime_state` |
| **Purpose** | Maintains WebSocket channel registrations, presence records, realtime session tracking, and the channel topology for Supabase Realtime |
| **Ownership** | Realtime Infrastructure (write authority for presence/channels); Supabase Realtime manages connection state natively |
| **Boundaries** | Reads WAL changes from all other schemas to broadcast updates. Does NOT write business data. Manages channel subscription records only |
| **Lifecycle** | Presence records have 30-second TTL (refreshed on heartbeat). Channel subscriptions are session-scoped. Realtime logs retained 24 hours |
| **Tenant Isolation** | Channel names are tenant-scoped: `tenant:{tenant_id}:*`. Cross-tenant broadcast is forbidden |
| **Future Scalability** | At 100K+ concurrent connections, extract to dedicated Elixir/Phoenix socket servers. Use Redis PubSub as the broadcast backbone |

#### DOMAIN 14: Governance Domain

| Attribute | Value |
|:----------|:------|
| **Schema** | `governance` |
| **Purpose** | The Super Admin control plane: audit logs, system configuration, schema migration tracking, global announcements, admin action logs, compliance records, and access review management |
| **Ownership** | Super Admin / Platform Operators only (write authority). Platform-level audit writers are the only automated writers |
| **Boundaries** | Reads from all schemas for audit and compliance purposes. Writes only to `governance`. Super Admin bypass policies exist in all other schemas to enable audit reads |
| **Lifecycle** | Audit logs retained 3 years. System configs versioned indefinitely. Admin action logs retained 3 years. Migration records retained indefinitely |
| **Tenant Isolation** | Governance schema is NOT tenant-scoped — it operates at the platform level. Super Admin access only |
| **Future Scalability** | Audit log volume at scale (100M+ entries) migrates to dedicated append-only store or ClickHouse for compliance reporting |

#### DOMAIN 15: Experimentation Domain

| Attribute | Value |
|:----------|:------|
| **Schema** | `experimentation` |
| **Purpose** | Manages A/B test experiment definitions, variant configurations, user assignment records, experiment metrics, multi-armed bandit state, and experiment lifecycle management |
| **Ownership** | Experimentation Service (write authority for assignments and results); Product/AI teams write experiment definitions |
| **Boundaries** | Reads user IDs from Identity and tenant context from Tenant domain. Writes assignments to its own schema. Discovery and AI domains READ experiment assignments to adjust behavior. Publishes `experiment.variant_assigned` events |
| **Lifecycle** | Experiments run for defined durations. User assignments retained for 6 months after experiment completion. Results retained indefinitely. Multi-armed bandit state updated continuously |
| **Tenant Isolation** | Experiments are tenant-scoped. Platform-level experiments (affecting all tenants) are in separate un-tenanted tables |
| **Future Scalability** | Assignment lookup migrates to Redis for O(1) access. At scale, integrate with a dedicated experimentation platform (e.g., Statsig, LaunchDarkly) |

---

## SECTION 2 — DOMAIN DATA OWNERSHIP MODEL

### 2.1 Data Ownership Matrix

| Domain | Source of Truth | Write Owners | Read Owners | Cross-Domain Access Pattern | Forbidden Access |
|:-------|:---------------|:-------------|:------------|:---------------------------|:----------------|
| **Identity** | `auth.users` | Identity Service | Identity Service, all (user_id ref only) | Event-based user metadata sync | No domain may write to `auth` |
| **Tenant** | `tenant_config.tenants` | Tenant Service | Tenant Service, Edge Gateway (cached) | REST API + event-based plan sync | No domain may write to `tenant_config` |
| **Marketplace** | `marketplace.listings` | Marketplace Service | Discovery (read snapshots), Analytics (events) | Materialized snapshots for Discovery | Discovery cannot update listing status |
| **Discovery** | `search_index.search_candidates` | Discovery Engine | Discovery Engine, API Gateway | Event-driven candidate refresh | Marketplace cannot query search_index directly |
| **AI** | `ai_ops.inference_logs` | AI Infrastructure Service | AI Service, Billing (via events) | Token usage events to Billing | No domain calls AI DB directly |
| **Recommendations** | `recommendations.recommendation_results` | Recommendation Engine | Recommendation Engine, API Gateway | REST endpoint for rec delivery | Marketplace cannot query recommendations directly |
| **Personalization** | `personalization.user_behavior_profiles` | Intelligence Engine (slow loop) | Discovery, Recommendation (via Redis fast loop) | Redis cache for hot profiles | Tenants cannot read other tenants' profiles |
| **Analytics** | `analytics.*` + ClickHouse | Analytics Service, Kafka consumers | Analytics Service, Super Admin, Tenant dashboards | Read-only event consumer pattern | Analytics cannot write to any business domain |
| **Trust** | `trust_registry.trust_scores` | Trust Service | Trust Service, Discovery (score signals), Marketplace | Trust score published via events | No domain modifies trust scores except Trust Service |
| **Moderation** | `moderation.moderation_cases` | Moderation Service | Moderation Service, Super Admin | Decision events update Marketplace via outbox | Tenants cannot see other tenants' cases |
| **Billing** | `billing_ledger.ledger_entries` | Billing Service (append-only) | Billing Service, Super Admin | Usage events consumed from mesh | No domain updates the ledger directly |
| **Notifications** | `notifications.notification_records` | Notification Service | Notification Service, Tenant dashboards | Event-driven notification triggers | No domain triggers notifications directly |
| **Realtime** | `realtime_state.channel_subscriptions` | Realtime Infrastructure | Realtime Infrastructure, WebSocket Gateway | WAL-based change propagation | No domain writes to realtime schema |
| **Governance** | `governance.audit_logs` | Platform Audit Writers, Super Admin | Super Admin, Compliance Officers | Cross-schema SELECT with admin bypass | No service bypasses audit logging |
| **Experimentation** | `experimentation.experiments` | Experimentation Service | Discovery (variant reads), AI (variant reads) | Assignment lookup via Redis cache | Tenants cannot access other tenants' experiments |

### 2.2 Anti-Corruption Boundary Rules

| Rule | Description | Enforcement |
|:-----|:-----------|:------------|
| **Direct DB Access Ban** | No service connects to a database schema it doesn't own | Database role permissions (`GRANT` only to owning service role) |
| **No Synchronous Cross-Domain Transactions** | 2-Phase Commit across domain boundaries is forbidden | Architecture review gate + Event Outbox pattern |
| **Event-Only State Sync** | Cross-domain state changes must flow through the Event Mesh | Code review + architectural linting |
| **Read Snapshots Not Live Tables** | Discovery reads listing snapshots, not the live `marketplace.listings` table | Materialized view pattern enforced in query builders |
| **ACL Wrapper for External APIs** | Stripe, OpenAI, and other external APIs are always wrapped in an ACL adapter | No raw external SDK calls in domain services |
| **Immutable Ledger** | Billing ledger is append-only. No `UPDATE` or `DELETE` operations permitted on ledger entries | Database role: `GRANT INSERT ON billing_ledger.ledger_entries TO platform_service_billing` (no UPDATE/DELETE) |

---

## SECTION 3 — COMPLETE ENTITY INVENTORY

### 3.1 Identity Domain Entities

#### Core Entities

| Entity | Type | Description | Lifecycle |
|:-------|:-----|:-----------|:---------|
| `users` | Aggregate Root | Core user identity. Contains: `user_id`, `email`, `display_name`, `avatar_url`, `phone`, `status` (active, suspended, deleted), `kyc_status`, `created_at`, `updated_at`, `deleted_at`, `last_login_at`, `email_verified_at`, `phone_verified_at`, `metadata` (JSONB) | Created at registration. Soft-deleted on closure. Hard-deleted after 90 days |
| `sessions` | Entity | Active authentication sessions. Contains: `session_id`, `user_id`, `token_hash` (SHA-256 of JWT), `device_fingerprint`, `ip_address`, `user_agent`, `expires_at`, `created_at`, `revoked_at`, `revocation_reason` | Created on login. Expires naturally or revoked on logout/security event |
| `auth_providers` | Entity | OAuth/SSO provider links. Contains: `provider_id`, `user_id`, `provider_name` (google, github, microsoft, saml), `external_id`, `access_token_encrypted`, `refresh_token_encrypted`, `token_expires_at`, `created_at`, `updated_at` | Created on first OAuth sign-in. Updated on token refresh |
| `mfa_enrollments` | Entity | MFA device registrations. Contains: `enrollment_id`, `user_id`, `method` (totp, sms, email, hardware_key), `secret_encrypted`, `verified`, `backup_codes_encrypted`, `enrolled_at`, `last_used_at` | Created on MFA setup. Deleted when MFA is disabled |
| `api_keys` | Entity | Programmatic API access credentials. Contains: `key_id`, `user_id`, `tenant_id`, `name`, `key_hash`, `key_prefix` (visible portion), `scopes` (JSONB array), `expires_at`, `created_at`, `last_used_at`, `revoked_at` | Created by user. Expired or revoked. Never re-activated |
| `password_reset_tokens` | Value Object | Temporary tokens for password recovery. Contains: `token_hash`, `user_id`, `created_at`, `expires_at` (1 hour), `consumed_at` | Single-use. Consumed or expired |
| `login_attempts` | Event Log | Brute-force detection log. Contains: `attempt_id`, `user_id` (nullable), `email_attempted`, `ip_address`, `success`, `failure_reason`, `created_at` | Partitioned monthly. 90-day retention |
| `email_verifications` | Value Object | Email verification tokens. Contains: `token_hash`, `user_id`, `email`, `created_at`, `expires_at` (24h), `verified_at` | Single-use. Verified or expired |

#### Relationships
```
users (1) ──── (N) sessions
users (1) ──── (N) auth_providers
users (1) ──── (N) mfa_enrollments
users (1) ──── (N) api_keys
users (1) ──── (N) login_attempts
users (1) ──── (N) password_reset_tokens
users (1) ──── (N) email_verifications
```

---

### 3.2 Tenant Domain Entities

| Entity | Type | Description | Lifecycle |
|:-------|:-----|:-----------|:---------|
| `organizations` | Aggregate Root | Top-level billing and legal entity. Fields: `org_id`, `name`, `legal_name`, `tax_id`, `billing_email`, `billing_address` (JSONB), `country_code`, `kyc_status`, `kyc_documents` (JSONB: references to Supabase Storage), `status`, `created_at`, `updated_at` | Created at signup. Suspended on payment failure. Closed on explicit request |
| `tenants` | Aggregate Root | Isolated workspace instance. Fields: `tenant_id`, `org_id`, `name`, `slug`, `plan_id`, `status`, `environment`, `custom_domain`, `branding` (JSONB), `settings` (JSONB), `provisioned_at`, `created_at`, `updated_at`, `deleted_at` | Follows Provisioning → Active → Suspended → Deprovisioning → Archived lifecycle |
| `workspaces` | Entity | Sub-partition within a tenant. Fields: `workspace_id`, `tenant_id`, `name`, `slug`, `description`, `created_by`, `status`, `is_default`, `created_at`, `updated_at` | Created at tenant provisioning (default) or by tenant admin. Archived when unused |
| `plan_definitions` | Reference | Available subscription plan tiers. Fields: `plan_id`, `name`, `tier` (free, starter, professional, business, enterprise), `monthly_price_cents`, `annual_price_cents`, `quotas` (JSONB), `features` (JSONB), `is_active`, `is_public`, `created_at`, `updated_at` | Versioned. Old plans grandfathered for existing subscribers |
| `tenant_subscriptions` | Entity | Active subscription assignment. Fields: `subscription_id`, `tenant_id`, `plan_id`, `billing_cycle` (monthly, annual), `status` (active, past_due, canceled, trialing), `trial_ends_at`, `current_period_start`, `current_period_end`, `canceled_at`, `created_at`, `updated_at` | One active subscription per tenant at any time |
| `tenant_members` | Entity | User-to-tenant relationship with role. Fields: `membership_id`, `user_id`, `tenant_id`, `workspace_ids` (UUID ARRAY), `role`, `permissions_override` (JSONB), `invited_by`, `joined_at`, `status`, `last_active_at` | Created via invitation flow. Suspended or removed by tenant admin |
| `invitations` | Value Object | Pending workspace invitations. Fields: `invite_id`, `tenant_id`, `inviter_user_id`, `invitee_email`, `role`, `token_hash`, `expires_at` (7 days), `created_at`, `accepted_at`, `revoked_at` | Single-use. Accepted, expired, or revoked |
| `feature_flags` | Entity | Per-tenant feature flag overrides. Fields: `flag_id`, `tenant_id`, `flag_key`, `flag_value` (JSONB), `enabled`, `override_source`, `created_at`, `updated_at` | Managed by plan assignment logic or Super Admin override |
| `custom_domains` | Entity | Tenant custom domain mappings. Fields: `domain_id`, `tenant_id`, `domain`, `verification_token`, `verified_at`, `ssl_status`, `created_at`, `updated_at` | Provisioned → DNS verification → Active → Revoked |
| `quota_meters` | Entity | Real-time usage counters per resource. Fields: `meter_id`, `tenant_id`, `resource_type`, `current_value`, `limit_value`, `period_start`, `period_end`, `updated_at` | Reset at billing period boundary. Updated in real-time |
| `tenant_settings` | Value Object | Key-value configuration store per tenant. Fields: `tenant_id`, `key`, `value` (JSONB), `updated_at`, `updated_by` | Managed by tenant admin |

---

### 3.3 Marketplace Domain Entities

| Entity | Type | Description | Lifecycle |
|:-------|:-----|:-----------|:---------|
| `listings` | Aggregate Root | Core marketplace listing. Fields: `listing_id`, `tenant_id`, `company_id`, `agent_id` (nullable), `category_id`, `title`, `slug`, `description`, `summary`, `status`, `listing_type`, `price_cents`, `price_currency`, `price_model`, `location` (JSONB), `is_featured`, `is_sponsored`, `quality_score` (float), `view_count`, `lead_count`, `created_at`, `updated_at`, `published_at`, `archived_at`, `deleted_at`, `metadata` (JSONB) | Draft → Pending Review → Active → Paused → Archived |
| `listing_versions` | Event Log | Immutable version snapshots. Fields: `version_id`, `listing_id`, `tenant_id`, `version_number`, `snapshot` (JSONB full listing state), `change_summary`, `changed_by`, `created_at` | Created on every significant edit. Read-only after creation. 2-year retention |
| `listing_status_transitions` | Event Log | Status change audit trail. Fields: `transition_id`, `listing_id`, `tenant_id`, `from_status`, `to_status`, `reason`, `actor_id`, `actor_type` (user, system, moderator), `created_at` | Write-once. 1-year retention |
| `categories` | Reference | Hierarchical category taxonomy. Fields: `category_id`, `parent_id`, `name`, `slug`, `description`, `icon_url`, `sort_order`, `is_active`, `level` (1-5), `path` (materialized path), `attribute_schema` (JSONB), `created_at`, `updated_at` | Managed by Super Admin. Rarely changed after initial setup |
| `category_attributes` | Reference | Attribute definitions per category. Fields: `attribute_id`, `category_id`, `name`, `slug`, `data_type` (string, integer, boolean, enum, range), `options` (JSONB for enum type), `is_required`, `is_filterable`, `is_searchable`, `display_order`, `unit`, `validation_rules` (JSONB) | Versioned at the category level |
| `listing_attributes` | Entity | Per-listing attribute values. Fields: `lattr_id`, `listing_id`, `tenant_id`, `attribute_id`, `value_string`, `value_integer`, `value_boolean`, `value_jsonb`, `created_at`, `updated_at` | Created/updated when listing is edited. Deleted when listing is archived |
| `listing_media` | Entity | Media asset references. Fields: `media_id`, `listing_id`, `tenant_id`, `media_type` (image, video, document, tour_3d), `storage_path`, `cdn_url`, `thumbnail_url`, `file_size_bytes`, `mime_type`, `width`, `height`, `duration_seconds`, `alt_text`, `sort_order`, `is_primary`, `moderation_status`, `created_at`, `updated_at` | Uploaded and linked to listing. Deleted with listing or explicitly removed |
| `listing_tags` | Entity | Tag associations. Fields: `tag_id`, `listing_id`, `tenant_id`, `tag_value`, `tag_type` (user, ai_generated, system), `created_at`, `created_by` | User-defined or AI-generated. Removed when listing archived |
| `companies` | Aggregate Root | Company/developer organization profiles. Fields: `company_id`, `tenant_id`, `name`, `slug`, `description`, `logo_url`, `website_url`, `industry`, `company_size`, `founded_year`, `headquarters` (JSONB), `trust_score` (float), `verification_status`, `created_at`, `updated_at`, `deleted_at` | Created at company registration. Soft-deleted on closure |
| `agents` | Entity | AI agent product registrations. Fields: `agent_id`, `tenant_id`, `company_id`, `name`, `slug`, `description`, `agent_type`, `model_base`, `capabilities` (JSONB array), `api_endpoint`, `documentation_url`, `pricing_model`, `status`, `version`, `created_at`, `updated_at` | Registered, published, deprecated |
| `projects` | Entity | Project groupings for listings. Fields: `project_id`, `tenant_id`, `company_id`, `name`, `description`, `status`, `launch_date`, `completion_date`, `listing_ids` (UUID ARRAY), `created_at`, `updated_at` | Follows company lifecycle |
| `reviews` | Entity | Verified reviews and ratings. Fields: `review_id`, `listing_id`, `tenant_id`, `reviewer_user_id`, `rating` (1-5), `title`, `body`, `verified_purchase`, `helpful_count`, `reported_count`, `status` (published, hidden, removed), `ai_sentiment_score`, `created_at`, `updated_at` | Published after verification. Soft-deleted on removal |
| `property_types` | Reference | Property type classifications (for real estate). Fields: `type_id`, `name`, `slug`, `icon`, `parent_type_id`, `is_active` | Platform-level reference data. Managed by Super Admin |
| `leads` | Entity | Lead capture records. Fields: `lead_id`, `listing_id`, `tenant_id`, `agent_id` (assigned), `buyer_user_id` (nullable, supports anonymous), `contact_info` (JSONB encrypted), `message`, `status` (new, contacted, qualified, converted, lost), `source`, `utm_params` (JSONB), `score` (float, AI-computed), `created_at`, `updated_at`, `converted_at` | Captured → Assigned → Qualified → Converted/Lost |
| `favorites` | Entity | Buyer saved listings. Fields: `favorite_id`, `user_id`, `listing_id`, `tenant_id`, `collection_id` (nullable), `created_at` | Instant create/delete |
| `favorite_collections` | Entity | Named collections of saved listings. Fields: `collection_id`, `user_id`, `tenant_id`, `name`, `is_private`, `created_at`, `updated_at` | Created by buyer. Shared or private |
| `listing_views` | Event Log | Listing page view records. Fields: `view_id`, `listing_id`, `tenant_id`, `user_id` (nullable), `session_id`, `ip_hash`, `device_type`, `duration_seconds`, `source`, `referrer`, `created_at` | Partitioned daily. 90-day retention. Used for popularity signals |

---

### 3.4 Discovery Domain Entities

| Entity | Type | Description | Lifecycle |
|:-------|:-----|:-----------|:---------|
| `search_candidates` | Materialized Snapshot | Pre-computed listing candidates with ranking metadata. Fields: `candidate_id`, `listing_id`, `tenant_id`, `status`, `category_path`, `price_cents`, `location_geo` (JSONB), `trust_score`, `quality_score`, `engagement_score`, `freshness_score`, `embedding_vector` (vector(1536)), `attribute_summary` (JSONB), `refreshed_at` | Rebuilt on listing change events. Invalidated on listing archive/deletion |
| `search_signals` | Aggregation | Rolling 90-day engagement signal aggregates per listing. Fields: `signal_id`, `listing_id`, `tenant_id`, `signal_type` (view, click, lead, favorite, share), `value`, `window_start`, `window_end`, `updated_at` | Sliding window. Updated by clickstream consumer. 90-day retention |
| `ranking_feature_store` | Materialized Cache | Pre-computed ranking features for fast retrieval during ranking stages. Fields: `feature_id`, `listing_id`, `tenant_id`, `vector_similarity_precomputed` (float), `bid_modifier` (float), `trust_modifier` (float), `freshness_decay` (float), `personalization_boost` (float), `final_light_score` (float), `computed_at` | Refreshed hourly or on signal updates |
| `feed_generations` | Event Log | Record of every feed generated for a user session. Fields: `feed_id`, `tenant_id`, `user_id` (nullable), `session_id`, `query_params` (JSONB), `candidate_count`, `ranked_count`, `returned_count`, `latency_ms`, `experiment_variant_id`, `personalization_applied`, `created_at` | 30-day retention |
| `search_queries` | Event Log | Individual search query records. Fields: `query_id`, `tenant_id`, `user_id` (nullable), `session_id`, `raw_query`, `normalized_query`, `parsed_filters` (JSONB), `result_count`, `latency_ms`, `had_results`, `created_at` | 90-day retention. Aggregate to ClickHouse for analytics |
| `search_clicks` | Event Log | Click events from search result pages. Fields: `click_id`, `query_id`, `listing_id`, `tenant_id`, `user_id`, `rank_position`, `click_timestamp`, `session_id`, `dwell_time_seconds` | 90-day retention. Key signal for ranking model training |
| `saved_searches` | Entity | User-defined saved search configurations. Fields: `saved_search_id`, `user_id`, `tenant_id`, `name`, `query_params` (JSONB), `alert_enabled`, `alert_frequency` (instant, daily, weekly), `last_matched_at`, `result_count_last`, `created_at`, `updated_at` | Persistent until deleted by user |
| `search_alerts` | Entity | Triggered alert records for saved searches. Fields: `alert_id`, `saved_search_id`, `user_id`, `tenant_id`, `new_results` (UUID ARRAY), `triggered_at`, `delivered_at`, `delivery_channel` | Created by search alert processor. 30-day retention |
| `exploration_bandit_state` | Entity | Multi-armed bandit state for exploration/exploitation balance. Fields: `bandit_id`, `tenant_id`, `arm_type` (category, new_listing, trending), `arm_id`, `pull_count`, `reward_sum`, `updated_at` | Updated continuously by the ranking engine |

---

### 3.5 AI Domain Entities

| Entity | Type | Description | Lifecycle |
|:-------|:-----|:-----------|:---------|
| `model_registry` | Reference | Available AI model definitions. Fields: `model_id`, `provider` (openai, anthropic, google, local), `model_name`, `model_version`, `modality` (text, embedding, image, multimodal), `context_window`, `max_output_tokens`, `input_cost_per_1k`, `output_cost_per_1k`, `embedding_dimensions`, `is_active`, `is_default`, `capabilities` (JSONB), `created_at`, `deprecated_at` | Active until deprecated. New versions create new records |
| `prompt_templates` | Reference (Versioned) | Managed prompt templates. Fields: `template_id`, `name`, `slug`, `version`, `domain` (marketplace, discovery, moderation, enrichment), `system_prompt`, `user_prompt_template`, `required_variables` (JSONB array), `output_schema` (JSONB), `model_constraints` (JSONB), `published`, `published_at`, `created_by`, `created_at` | Immutable once published. New edits create new versions |
| `inference_logs` | Event Log | Complete inference request/response record. Fields: `inference_id`, `tenant_id`, `user_id` (nullable), `model_id`, `template_id` (nullable), `input_tokens`, `output_tokens`, `latency_ms`, `cache_hit`, `cost_usd` (float), `status` (success, error, timeout), `error_code`, `request_hash`, `created_at` | Partitioned daily. 90-day retention in PostgreSQL. Archived to ClickHouse |
| `semantic_cache` | Entity | Cached LLM responses indexed by semantic similarity. Fields: `cache_id`, `request_hash` (SHA-256 of normalized prompt), `embedding_hash`, `embedding_vector` (vector(1536)), `model_id`, `prompt_fingerprint`, `response_body` (JSONB), `response_tokens`, `hit_count`, `created_at`, `expires_at` (7 days), `last_accessed_at` | Created on cache miss. Refreshed on hit. TTL-expired automatically |
| `ai_governance_policies` | Reference | Per-tenant AI usage governance rules. Fields: `policy_id`, `tenant_id` (nullable for platform-default), `policy_type` (content_filter, token_limit, model_restriction, topic_restriction), `policy_config` (JSONB), `is_active`, `created_at`, `updated_at` | Managed by AI Operator or Super Admin |
| `provider_health_log` | Entity | Real-time provider availability tracking. Fields: `health_id`, `provider`, `status` (healthy, degraded, down), `latency_p95_ms`, `error_rate_pct`, `checked_at` | 24-hour rolling window. Used for provider routing decisions |
| `ai_experiments` | Entity | AI model A/B test configurations. Fields: `experiment_id`, `name`, `model_a_id`, `model_b_id`, `traffic_split_pct`, `tenant_id` (nullable for platform-wide), `start_date`, `end_date`, `status`, `winner_model_id`, `created_at` | Follows Experimentation lifecycle |
| `ai_evaluations` | Entity | AI output quality evaluation records. Fields: `evaluation_id`, `inference_id`, `evaluator_type` (human, ai_judge), `metric_name`, `metric_score`, `reasoning`, `created_at` | Retained 1 year. Used for model quality tracking |
| `ai_feedback` | Entity | User-provided feedback on AI outputs. Fields: `feedback_id`, `inference_id`, `tenant_id`, `user_id`, `rating` (thumbs_up, thumbs_down, detailed), `feedback_text`, `feedback_tags` (JSONB), `created_at` | Retained 180 days. Feeds back into model evaluation |

---

### 3.6 Recommendation Domain Entities

| Entity | Type | Description | Lifecycle |
|:-------|:-----|:-----------|:---------|
| `recommendation_jobs` | Entity | Batch recommendation computation jobs. Fields: `job_id`, `tenant_id`, `job_type` (user_based, item_based, trending, cross_sell), `status`, `scope` (JSONB), `started_at`, `completed_at`, `error_message` | Triggered by schedule or event. Retained 30 days |
| `recommendation_snapshots` | Entity | Pre-computed recommendation results per user. Fields: `snapshot_id`, `user_id`, `tenant_id`, `recommendation_type`, `listing_ids` (UUID ARRAY ordered by score), `scores` (JSONB), `model_version`, `generated_at`, `expires_at` (24h) | Rebuilt every 4 hours or on significant behavior change. Expired entries purged |
| `related_listings` | Entity | Item-to-item similarity relationships. Fields: `relation_id`, `listing_id`, `related_listing_id`, `tenant_id`, `similarity_score` (float), `relation_type` (similar, complementary, alternative), `model_version`, `computed_at` | Recomputed weekly. Top 20 related listings per listing |
| `trending_listings` | Materialized | Platform and category-level trending snapshots. Fields: `trend_id`, `tenant_id`, `scope_type` (platform, category, location), `scope_id`, `listing_ids` (JSONB ordered list), `trend_period` (hourly, daily, weekly), `computed_at` | Refreshed hourly (hourly trend), daily (daily/weekly trends) |
| `recommendation_feedback` | Event Log | User interactions with recommendation surfaces. Fields: `feedback_id`, `snapshot_id`, `user_id`, `tenant_id`, `listing_id`, `action` (shown, clicked, dismissed, favorited, converted), `position`, `surface` (homepage, detail_page, email), `created_at` | 180-day retention. Key signal for recommendation quality |

---

### 3.7 Personalization Domain Entities

| Entity | Type | Description | Lifecycle |
|:-------|:-----|:-----------|:---------|
| `user_behavior_profiles` | Aggregate | Persistent user preference state (slow-loop). Fields: `profile_id`, `user_id`, `tenant_id`, `preference_vector` (vector(1536)), `category_affinities` (JSONB: category_id → score), `price_range_preference` (JSONB: {min, max, currency}), `location_preference` (JSONB), `feature_affinities` (JSONB), `decay_rate` (float), `last_interaction_at`, `profile_version`, `created_at`, `updated_at` | Created on first interaction. Updated by daily batch job. Never deleted until user deletion |
| `interaction_history` | Event Log | Persistent interaction record for slow-loop training. Fields: `interaction_id`, `user_id`, `tenant_id`, `listing_id`, `interaction_type` (view, click, hover, lead, favorite, purchase, share), `weight` (float), `duration_seconds`, `device_type`, `source`, `created_at` | Partitioned monthly. 12-month retention for training. Older data archived |
| `affinity_scores` | Entity | Pre-computed affinity scores between users and categories/features. Fields: `affinity_id`, `user_id`, `tenant_id`, `entity_type` (category, feature, location, price_range, agent_type), `entity_id`, `score` (float 0-1), `confidence` (float), `computed_at`, `sample_count` | Refreshed by daily batch. Used by Discovery as ranking signals |
| `preference_evolution_log` | Event Log | Track how user preferences change over time. Fields: `log_id`, `user_id`, `tenant_id`, `vector_delta_magnitude` (float), `top_changed_dimensions` (JSONB), `trigger_event` (batch, interaction, explicit_feedback), `created_at` | 90-day retention. Used for personalization quality analysis |
| `explicit_preferences` | Entity | User-declared preferences (onboarding survey, explicit settings). Fields: `pref_id`, `user_id`, `tenant_id`, `preference_type` (category, location, budget, feature, deal_breaker), `preference_value` (JSONB), `weight` (float: 0.5=soft, 1.0=hard), `created_at`, `updated_at` | Updated when user changes settings. Override implicit signals |

---

### 3.8 Analytics Domain Entities (PostgreSQL Layer)

| Entity | Type | Description |
|:-------|:-----|:-----------|
| `analytics_kpi_snapshots` | Materialized Aggregation | Pre-computed daily KPI values per tenant. Fields: `snapshot_id`, `tenant_id`, `date`, `kpi_name`, `kpi_value` (float), `dimension` (JSONB), `computed_at` |
| `funnel_definitions` | Reference | Custom funnel configurations. Fields: `funnel_id`, `tenant_id`, `name`, `steps` (JSONB ordered array of event types), `is_active`, `created_at` |
| `funnel_snapshots` | Materialized | Pre-computed funnel conversion rates. Fields: `snapshot_id`, `funnel_id`, `tenant_id`, `date`, `step_metrics` (JSONB: {step, entered, exited, converted}), `computed_at` |
| `cohort_definitions` | Reference | User cohort definitions. Fields: `cohort_id`, `tenant_id`, `name`, `entry_event`, `entry_conditions` (JSONB), `observation_period_days`, `is_active` |
| `cohort_snapshots` | Materialized | Cohort retention analysis snapshots. Fields: `snapshot_id`, `cohort_id`, `tenant_id`, `cohort_date`, `retention_by_period` (JSONB array), `computed_at` |
| `revenue_attribution` | Materialized | Revenue attributed to listings, campaigns, and channels. Fields: `attribution_id`, `tenant_id`, `date`, `listing_id`, `campaign_id`, `channel`, `attributed_revenue_cents`, `attribution_model`, `computed_at` |
| `tenant_health_scores` | Materialized | Composite health score per tenant for Super Admin monitoring. Fields: `score_id`, `tenant_id`, `date`, `listing_quality_score`, `engagement_score`, `trust_score`, `billing_health_score`, `composite_score`, `computed_at` |

---

### 3.9 Trust & Safety Domain Entities

| Entity | Type | Description | Lifecycle |
|:-------|:-----|:-----------|:---------|
| `trust_scores` | Entity | Computed trust/reputation scores. Fields: `score_id`, `entity_type` (tenant, company, user, listing), `entity_id`, `score` (float 0-1), `tier` (new, building, established, trusted, verified), `score_components` (JSONB), `computed_at`, `last_incident_at`, `incident_count` | Recalculated on every behavioral event. Historical versions in `trust_score_history` |
| `trust_score_history` | Event Log | Historical trust score changes. Fields: `history_id`, `entity_type`, `entity_id`, `previous_score`, `new_score`, `delta`, `trigger_event`, `computed_at` | 1-year retention |
| `verification_requests` | Entity | Identity/business verification applications. Fields: `request_id`, `entity_type`, `entity_id`, `tenant_id`, `verification_type` (identity, business, professional), `submitted_documents` (JSONB: storage paths), `status` (pending, under_review, approved, rejected), `reviewer_id`, `created_at`, `reviewed_at`, `decision_reason` | Reviewed and resolved |
| `fraud_signals` | Event Log | Individual fraud indicator events. Fields: `signal_id`, `entity_type`, `entity_id`, `tenant_id`, `signal_type`, `severity` (low, medium, high, critical), `details` (JSONB), `source` (ai_detection, rule_engine, human_report, cross_tenant_pattern), `detected_at`, `is_confirmed`, `confirmed_at` | 1-year retention |
| `behavioral_anomalies` | Entity | Detected behavioral pattern anomalies. Fields: `anomaly_id`, `entity_id`, `entity_type`, `tenant_id`, `anomaly_type`, `baseline_value`, `observed_value`, `deviation_score` (float), `detected_at`, `resolved_at`, `action_taken` | 1-year retention |
| `risk_profiles` | Entity | Composite risk profile per entity. Fields: `profile_id`, `entity_type`, `entity_id`, `tenant_id`, `risk_tier` (low, medium, high, critical), `risk_components` (JSONB), `watchlist_status`, `last_reviewed_at`, `review_frequency`, `created_at`, `updated_at` | Maintained for duration of entity's existence |
| `platform_fraud_patterns` | Reference | Cross-tenant fraud patterns (Super Admin access only). Fields: `pattern_id`, `pattern_type`, `signature` (JSONB), `confidence_score`, `affected_tenant_count`, `created_at`, `last_seen_at`, `is_active` | Managed by platform Trust & Safety team |

---

### 3.10 Moderation Domain Entities

| Entity | Type | Description | Lifecycle |
|:-------|:-----|:-----------|:---------|
| `moderation_items` | Aggregate Root | Item submitted for moderation. Fields: `item_id`, `content_type` (listing, media, review, message, user_profile), `content_id`, `tenant_id`, `submitted_by` (user, system_auto, api), `priority` (critical, high, normal, low), `status` (pending, ai_review, human_review, resolved, escalated), `created_at`, `updated_at`, `resolved_at` | Created on content submission. Resolved by AI or human. Archived after resolution + 30 days |
| `ai_scan_results` | Entity | AI moderation scan output. Fields: `scan_id`, `item_id`, `scan_type` (toxicity, spam, fraud, policy, pii, copyright), `model_id`, `score` (float 0-1), `decision` (pass, flag, quarantine), `reasoning` (text), `confidence` (float), `flagged_segments` (JSONB), `scanned_at` | Written once. Read by human reviewers. Retained for 2 years |
| `human_review_tasks` | Entity | Human reviewer assignments. Fields: `task_id`, `item_id`, `reviewer_id` (nullable, null = unassigned pool), `assigned_at`, `due_at`, `status` (pending, in_progress, completed, reassigned), `completed_at`, `review_duration_seconds` | Created on AI flag or priority escalation |
| `moderation_decisions` | Event Log | Final moderation decisions. Fields: `decision_id`, `item_id`, `tenant_id`, `decision` (approve, reject, edit_required, escalate), `decision_type` (ai_automated, human, admin_override), `decision_by`, `reasoning`, `action_taken` (JSONB: what changed in target system), `decided_at` | Write-once. 2-year retention |
| `appeals` | Entity | Decision appeal records. Fields: `appeal_id`, `decision_id`, `tenant_id`, `appellant_id`, `reason`, `supporting_evidence` (JSONB: storage paths), `status` (pending, under_review, upheld, overturned), `reviewer_id`, `created_at`, `resolved_at`, `resolution_reason` | Created by tenant on rejected moderation decision |
| `content_reports` | Entity | User-submitted content abuse reports. Fields: `report_id`, `reporter_user_id`, `content_type`, `content_id`, `tenant_id`, `report_category` (spam, offensive, fake, illegal, copyright, other), `description`, `status`, `created_at`, `resolved_at` | Created by any authenticated user. Feeds moderation queue |
| `reviewer_performance` | Materialized | Moderation reviewer quality metrics. Fields: `metric_id`, `reviewer_id`, `date`, `tasks_completed`, `avg_decision_time_seconds`, `appeal_overturn_rate`, `accuracy_rate`, `computed_at` | Daily materialized view |

---

### 3.11 Billing Domain Entities

| Entity | Type | Description | Lifecycle |
|:-------|:-----|:-----------|:---------|
| `subscriptions` | Aggregate Root | Active subscription state. Fields: `subscription_id`, `org_id`, `tenant_id`, `plan_id`, `stripe_subscription_id`, `status`, `billing_cycle`, `current_period_start`, `current_period_end`, `trial_start`, `trial_end`, `cancel_at`, `canceled_at`, `created_at`, `updated_at` | One active subscription per tenant |
| `ledger_entries` | Append-Only Event Log | Immutable financial ledger. Fields: `entry_id`, `org_id`, `tenant_id`, `entry_type` (charge, credit, refund, adjustment, payment, payout), `resource_type`, `quantity`, `unit_price_cents`, `amount_cents`, `currency`, `description`, `reference_id` (invoice_id or external), `idempotency_key`, `created_at` | Write-only. No UPDATE or DELETE. Adjustments create new offsetting lines |
| `invoices` | Entity | Generated invoice records. Fields: `invoice_id`, `org_id`, `tenant_id`, `stripe_invoice_id`, `status` (draft, open, paid, void, uncollectible), `billing_period_start`, `billing_period_end`, `subtotal_cents`, `tax_cents`, `discount_cents`, `total_cents`, `currency`, `due_date`, `paid_at`, `created_at` | Monthly generation. 7-year financial retention |
| `invoice_line_items` | Entity | Itemized invoice breakdown. Fields: `line_id`, `invoice_id`, `tenant_id`, `description`, `quantity`, `unit_price_cents`, `amount_cents`, `tax_rate`, `resource_type`, `period_start`, `period_end` | Created with invoice. 7-year retention |
| `credit_balances` | Entity | Prepaid credit and token balances. Fields: `balance_id`, `org_id`, `tenant_id`, `balance_type` (monetary, ai_tokens, featured_slots), `amount`, `currency`, `expires_at`, `created_at`, `updated_at` | Created on credit purchase. Consumed on usage. Expired when TTL reached |
| `usage_meters` | Entity | Real-time resource usage counters. Fields: `meter_id`, `tenant_id`, `resource_type`, `current_value` (integer), `period_start`, `period_end`, `limit_value`, `updated_at` | Incremented atomically on each usage event. Reset at period boundary |
| `payment_methods` | Entity | Stored payment method references. Fields: `method_id`, `org_id`, `stripe_payment_method_id`, `method_type` (card, bank_account, invoice), `last_four`, `brand`, `expiry_month`, `expiry_year`, `is_default`, `created_at`, `deleted_at` | Stripe manages actual card data. Platform stores tokens only |
| `stripe_sync_log` | Event Log | Stripe webhook idempotency log. Fields: `sync_id`, `stripe_event_id`, `event_type`, `payload_hash`, `processed_at`, `processing_status`, `error_message` | 30-day retention. Ensures idempotent webhook processing |
| `ad_campaigns` | Entity | Promoted listing campaigns. Fields: `campaign_id`, `tenant_id`, `name`, `status` (draft, active, paused, ended), `campaign_type` (sponsored_listing, featured_slot, category_boost), `budget_total_cents`, `budget_daily_cents`, `spent_cents`, `start_date`, `end_date`, `targeting` (JSONB), `created_at`, `updated_at` | Follows campaign lifecycle |
| `ad_bids` | Entity | CPC/CPM bid records per campaign. Fields: `bid_id`, `campaign_id`, `tenant_id`, `bid_type` (cpc, cpm), `bid_amount_cents`, `keywords` (JSONB array), `category_ids` (UUID ARRAY), `status`, `created_at`, `updated_at` | Updated when campaign manager adjusts bids |
| `ad_impressions` | Event Log | Ad display and click tracking. Fields: `impression_id`, `campaign_id`, `listing_id`, `tenant_id`, `feed_id`, `user_id` (nullable), `event_type` (impression, click, conversion), `position`, `bid_amount_charged_cents`, `created_at` | Partitioned daily. 90-day retention |

---

### 3.12 Notifications Domain Entities

| Entity | Type | Description | Lifecycle |
|:-------|:-----|:-----------|:---------|
| `notification_templates` | Reference | Channel-specific notification templates. Fields: `template_id`, `tenant_id` (nullable for platform defaults), `name`, `slug`, `channel` (email, sms, push, in_app), `event_trigger`, `subject_template`, `body_template`, `variables` (JSONB array), `version`, `is_active`, `created_at` | Versioned. Immutable once published |
| `notification_records` | Event Log | Delivery tracking per notification sent. Fields: `notification_id`, `tenant_id`, `user_id`, `channel`, `template_id`, `trigger_event`, `payload` (JSONB), `status` (pending, sent, delivered, failed, bounced), `sent_at`, `delivered_at`, `failed_reason`, `provider_message_id`, `created_at` | 90-day retention |
| `push_subscriptions` | Entity | Push notification device registrations. Fields: `subscription_id`, `user_id`, `tenant_id`, `platform` (ios, android, web), `push_token_encrypted`, `device_id`, `device_model`, `app_version`, `created_at`, `updated_at`, `is_active` | Created on device registration. Deactivated on token expiry or unsubscribe |
| `notification_preferences` | Entity | Per-user notification opt-in/out settings. Fields: `preference_id`, `user_id`, `tenant_id`, `channel`, `event_category`, `enabled`, `frequency` (instant, daily_digest, weekly_digest), `quiet_hours` (JSONB: {start, end, timezone}), `updated_at` | Persistent. Updated by user settings |
| `in_app_inbox` | Entity | In-app notification inbox records. Fields: `inbox_id`, `user_id`, `tenant_id`, `notification_id`, `title`, `body`, `action_url`, `icon_type`, `read_at`, `dismissed_at`, `created_at` | Retained 90 days. Soft-deleted on dismiss |

---

### 3.13 Realtime Domain Entities

| Entity | Type | Description | Lifecycle |
|:-------|:-----|:-----------|:---------|
| `realtime_channels` | Reference | Registered channel definitions. Fields: `channel_id`, `tenant_id`, `channel_name`, `channel_type` (feed, moderation, notifications, presence, analytics), `description`, `is_active`, `created_at` | Created during tenant provisioning. Deleted on tenant deprovisioning |
| `presence_records` | Entity | Active WebSocket presence tracking. Fields: `presence_id`, `user_id`, `tenant_id`, `channel_name`, `socket_id`, `connected_at`, `last_heartbeat_at`, `device_type`, `metadata` (JSONB) | 30-second TTL refreshed by heartbeat. Deleted on disconnect |
| `realtime_broadcast_log` | Event Log | Log of messages broadcast via realtime channels. Fields: `broadcast_id`, `channel_name`, `tenant_id`, `event_type`, `payload_hash`, `recipient_count`, `created_at` | 24-hour retention. Diagnostics only |

---

### 3.14 Governance Domain Entities

| Entity | Type | Description | Lifecycle |
|:-------|:-----|:-----------|:---------|
| `audit_logs` | Append-Only Event Log | Platform-wide immutable audit trail. Fields: `log_id`, `actor_id`, `actor_type` (user, service, system), `actor_role`, `tenant_id` (nullable for platform actions), `action`, `entity_type`, `entity_id`, `before_state` (JSONB), `after_state` (JSONB), `ip_address`, `user_agent`, `correlation_id`, `created_at` | Partitioned monthly. 3-year retention. Archived to cold storage after 1 year |
| `admin_actions` | Append-Only Event Log | Super Admin specific high-privilege actions. Fields: `action_id`, `admin_id`, `action_type`, `target_type`, `target_id`, `justification`, `performed_at`, `ip_address`, `session_id` | 3-year retention. Compliance-grade |
| `system_configs` | Reference | Global key-value configuration store. Fields: `config_id`, `config_key` (unique), `config_value` (JSONB), `description`, `is_secret`, `updated_by`, `updated_at`, `version` (integer) | Versioned. Previous values preserved in audit log |
| `schema_migrations` | Reference | Database migration tracking. Fields: `migration_id`, `version`, `name`, `applied_at`, `applied_by`, `checksum`, `duration_ms` | Indefinite retention |
| `global_announcements` | Entity | Platform-wide system announcements. Fields: `announcement_id`, `title`, `body`, `severity` (info, warning, critical), `target_audience` (all, tenants, admins), `scheduled_at`, `expires_at`, `created_by`, `created_at` | 1-year retention after expiry |
| `compliance_records` | Entity | Regulatory compliance action records. Fields: `record_id`, `record_type` (gdpr_deletion, data_export, right_to_access, breach_notification), `subject_user_id`, `tenant_id`, `request_received_at`, `fulfilled_at`, `status`, `evidence` (JSONB: storage paths), `created_at` | 7-year retention |

---

### 3.15 Experimentation Domain Entities

| Entity | Type | Description | Lifecycle |
|:-------|:-----|:-----------|:---------|
| `experiments` | Aggregate Root | Experiment definitions. Fields: `experiment_id`, `tenant_id` (nullable for platform-wide), `name`, `slug`, `hypothesis`, `experiment_type` (ab_test, multivariate, bandit, rollout), `domain` (discovery, ai, recommendations, ui), `status` (draft, running, paused, concluded, archived), `start_date`, `end_date`, `sample_size_target`, `traffic_percentage` (0-100), `created_by`, `created_at`, `concluded_at` | Draft → Running → Concluded → Archived |
| `experiment_variants` | Entity | Variant configurations per experiment. Fields: `variant_id`, `experiment_id`, `name`, `is_control`, `traffic_weight` (float: sum across variants = 1.0), `config_overrides` (JSONB), `created_at` | Immutable after experiment starts |
| `user_assignments` | Event Log | User-to-variant assignment records. Fields: `assignment_id`, `experiment_id`, `variant_id`, `user_id`, `tenant_id`, `assigned_at`, `assignment_hash` (deterministic for consistency) | Partitioned monthly. 6-month post-experiment retention |
| `experiment_events` | Event Log | Experiment goal conversion events. Fields: `event_id`, `experiment_id`, `variant_id`, `user_id`, `tenant_id`, `goal_name`, `goal_value` (float), `metadata` (JSONB), `created_at` | 6-month post-experiment retention. Feeds statistical analysis |
| `experiment_results` | Materialized | Statistical analysis outputs. Fields: `result_id`, `experiment_id`, `variant_id`, `metric_name`, `sample_size`, `mean_value`, `std_deviation`, `confidence_interval_lower`, `confidence_interval_upper`, `p_value`, `is_significant`, `computed_at` | Retained indefinitely |
| `feature_rollouts` | Entity | Gradual feature flag rollouts. Fields: `rollout_id`, `feature_key`, `tenant_id` (nullable), `rollout_percentage` (0-100), `targeting_rules` (JSONB), `status` (scheduled, active, completed, rolled_back), `started_at`, `completed_at` | Managed by product team |
| `bandit_arms` | Entity | Multi-armed bandit arm states. Fields: `arm_id`, `experiment_id`, `variant_id`, `tenant_id`, `pull_count`, `reward_sum`, `reward_mean`, `ucb_score`, `updated_at` | Continuously updated by bandit worker |

---

## SECTION 4 — MARKETPLACE DATA MODEL

### 4.1 Listing Lifecycle State Machine

```
         ┌─────────────────────────────────────────────────────────┐
         │                   LISTING LIFECYCLE                       │
         │                                                           │
         │  [DRAFT] ──── submit ──► [PENDING_REVIEW]                │
         │     ▲                         │                           │
         │     │ (reject)           pass │ fail                      │
         │     │                    ▼    ▼                           │
         │     │              [ACTIVE]  [REJECTED]                   │
         │     │                 │                                   │
         │     │          pause  │  archive                          │
         │     │                 ▼                                   │
         │     └──── edit ── [PAUSED]  [ARCHIVED]                   │
         │                                                           │
         └─────────────────────────────────────────────────────────┘
```

### 4.2 Listing Read Model Architecture

The Discovery Engine does NOT query `marketplace.listings` directly. Instead, it reads from a materialized snapshot stored in `search_index.search_candidates`. This separation prevents Discovery from creating high-read pressure on the transactional marketplace schema.

**Snapshot Refresh Triggers:**
- `marketplace.listing_created` event → Insert into `search_candidates`
- `marketplace.listing_updated` event → Update `search_candidates`
- `marketplace.listing_archived` event → Delete from `search_candidates`
- `marketplace.listing_status_changed` event → Update status in `search_candidates`
- Daily batch job → Refresh all stale `search_candidates` (freshness decay recalculation)

### 4.3 Listing Attribute System Architecture

The attribute system uses a **hybrid schema approach** combining a predefined column set with a flexible `listing_attributes` table:

| Layer | Mechanism | Use Case |
|:------|:---------|:---------|
| **Fixed Schema** | Native columns on `listings` table | Common attributes: title, price, location, status, type |
| **Category Attributes** | `listing_attributes` join on `category_attributes` | Category-specific attributes (e.g., bedroom_count for real estate) |
| **Custom Fields** | `listings.metadata` JSONB column | Tenant-defined or listing-specific overrides |
| **AI-Enriched Attributes** | AI enrichment pipeline populates `listing_attributes` | Auto-generated summary, detected amenities, quality score |

### 4.4 Listing Quality Score Model

```
Quality Score (0.0 → 1.0) = 
  (media_score × 0.25)         → # of images, video presence, 360° tour
  + (completeness_score × 0.25) → % of category attributes filled
  + (description_score × 0.20)  → NLP readability + keyword richness  
  + (trust_score × 0.15)        → Company trust score contribution
  + (engagement_score × 0.15)   → Historical view-to-lead ratio
```

The quality score is recomputed by an AI enrichment worker whenever a listing or its associated company trust score changes. Score components are stored in `listings.metadata.quality_breakdown` (JSONB).

### 4.5 Media Management Data Flow

```
Upload Request → Supabase Storage (listing-media/{tenant_id}/{listing_id}/)
      │
      ▼ (Event: media.uploaded)
[Media Processing Worker]
      │
      ├── Image: Resize (thumbnail, medium, large), WebP conversion, CDN upload
      ├── Video: Thumbnail extraction, duration check, CDN upload  
      └── Document: Virus scan, text extraction, PDF preview generation
      │
      ▼ (Event: media.processed)
[Moderation Worker]
      │
      ├── AI visual moderation scan (NSFW, violence, copyright)
      └── Update listing_media.moderation_status
      │
      ▼
[listing_media record updated with cdn_url + thumbnail_url]
```

---

## SECTION 5 — DISCOVERY & RECOMMENDATION DATA MODEL

### 5.1 Feed Generation Data Architecture

```
REQUEST → Discovery Engine
           │
           ├── 1. READ user preference vector from Redis [O(1)]
           │        └─ fallback: read from personalization.user_behavior_profiles
           │
           ├── 2. EXECUTE vector similarity search on search_candidates
           │        SELECT listing_id FROM search_index.search_candidates
           │        WHERE tenant_id = :tid AND status = 'active'  
           │        ORDER BY embedding_vector <=> :user_vec LIMIT 500
           │
           ├── 3. FETCH ranking features from ranking_feature_store [batch lookup]
           │
           ├── 4. APPLY light ranking formula (trust × bid × freshness)
           │
           ├── 5. PASS top 100 to neural re-ranker [AI inference call]
           │
           ├── 6. APPLY exploration: 10% ε-greedy from bandit_arms
           │
           └── 7. WRITE feed generation record to feed_generations
```

### 5.2 Storage Strategy by Data Velocity

| Data Type | Storage Layer | Justification |
|:----------|:-------------|:-------------|
| User preference vector (active session) | Redis (key: `tenant:{tid}:user:{uid}:pref_vec`) | Sub-millisecond read requirement |
| User preference vector (persistent) | `personalization.user_behavior_profiles` | Durable slow-loop state |
| Search candidates | `search_index.search_candidates` + HNSW index | Vector similarity search at listing scale |
| Ranking features | `search_index.ranking_feature_store` + Redis cache | High QPS feature lookup |
| Feed results | `search_index.feed_generations` | Audit trail + analytics |
| Recommendation snapshots | Redis sorted set + `recommendations.recommendation_snapshots` | O(1) retrieval with durability |
| Trending listings | Redis list + `recommendations.trending_listings` | Instant delivery |
| Bandit state | `search_index.exploration_bandit_state` | Persistent, low-frequency updates |

### 5.3 Recommendation Retention Strategy

| Data Type | Retention | Rationale |
|:----------|:---------|:---------|
| Recommendation snapshots | 24 hours (expiry) | Freshness requirement |
| Related listings | Rebuilt weekly | Item-item similarity is relatively stable |
| Trending snapshots | Hourly/daily/weekly rebuild | Time-sensitive |
| Recommendation feedback | 180 days | Training signal window |
| Interaction history | 12 months | Preference learning window |

### 5.4 Recalculation Strategy

| Trigger | Recalculation Scope | Latency Target |
|:--------|:------------------|:--------------|
| User click event | User preference vector (Redis fast-loop update) | <100ms |
| Listing created/updated | `search_candidates` refresh for affected listing | <5 seconds |
| Trust score updated | Ranking feature store update for affected entity | <60 seconds |
| Bid amount changed | `ranking_feature_store` for campaign listings | <10 seconds |
| Daily batch job | Full preference vector rebuild for all users | <4 hours |
| Weekly batch job | Full item-item similarity recomputation | <12 hours |

---

## SECTION 6 — SEARCH & SEMANTIC DATA MODEL

### 6.1 pgvector Strategy

| Aspect | Decision | Rationale |
|:-------|:--------|:---------|
| **Extension** | `pgvector` 0.7+ | Native PostgreSQL, zero operational overhead at startup |
| **Dimensions** | 1536 (OpenAI text-embedding-3-small) | Optimal quality/cost/performance balance |
| **Index Type** | HNSW (`ef_construction=128`, `m=16`) | Best recall/performance for ANN search |
| **Tenant Filter** | Added as WHERE clause BEFORE ORDER BY embedding | Prevents cross-tenant vector leakage |
| **Partitioning at Scale** | Partition `embeddings` table by `tenant_id` hash (16 partitions) when >5M rows | Reduces HNSW index size per partition |
| **Distance Metric** | Cosine distance (`<=>`) | Normalized vector representations |
| **Extraction Trigger** | When index rebuild time >30 minutes | Migrate to dedicated pgvector cluster or Pinecone |

### 6.2 Embedding Lifecycle

```
TRIGGER: New/Updated listing
        │
        ▼
[Embedding Generation Worker]
  - Fetches listing metadata (title + description + attributes)
  - Calls text-embedding-3-small API
  - Stores embedding in vector_store.embeddings
  - Updates search_index.search_candidates with embedding_vector
        │
        ▼
[HNSW Index Auto-Update] (pgvector handles incrementally)
        │
        ▼
[Event: ai.embedding_generated → Event Mesh]
```

**Batch Re-indexing Trigger Conditions:**
1. Model version upgrade (all embeddings must be regenerated)
2. Listing attribute schema change that affects embedding input
3. Monthly freshness re-indexing for listings with zero interactions (signals stale content)

### 6.3 Hybrid Retrieval Architecture

The search system supports three retrieval modes, with hybrid as the recommended default:

| Mode | Method | When Used |
|:-----|:-------|:---------|
| **Keyword** | PostgreSQL full-text search (`tsvector` + GIN) + trigram (`pg_trgm`) | Short, precise queries |
| **Semantic** | pgvector cosine similarity on `embedding_vector` | Natural language queries |
| **Hybrid** | Weighted combination of both scores using Reciprocal Rank Fusion (RRF) | Default for all search |

**RRF Formula:**
```
RRF_score(listing) = (α × (1 / (k + keyword_rank))) + ((1-α) × (1 / (k + semantic_rank)))
where k=60 (RRF constant), α=0.4 (keyword weight) for marketplace queries
α is adjusted per query type: exact_id queries use α=0.9, natural language uses α=0.2
```

### 6.4 Search Explainability Data Model

Every search result can be explained via the `search_explanations` table (written asynchronously for admin/analytics use):

| Field | Description |
|:------|:-----------|
| `explanation_id` | Unique ID |
| `feed_id` | Reference to feed generation |
| `listing_id` | Explained listing |
| `final_rank` | Final position in results |
| `keyword_score` | BM25/trigram contribution |
| `semantic_score` | Vector similarity contribution |
| `trust_modifier` | Trust score adjustment applied |
| `bid_modifier` | Ad bid boost applied |
| `freshness_decay` | Age penalty applied |
| `personalization_boost` | User preference alignment bonus |
| `exploration_flag` | Whether this was an exploration slot |

---

## SECTION 7 — AI DATA ARCHITECTURE

### 7.1 Model Lifecycle

```
New Model Version Available
        │
        ▼
[New record in model_registry (is_active=false)]
        │
        ▼
[AI Experiment configured in ai_experiments (A/B traffic split)]
        │
        ▼
[Gradual traffic migration via experiment_variants]
        │
        ▼
[model_registry: set old version deprecated_at, new version is_default=true]
        │
        ▼
[Embedding Regeneration Job: rebuild all embeddings using new model]
        │
        ▼
[Cleanup: mark old model_registry record is_active=false]
```

### 7.2 Prompt Lifecycle

```
Prompt authored in admin UI
        │
        ▼
[prompt_templates: version=DRAFT, published=false]
        │
        ▼
[Internal review + testing via prompt playground]
        │
        ▼
[publish action → published=true, published_at=now()]
         ── version is now IMMUTABLE ──
        │
        ▼
[AI service reads active prompts via slug + latest published version]
        │
        ▼
[Edit = new version record created (version+1, published=false)]
```

### 7.3 Inference Lifecycle

```
Inference Request → AI Gateway
        │
        ├── 1. Token Guard check [quota_meters.current_value < limit_value]
        │         └── if EXCEEDED: 429, emit monetization.quota_exceeded
        │
        ├── 2. Semantic cache lookup [semantic_cache WHERE embedding hash match]
        │         └── if HIT: return cached response, log cache_hit=true
        │
        ├── 3. Provider health check [provider_health_log]
        │         └── route to fallback provider if primary degraded
        │
        ├── 4. External LLM API call
        │
        ├── 5. Write to inference_logs [tokens, latency, cost]
        │
        ├── 6. Write to semantic_cache [new entry]
        │
        ├── 7. Write to event outbox [monetization.inference_completed]
        │         └── Billing consumer increments usage_meters
        │
        └── 8. Return response to caller
```

### 7.4 AI Cost Tracking Lifecycle

| Stage | Action | Record Location |
|:------|:-------|:---------------|
| Per-request | Log input_tokens, output_tokens, cost_usd | `ai_ops.inference_logs` |
| Real-time aggregation | Increment usage_meters.current_value | `billing_ledger.usage_meters` |
| Billing period close | Aggregate inference_logs → invoice line items | `billing_ledger.invoice_line_items` |
| Monthly archive | inference_logs older than 90 days → ClickHouse | External analytics store |
| Annual report | ClickHouse aggregation per tenant per model | Analytics dashboard |

---

## SECTION 8 — BILLING & MONETIZATION DATA MODEL

### 8.1 Monetization Lifecycle

```
MONETIZATION SOURCES
        │
        ├── Subscription Base Fee (monthly/annual)
        │     └── billing_period_end → Invoice Generation
        │
        ├── Usage Overage (AI tokens beyond plan limit)
        │     └── Daily metering → End-of-period invoice line
        │
        ├── Promoted Listing Campaigns (CPC/CPM)
        │     └── Per-click/impression → ledger_entry (charge type)
        │
        ├── Featured Slot Purchase
        │     └── One-time purchase → ledger_entry + credit_balance
        │
        └── Credit Top-up (manual prepaid)
              └── Stripe payment → ledger_entry (credit type)
```

### 8.2 Quota Lifecycle

```
Plan assigned → quota_meters initialized (current_value=0, limit_value=plan_quota)
      │
      ▼ (on each usage event)
quota_meters.current_value++ (atomic UPDATE)
      │
      ├── if current_value / limit_value >= 0.80 → emit monetization.quota_warning
      ├── if current_value / limit_value >= 0.95 → emit monetization.quota_critical
      └── if current_value >= limit_value → emit monetization.quota_exceeded
                                              block resource creation
      │
      ▼ (on billing period end)
quota_meters reset: current_value=0, period_start=new_period
```

### 8.3 Revenue Attribution Model

| Attribution Model | Calculation | Use Case |
|:-----------------|:-----------|:---------|
| **First Touch** | 100% credit to first marketing touchpoint | Acquisition channel analysis |
| **Last Touch** | 100% credit to last touchpoint before conversion | Campaign performance |
| **Linear** | Equal credit across all touchpoints | Balanced analysis |
| **Time Decay** | More credit to recent touchpoints (half-life: 7 days) | Standard reporting |
| **Data-Driven** | ML model based on historical conversion patterns | Enterprise analytics |

Revenue attribution records are stored in `analytics.revenue_attribution` and recomputed daily.

### 8.4 Ad Auction Data Model

**Auction mechanics** use a generalized second-price (GSP) model:

```
For each ad slot in discovery feed:
  1. Retrieve all active bids targeting current context (keyword/category)
  2. Sort bids by: bid_amount × quality_score (ad relevance) 
  3. Winner = highest-ranked bidder
  4. Price charged = bid_amount of runner-up + $0.01
  5. Write to ad_impressions (event_type='impression')
  6. On click: write to ad_impressions (event_type='click')
  7. Charge amount deducted from ad_campaigns.spent_cents
  8. Write ledger_entry (entry_type='charge', resource_type='ad_click')
```

---

## SECTION 9 — TRUST & MODERATION DATA MODEL

### 9.1 Trust Lifecycle

```
Entity Created (tenant, company, listing, user)
        │
        ▼
Initial trust_score assigned (new tier: score=0.3)
        │
        ▼
Behavioral signals accumulate (verification, reviews, interactions)
        │
        ├── Positive signals → score increases toward trusted/verified tier
        └── Negative signals (fraud, reports) → score decreases
        │
        ▼
Trust score used in:
  - Discovery ranking (light ranking formula: score × (1 - distance))
  - Listing visibility (below 0.2 threshold → hidden from search)
  - API rate limits (lower trust = stricter limits)
  - Moderation priority (lower trust = automatic priority review)
```

### 9.2 Moderation Lifecycle

```
Content Submitted
        │
        ▼
[listing_status → 'pending_review']
[moderation_items record created]
        │
        ▼
[AI scan worker pulls item from queue]
  ├── toxicity_scan → ai_scan_results
  ├── spam_scan → ai_scan_results
  ├── policy_scan → ai_scan_results
  └── visual_scan (if media) → ai_scan_results
        │
        ├── All scans PASS (confidence > 0.90) → automated APPROVE
        │     └── listing_status → 'active'
        │
        ├── Any scan FAILS (score > 0.80) → automated QUARANTINE
        │     └── listing_status → 'quarantined'
        │
        └── Uncertain (0.50 < score < 0.80) → HUMAN REVIEW QUEUE
              └── human_review_tasks record created
              └── listing_status → 'in_review'
        │
        ▼ (Human reviews)
[moderation_decisions record created]
  ├── APPROVE → listing_status → 'active'
  ├── REJECT → listing_status → 'rejected' + notification to tenant
  └── ESCALATE → escalation to senior moderator
```

### 9.3 Evidence Retention Rules

| Evidence Type | Retention Period | Rationale |
|:-------------|:----------------|:---------|
| AI scan results | 2 years | Appeal evidence |
| Moderation decisions | 2 years | Regulatory + appeal reference |
| Fraud signals | 1 year | Pattern analysis |
| Trust score history | 1 year | Score dispute resolution |
| Appeals | 2 years | Legal compliance |
| Content reports | 1 year | Abuse pattern detection |
| Behavioral anomalies | 1 year | Security forensics |

---

## SECTION 10 — ANALYTICS DATA MODEL

### 10.1 Event Store Architecture

The platform uses a **dual-layer analytics architecture**:

```
LAYER 1: PostgreSQL `analytics` schema
  → Pre-aggregated KPI snapshots, funnel/cohort snapshots, materialized views
  → Low-latency reads for dashboards
  → Updated hourly/daily by ETL workers

LAYER 2: ClickHouse (external OLAP)
  → Raw event streams from Kafka
  → Ad-hoc analytical queries
  → Retention: 2 years
  → Accessed via Analytics API (not by application services)
```

### 10.2 ClickHouse Table Design (Logical Specification)

| ClickHouse Table | Kafka Topic(s) Consumed | Primary Sort Key | Update Frequency |
|:----------------|:----------------------|:----------------|:----------------|
| `events_clickstream` | `clickstream.*` | `(tenant_id, created_at)` | Real-time streaming |
| `events_search` | `discovery.*` | `(tenant_id, created_at)` | Real-time streaming |
| `events_ai_usage` | `ai.*` | `(tenant_id, model_id, created_at)` | Real-time streaming |
| `events_billing` | `monetization.*` | `(org_id, tenant_id, created_at)` | Real-time streaming |
| `events_trust` | `trust.*` | `(entity_type, created_at)` | Real-time streaming |
| `events_moderation` | `moderation.*` | `(tenant_id, created_at)` | Real-time streaming |

### 10.3 Funnel Analysis Model

```
Funnel: Buyer Conversion (example)
  Step 1: page_viewed (any marketplace page)
  Step 2: listing_viewed
  Step 3: lead_submitted
  Step 4: lead_contacted
  Step 5: converted

ClickHouse query pattern:
  SELECT
    windowFunnel(86400)(created_at, event='page_viewed',
      event='listing_viewed', event='lead_submitted', 
      event='lead_contacted', event='converted') AS funnel_level,
    count() AS users
  FROM events_clickstream
  WHERE tenant_id = :tenant_id AND created_at >= :from
  GROUP BY funnel_level
```

### 10.4 Cohort Retention Model

```
Cohort Entry: users who submitted their first lead on week W
Observation: did they submit another lead in weeks W+1, W+2, ..., W+12?

Storage: analytics.cohort_snapshots stores pre-computed retention arrays
  retention_by_period: [1.0, 0.65, 0.48, 0.35, 0.28, ...]
  (index 0 = week 0 = 100%, index N = retention at week N)
```

### 10.5 Snapshot Generation Schedule

| Snapshot Type | Frequency | Source | Latency Target |
|:-------------|:---------|:-------|:--------------|
| KPI snapshots | Hourly | ClickHouse queries | <5 minutes |
| Funnel snapshots | Daily | ClickHouse windowFunnel | <30 minutes |
| Cohort snapshots | Weekly | ClickHouse retention query | <2 hours |
| Revenue attribution | Daily | ClickHouse + ledger_entries | <1 hour |
| Tenant health scores | Daily | Multiple domain aggregations | <30 minutes |
| Discovery quality | Hourly | feed_generations + click_events | <15 minutes |

---

## SECTION 11 — REALTIME DATA MODEL

### 11.1 Channel Topology

```
Platform Channel Topology:
  
  tenant:{tenant_id}:feed         → Marketplace listing updates, new recommendations
  tenant:{tenant_id}:moderation   → Moderation status changes for tenant's listings
  tenant:{tenant_id}:analytics    → Real-time KPI counters (views, leads, clicks)
  tenant:{tenant_id}:notifications → In-app notification delivery
  tenant:{tenant_id}:presence      → Team member online/offline status
  
  user:{user_id}:inbox            → Personal notification inbox updates
  user:{user_id}:conversations     → New messages and conversation updates
  
  platform:global                  → Platform announcements, maintenance windows
  platform:admin                   → Super Admin alerting (moderation queue depth, fraud alerts)
```

### 11.2 Event Propagation Path

```
Database Mutation (any domain)
        │
        ▼ (PostgreSQL WAL)
[Supabase Realtime WAL Listener]
        │
        ├── Filter by channel subscription rules
        ├── Apply RLS (user must have access to the changed record's tenant)
        │
        ▼
[WebSocket Broadcast to subscribed clients]
```

### 11.3 Isolation Strategy

| Isolation Layer | Mechanism |
|:---------------|:---------|
| **Channel namespace** | All tenant channels include `tenant_id`. Clients can only subscribe to their own tenant channels |
| **JWT-based authorization** | WebSocket connection requires valid JWT. Channel subscription validates JWT claims match channel namespace |
| **RLS on WAL** | Supabase Realtime respects PostgreSQL RLS when filtering WAL events |
| **Presence isolation** | Presence records are tenant-scoped. Users cannot see presence from other tenants |

---

## SECTION 12 — MULTI-TENANT ISOLATION MODEL

### 12.1 Isolation Matrix

| Isolation Layer | Strategy | Enforcement Point |
|:--------------|:---------|:-----------------|
| **Database rows** | RLS policies with `tenant_id = :context_tenant_id` | PostgreSQL RLS |
| **Vector search** | Mandatory `WHERE tenant_id = :tid` before ORDER BY vector | Query builder |
| **Cache keys** | `tenant:{tenant_id}:*` namespace prefix | Redis key convention |
| **Analytics** | ClickHouse queries always include `AND tenant_id = :tid` | Analytics API |
| **Storage buckets** | Paths prefixed with `/{tenant_id}/` | Supabase Storage path convention |
| **Realtime channels** | Channel names include `tenant:{tenant_id}` | WebSocket gateway |
| **Event mesh** | Kafka messages include `tenant_id` in headers | Event schema validation |
| **AI inference** | Token quotas are per-tenant leaky buckets | AI Gateway |
| **Audit logs** | `tenant_id` column on all audit events | Audit writer service |

### 12.2 Data Access Matrix

| Actor | Scope | Mechanism |
|:------|:------|:---------|
| **Tenant User** | Own tenant data only | RLS `tenant_id = :jwt_tenant_id` |
| **Tenant API Key** | Own tenant data, scoped to key's `scopes[]` | RLS + scope validator |
| **Super Admin** | All tenant data (read) + own tenant (write) | Admin bypass RLS policy |
| **System Service** | Own domain's data only | Database role-level schema restriction |
| **Background Worker** | Data it is processing only | Worker passes explicit tenant context |
| **Analytics Service** | Read-only across all tenants (aggregated) | Dedicated read-only database role |
| **Moderation Service** | Cross-tenant moderation queue (read) | Elevated moderation database role |

### 12.3 Tenant Context Injection Protocol (Enforced at Every Layer)

```
1. EDGE GATEWAY
   └── Extract tenant_id from JWT `claims.tenant_id`
   └── Inject x-tenant-id header into forwarded request

2. APPLICATION SERVICE
   └── Read x-tenant-id header
   └── Validate tenant is active (in-memory cache, TTL 5m)
   └── Set PostgreSQL session: SET LOCAL app.current_tenant_id = :tenant_id
   └── Set PostgreSQL session: SET LOCAL app.current_user_role = :role

3. POSTGRESQL RLS
   └── All SELECT/INSERT/UPDATE/DELETE checked against:
       tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid

4. VECTOR SEARCH
   └── Query builder enforces: WHERE tenant_id = :tenant_id BEFORE ORDER BY vector

5. REDIS CACHE
   └── All keys use format: tenant:{tenant_id}:{key_suffix}

6. SUPABASE STORAGE
   └── All paths use format: /{bucket}/{tenant_id}/{user_id}/{filename}
```

---

## SECTION 13 — RLS MASTER DESIGN

### 13.1 RLS Policy Categories

| Policy Category | Description | Applied To |
|:--------------|:-----------|:---------|
| **Standard Tenant Isolation** | Row visible only to the current tenant | All marketplace, discovery, billing, notifications tables |
| **Owner-Only Access** | Row visible only to the user who created it | `favorites`, `saved_searches`, `in_app_inbox` |
| **Platform-Level Access** | No tenant restriction (platform-wide data) | `categories`, `plan_definitions`, `property_types`, `model_registry`, `prompt_templates` |
| **Super Admin Bypass** | Full read access for Super Admin | All schemas via bypass policy |
| **Service Bypass** | Background service reads across tenant contexts | Via dedicated service database role (no RLS) |
| **Moderation Elevated** | Cross-tenant moderation queue access | `moderation.*` tables for moderation service role |
| **Analytics Read** | Read-only cross-tenant access with aggregation | ClickHouse analytics role (not PostgreSQL RLS) |

### 13.2 RLS Responsibility Matrix

| Schema | Table | Standard Tenant Isolation | Owner-Only | Super Admin Bypass | Service Bypass |
|:-------|:------|:------------------------:|:---------:|:-----------------:|:--------------:|
| `auth` | `users` | ❌ (platform-wide) | ❌ | ✅ | ✅ |
| `auth` | `sessions` | ❌ | ✅ (user_id) | ✅ | ✅ |
| `auth` | `api_keys` | ✅ (tenant_id) | ✅ (user_id) | ✅ | ✅ |
| `tenant_config` | `tenants` | ❌ (is the authority) | ❌ | ✅ | ✅ |
| `tenant_config` | `tenant_members` | ✅ (tenant_id) | ❌ | ✅ | ✅ |
| `marketplace` | `listings` | ✅ (tenant_id) | ❌ | ✅ | ✅ |
| `marketplace` | `companies` | ✅ (tenant_id) | ❌ | ✅ | ✅ |
| `marketplace` | `leads` | ✅ (tenant_id) | ❌ | ✅ | ✅ |
| `marketplace` | `favorites` | ✅ (tenant_id) | ✅ (user_id) | ✅ | ✅ |
| `marketplace` | `reviews` | ✅ (tenant_id) | ❌ | ✅ | ✅ |
| `search_index` | `search_candidates` | ✅ (tenant_id) | ❌ | ✅ | ✅ |
| `search_index` | `saved_searches` | ✅ (tenant_id) | ✅ (user_id) | ✅ | ✅ |
| `ai_ops` | `inference_logs` | ✅ (tenant_id) | ❌ | ✅ | ✅ |
| `ai_ops` | `prompt_templates` | ❌ (platform-wide) | ❌ | ✅ | ✅ |
| `ai_ops` | `model_registry` | ❌ (platform-wide) | ❌ | ✅ | ✅ |
| `billing_ledger` | `ledger_entries` | ✅ (tenant_id) | ❌ | ✅ | ✅ (append-only) |
| `billing_ledger` | `subscriptions` | ✅ (tenant_id) | ❌ | ✅ | ✅ |
| `trust_registry` | `trust_scores` | ✅ (tenant_id) | ❌ | ✅ | ✅ |
| `trust_registry` | `platform_fraud_patterns` | ❌ (platform-wide) | ❌ | ✅ | ✅ |
| `moderation` | `moderation_items` | ✅ (tenant_id) | ❌ | ✅ | ✅ (elevated role) |
| `moderation` | `appeals` | ✅ (tenant_id) | ✅ (appellant_id) | ✅ | ✅ |
| `personalization` | `user_behavior_profiles` | ✅ (tenant_id) | ✅ (user_id) | ✅ | ✅ |
| `recommendations` | `recommendation_snapshots` | ✅ (tenant_id) | ✅ (user_id) | ✅ | ✅ |
| `notifications` | `in_app_inbox` | ✅ (tenant_id) | ✅ (user_id) | ✅ | ✅ |
| `governance` | `audit_logs` | ❌ (platform-wide) | ❌ | ✅ | ✅ (audit writers only) |
| `governance` | `system_configs` | ❌ (platform-wide) | ❌ | ✅ | ❌ |
| `experimentation` | `user_assignments` | ✅ (tenant_id) | ❌ | ✅ | ✅ |
| `realtime_state` | `presence_records` | ✅ (tenant_id) | ✅ (user_id) | ✅ | ✅ |

---

## SECTION 14 — INDEXING STRATEGY

### 14.1 Primary Indexes (All Tables)

All tables use UUID v7 primary keys (`gen_random_uuid()` or ordered UUID for time-sortable performance). Primary key indexes are B-Tree and created automatically.

### 14.2 Domain-Specific Indexes

#### Identity Domain

| Table | Index Name | Columns | Type | Purpose |
|:------|:-----------|:--------|:-----|:--------|
| `users` | `idx_users_email_unique` | `(email)` | UNIQUE B-Tree | Authentication lookup |
| `sessions` | `idx_sessions_token_active` | `(token_hash) WHERE revoked_at IS NULL` | Partial Unique B-Tree | Active session validation |
| `sessions` | `idx_sessions_user_expires` | `(user_id, expires_at)` | B-Tree | User session management |
| `api_keys` | `idx_api_keys_hash_active` | `(key_hash) WHERE revoked_at IS NULL` | Partial Unique B-Tree | API key validation |
| `login_attempts` | `idx_login_attempts_ip_time` | `(ip_address, created_at DESC)` | B-Tree | Rate limiting |

#### Marketplace Domain

| Table | Index Name | Columns | Type | Purpose |
|:------|:-----------|:--------|:-----|:--------|
| `listings` | `idx_listings_tenant_active` | `(tenant_id, status) WHERE deleted_at IS NULL` | Partial B-Tree | Active listing queries |
| `listings` | `idx_listings_search_fts` | `(to_tsvector('english', title \|\| ' ' \|\| description))` | GIN | Full-text search |
| `listings` | `idx_listings_title_trgm` | `(title gin_trgm_ops)` | GIN (trigram) | Fuzzy title search |
| `listings` | `idx_listings_price_range` | `(price_cents, price_currency)` | B-Tree | Price filter |
| `listings` | `idx_listings_category_tenant` | `(category_id, tenant_id, status)` | B-Tree | Category browse |
| `listings` | `idx_listings_company` | `(company_id)` | B-Tree | Company portfolio |
| `listing_attributes` | `idx_lattr_listing_attr` | `(listing_id, attribute_id)` | Unique B-Tree | Attribute lookup |
| `listing_attributes` | `idx_lattr_attr_value` | `(attribute_id, value_string)` | B-Tree | Attribute filter |
| `listing_media` | `idx_media_listing_primary` | `(listing_id, is_primary)` | B-Tree | Primary media lookup |
| `listing_views` | `idx_views_listing_date` | `(listing_id, created_at DESC)` | B-Tree | View count analytics |
| `leads` | `idx_leads_tenant_status` | `(tenant_id, status, created_at DESC)` | B-Tree | Lead pipeline queries |
| `leads` | `idx_leads_listing` | `(listing_id)` | B-Tree | Listing lead count |
| `favorites` | `idx_favorites_user_tenant` | `(user_id, tenant_id)` | B-Tree | User favorites list |

#### Discovery Domain

| Table | Index Name | Columns | Type | Purpose |
|:------|:-----------|:--------|:-----|:--------|
| `search_candidates` | `idx_candidates_vector_hnsw` | `(embedding_vector vector_cosine_ops)` | HNSW | ANN similarity search |
| `search_candidates` | `idx_candidates_tenant_active` | `(tenant_id, status)` | B-Tree | Tenant candidate filtering |
| `search_candidates` | `idx_candidates_quality` | `(tenant_id, quality_score DESC)` | B-Tree | Quality-based sorting |
| `search_signals` | `idx_signals_listing_type` | `(listing_id, signal_type, window_end)` | B-Tree | Signal aggregation |
| `ranking_feature_store` | `idx_features_listing_fresh` | `(listing_id, computed_at DESC)` | B-Tree | Latest feature lookup |
| `feed_generations` | `idx_feeds_user_date` | `(user_id, created_at DESC)` | B-Tree | User feed history |
| `search_queries` | `idx_queries_tenant_date` | `(tenant_id, created_at DESC)` | B-Tree | Query analytics |
| `search_clicks` | `idx_clicks_query_listing` | `(query_id, listing_id)` | B-Tree | Click-through tracking |

#### AI Domain

| Table | Index Name | Columns | Type | Purpose |
|:------|:-----------|:--------|:-----|:--------|
| `semantic_cache` | `idx_cache_embedding_hnsw` | `(embedding_vector vector_cosine_ops)` | HNSW | Semantic cache lookup |
| `semantic_cache` | `idx_cache_expires` | `(expires_at) WHERE expires_at IS NOT NULL` | Partial B-Tree | TTL expiry cleanup |
| `inference_logs` | `idx_inference_tenant_date` | `(tenant_id, created_at DESC)` | B-Tree | Usage analytics |
| `inference_logs` | `idx_inference_model_date` | `(model_id, created_at DESC)` | B-Tree | Model usage analysis |
| `prompt_templates` | `idx_prompts_slug_version` | `(slug, version DESC) WHERE published = true` | Partial B-Tree | Active prompt resolution |

#### Billing Domain

| Table | Index Name | Columns | Type | Purpose |
|:------|:-----------|:--------|:-----|:--------|
| `ledger_entries` | `idx_ledger_tenant_date` | `(tenant_id, created_at DESC)` | B-Tree | Tenant ledger queries |
| `ledger_entries` | `idx_ledger_idempotency` | `(idempotency_key)` | UNIQUE B-Tree | Duplicate prevention |
| `usage_meters` | `idx_meters_tenant_resource` | `(tenant_id, resource_type)` | UNIQUE B-Tree | Quota check |
| `stripe_sync_log` | `idx_stripe_event_id` | `(stripe_event_id)` | UNIQUE B-Tree | Idempotent webhook |
| `ad_impressions` | `idx_impressions_campaign_date` | `(campaign_id, created_at DESC)` | B-Tree | Campaign performance |

#### Personalization Domain

| Table | Index Name | Columns | Type | Purpose |
|:------|:-----------|:--------|:-----|:--------|
| `user_behavior_profiles` | `idx_profiles_user_tenant` | `(user_id, tenant_id)` | UNIQUE B-Tree | Profile lookup |
| `user_behavior_profiles` | `idx_profiles_vector_hnsw` | `(preference_vector vector_cosine_ops)` | HNSW | Similar user lookup |
| `interaction_history` | `idx_interactions_user_date` | `(user_id, tenant_id, created_at DESC)` | B-Tree | User interaction history |
| `affinity_scores` | `idx_affinity_user_entity` | `(user_id, tenant_id, entity_type, entity_id)` | UNIQUE B-Tree | Affinity lookup |

#### Governance Domain

| Table | Index Name | Columns | Type | Purpose |
|:------|:-----------|:--------|:-----|:--------|
| `audit_logs` | `idx_audit_actor_date` | `(actor_id, created_at DESC)` | B-Tree | Actor audit trail |
| `audit_logs` | `idx_audit_entity` | `(entity_type, entity_id, created_at DESC)` | B-Tree | Entity audit trail |
| `audit_logs` | `idx_audit_tenant_date` | `(tenant_id, created_at DESC)` | B-Tree | Tenant audit queries |
| `audit_logs` | `idx_audit_action_date` | `(action, created_at DESC)` | B-Tree | Action-based queries |

---

## SECTION 15 — PARTITIONING STRATEGY

### 15.1 Partition Table Inventory

| Schema | Table | Partition Key | Strategy | Interval | Max Partitions | Retention |
|:-------|:------|:-------------|:---------|:---------|:--------------|:---------|
| `auth` | `login_attempts` | `created_at` | Range | Monthly | 3 (rolling) | 90 days |
| `marketplace` | `listings` | `created_at` | Range | Quarterly | 20 (5 years) | Indefinite |
| `marketplace` | `listing_versions` | `created_at` | Range | Quarterly | 8 (2 years) | 2 years |
| `marketplace` | `listing_status_transitions` | `created_at` | Range | Monthly | 12 (1 year) | 1 year |
| `marketplace` | `listing_views` | `created_at` | Range | Daily | 90 (rolling) | 90 days |
| `search_index` | `feed_generations` | `created_at` | Range | Daily | 30 (rolling) | 30 days |
| `search_index` | `search_queries` | `created_at` | Range | Daily | 90 (rolling) | 90 days |
| `search_index` | `search_clicks` | `created_at` | Range | Daily | 90 (rolling) | 90 days |
| `ai_ops` | `inference_logs` | `created_at` | Range | Daily | 90 (rolling) | 90 days → ClickHouse |
| `ai_ops` | `semantic_cache` | `created_at` | Range | Weekly | 2 (rolling) | 7 days |
| `billing_ledger` | `ledger_entries` | `created_at` | Range | Monthly | 84 (7 years) | 7 years |
| `billing_ledger` | `invoices` | `billing_period_start` | Range | Monthly | 84 (7 years) | 7 years |
| `billing_ledger` | `invoice_line_items` | `created_at` | Range | Monthly | 84 (7 years) | 7 years |
| `billing_ledger` | `ad_impressions` | `created_at` | Range | Daily | 90 (rolling) | 90 days |
| `trust_registry` | `trust_score_history` | `calculated_at` | Range | Monthly | 12 (1 year) | 1 year |
| `trust_registry` | `fraud_signals` | `detected_at` | Range | Monthly | 12 (1 year) | 1 year |
| `moderation` | `moderation_decisions` | `decided_at` | Range | Monthly | 24 (2 years) | 2 years |
| `personalization` | `interaction_history` | `created_at` | Range | Monthly | 12 (1 year) | 12 months |
| `personalization` | `preference_evolution_log` | `created_at` | Range | Monthly | 3 (rolling) | 90 days |
| `governance` | `audit_logs` | `created_at` | Range | Monthly | 36 (3 years) | 3 years |
| `governance` | `admin_actions` | `performed_at` | Range | Monthly | 36 (3 years) | 3 years |
| `experimentation` | `user_assignments` | `assigned_at` | Range | Monthly | 6 (rolling) | 6 months |
| `experimentation` | `experiment_events` | `created_at` | Range | Monthly | 6 (rolling) | 6 months |
| `event_outbox` | `outbox_events` | `created_at` | Range | Daily | 7 (rolling) | 7 days |

### 15.2 Partition Management Strategy

| Operation | Mechanism | Frequency |
|:----------|:---------|:---------|
| **Partition creation** | pg_cron job creates next partition 7 days in advance | Weekly |
| **Partition dropping** | pg_cron job detaches and drops expired partitions | Daily |
| **Archival before drop** | ETL job exports data to S3 before dropping partition | Before every drop |
| **Partition pruning** | PostgreSQL uses constraint exclusion to skip irrelevant partitions | Automatic |
| **Vacuum scheduling** | VACUUM ANALYZE scheduled per partition during low-traffic periods | Weekly |

### 15.3 Archival & Cold Storage Strategy

| Data Tier | Destination | Format | Compression | Query Tool |
|:----------|:-----------|:-------|:-----------|:-----------|
| Operational (hot) | PostgreSQL primary | Row store | N/A | SQL |
| Analytical (warm) | ClickHouse | Columnar | LZ4 | ClickHouse SQL |
| Archived (cold) | AWS S3 / Supabase Storage | Parquet | Snappy | Athena / DuckDB |
| Compliance (frozen) | S3 Glacier | Parquet | Snappy | Athena (on-demand) |

---

## SECTION 16 — STORAGE & MEDIA ARCHITECTURE

### 16.1 Supabase Storage Bucket Design

| Bucket Name | Owner Domain | Contents | Access Policy | Lifecycle |
|:-----------|:------------|:---------|:-------------|:---------|
| `listing-media` | Marketplace | Images, videos, 360° tours, documents for listings | Tenant-scoped read; public CDN for published listings | Deleted when listing archived (30-day grace) |
| `company-assets` | Marketplace | Company logos, banners, media kits | Tenant-scoped read; public CDN for active companies | Deleted when company deactivated |
| `avatars` | Identity | User profile photos | Public read (via CDN); user write | Deleted when user deleted |
| `verification-documents` | Trust & Safety | KYC/business verification uploads | Private; Trust Service read; Super Admin read | Retained 7 years post-verification |
| `moderation-assets` | Moderation | Screenshots and evidence captured during moderation | Private; Moderation Service read; Super Admin read | Retained 2 years post-decision |
| `ai-assets` | AI Infra | Fine-tuning datasets, model evaluation datasets | Private; AI Service read | Retained per model lifecycle |
| `campaign-assets` | Billing | Ad creative images and videos | Tenant read/write; public CDN for active campaigns | Deleted when campaign ended + 30 days |
| `exports` | Analytics | Tenant-generated data export files | Tenant owner read only; temporary (7-day TTL) | Auto-deleted after 7 days |
| `compliance-exports` | Governance | GDPR/data subject access request exports | Super Admin + subject user; temporary (30-day TTL) | Auto-deleted after 30 days |

### 16.2 Storage Path Convention

All paths follow: `/{bucket}/{tenant_id}/{entity_type}/{entity_id}/{filename}`

Examples:
- `listing-media/ten_abc123/listings/lst_def456/photo_001.webp`
- `avatars/usr_abc123/profile/avatar_v3.jpg`
- `verification-documents/ten_abc123/company/kyc_2026-05.pdf`

### 16.3 Media Processing Pipeline Security Rules

| Rule | Enforcement |
|:-----|:-----------|
| Maximum file size: 100MB (images), 2GB (video) | Supabase Storage upload limit |
| Allowed MIME types per bucket | Bucket-level MIME type validation |
| Virus scanning on all uploads | ClamAV/S3-triggered Lambda scan |
| EXIF stripping on images | Media processing worker (remove GPS, device metadata) |
| AI visual moderation scan | Moderation worker triggered on `media.uploaded` event |
| CDN URLs expire in 1 hour for private assets | Signed URL generation on read request |
| Public listing CDN URLs do not expire | Set to public when listing is approved |

---

## SECTION 17 — DATA RETENTION & GOVERNANCE

### 17.1 Retention Policy Matrix

| Data Category | Retention Period | Storage Tier | Deletion Method | Regulation |
|:-------------|:----------------|:------------|:----------------|:----------|
| Core user identity | Account lifetime + 90 days | Hot | Hard delete | GDPR Art. 17 |
| Active sessions | 30 days or logout | Hot | Auto-purge | Privacy |
| Transaction records (ledger, invoices) | 7 years | Hot → Cold after 2 years | Archival then delete | Financial |
| Audit logs | 3 years | Hot → Cold after 1 year | Archival then delete | SOC2, ISO27001 |
| Moderation decisions | 2 years | Hot | Archival then soft-delete | Trust & Safety |
| AI inference logs | 90 days | Hot → ClickHouse | Partition drop | Operational |
| Analytics events | 2 years | ClickHouse | Partition drop | Business |
| Embedding vectors | Account/listing lifetime | Hot | Cascade delete on entity delete | Data hygiene |
| Media files | Listing lifetime + 30-day grace | Object storage | Scheduled deletion job | Storage cost |
| Verification documents | 7 years | Cold | Glacier → Hard delete | KYC regulations |
| Compliance records | 7 years | Cold | Hard delete | GDPR/legal |

### 17.2 GDPR Readiness Model

| GDPR Right | Platform Implementation |
|:-----------|:----------------------|
| **Right to Access** | Data export endpoint generates full user data package to `compliance-exports` bucket. 30-day delivery target |
| **Right to Erasure** | User deletion workflow: soft-delete → anonymize PII in logs → hard-delete identifiable records after 90 days → purge vectors |
| **Right to Portability** | JSON/CSV export of all user-owned data (listings, leads, favorites, messages) |
| **Right to Rectification** | User settings allow updating profile, contact info, and explicit preferences |
| **Data Minimization** | PII is NOT stored in analytics events. User IDs are hashed in ClickHouse. IP addresses are hashed after 30 days |
| **Consent Management** | `user_consent_records` table tracks marketing consent, analytics consent, and cookie preferences |
| **Breach Notification** | `compliance_records` workflow with 72-hour regulatory reporting target |

### 17.3 Soft vs Hard Delete Strategy

| Entity | Soft Delete | Hard Delete Trigger |
|:-------|:-----------|:-------------------|
| `users` | `deleted_at` timestamp set | 90 days after soft delete |
| `tenants` | `deleted_at` + status=`archived` | 90 days after deprovisioning |
| `listings` | `deleted_at` timestamp set | 30 days after archival |
| `companies` | `deleted_at` timestamp set | When associated tenant is hard-deleted |
| `moderation_decisions` | Never deleted | Archived to cold storage after 2 years |
| `ledger_entries` | Never deleted (write-only) | Never (financial compliance) |
| `audit_logs` | Never deleted | Archived to cold storage after 1 year |

---

## SECTION 18 — DATABASE SCALABILITY ANALYSIS

### 18.1 Growth Projections

| Domain | Year 1 | Year 2 | Year 3 | Key Scaling Concern |
|:-------|:-------|:-------|:-------|:-------------------|
| Users | 100K | 500K | 2M | Session table size, login attempt partitions |
| Tenants | 10K | 50K | 200K | Routing table cache invalidation |
| Listings | 500K | 3M | 15M | HNSW index rebuild time, partition management |
| Embeddings | 500K | 3M | 15M | pgvector HNSW index size, rebuild time |
| Inference logs | 50M | 500M | 2B | Partition rotation, ClickHouse archival |
| Analytics events | 1B | 10B | 50B | ClickHouse scaling, Kafka throughput |
| Ledger entries | 10M | 100M | 500M | Ledger append throughput |
| Audit logs | 50M | 500M | 2B | Partition management, cold archival |
| Moderation cases | 500K | 5M | 25M | Queue throughput |

### 18.2 Scaling Risk Analysis

| Risk | Trigger Threshold | Impact | Mitigation |
|:-----|:-----------------|:-------|:---------|
| **HNSW index rebuild time** | >5M embeddings | >30-min rebuild window; search degradation | Partition by tenant_id hash; extract to dedicated pgvector cluster |
| **Listing table IOPS** | >5M listings, >1K writes/sec | Query latency degradation | Quarterly partitions + materialized snapshot reads |
| **Inference log write throughput** | >100K inferences/hour | WAL lag, replication delay | Daily partitions + async Kafka write → ClickHouse |
| **Audit log volume** | >50M rows/year | Storage cost, query latency | Monthly partitions, 1-year hot retention, auto-archive |
| **Analytics event volume** | >1B events/month | ClickHouse cost, query time | Materialized aggregates reduce raw query frequency |
| **Connection pool exhaustion** | >10K concurrent API requests | DB connection timeout | PgBouncer transaction mode + connection limit per service |
| **Kafka consumer lag** | >5 minutes behind real-time | Delayed billing, stale analytics | Scale consumer replicas; increase partition count |
| **Vector index memory** | >100GB pgvector index | OOM events on DB server | Partition index by tenant; extract to Pinecone/Milvus |
| **Ledger write locks** | >1K concurrent billing events | Invoice generation delays | Separate ledger writer service; Kafka batch accumulation |
| **RLS performance** | Complex nested subqueries | High CPU on policy checks | Pre-compute tenant_id from JWT at gateway; avoid DB-level lookups |

### 18.3 Extraction Indicators

| Component | Extract When | Target Architecture |
|:----------|:-----------|:-------------------|
| **Vector Store** | HNSW rebuild >30 min OR pgvector CPU >40% | Dedicated pgvector cluster or Pinecone |
| **Billing Ledger** | Ledger append throughput >5K events/sec | Isolated append-only PostgreSQL instance |
| **Analytics** | ClickHouse queries taking >2 min for dashboards | Dedicated ClickHouse cluster with SSD |
| **AI Inference Cache** | Semantic cache Redis latency >50ms | Dedicated Redis cluster with vector search |
| **Search** | Feed generation latency >100ms | Dedicated search microservice (Elasticsearch/Typesense) |
| **Audit Logs** | Audit log table >100M rows | Dedicated append-only log store or ClickHouse |

---

## SECTION 19 — DATABASE EVOLUTION ROADMAP

### Phase AA.1 — Foundation Consolidation
**Duration:** Weeks 1-4  
**Objective:** Normalize the existing Supabase foundation to the domain schema model defined in this specification.

**Entities Introduced:**
- Migrate existing `users` table → `auth.users` schema alignment
- Migrate existing `companies` → `marketplace.companies`
- Migrate existing `listings` → `marketplace.listings` with status machine
- Create `marketplace.listing_versions` for version history
- Create `marketplace.listing_status_transitions` for audit trail
- Create `marketplace.listing_media` and migrate existing media references
- Create `marketplace.leads` from existing lead capture data
- Align `marketplace.categories` from existing category data
- Normalize `tenant_config.tenant_members` from `roles_permissions`
- Normalize `governance.audit_logs` from existing `audit_logs`
- Create `notifications.in_app_inbox` from existing `notifications`
- Create `ai_ops.inference_logs` and `ai_ops.model_registry`

**Dependencies:** Existing Supabase foundation  
**Migration Risks:** Data loss during normalization; RLS misconfiguration  
**Validation Strategy:**
- Row count validation before/after migration
- RLS penetration tests (cross-tenant query must return 0 rows)
- Integration tests for all existing API endpoints against new schema

---

### Phase AA.2 — Discovery & Search Layer
**Duration:** Weeks 5-8  
**Objective:** Build the discovery pipeline data foundation.

**Entities Introduced:**
- `search_index.search_candidates` with pgvector HNSW index
- `search_index.ranking_feature_store`
- `search_index.search_signals`
- `search_index.feed_generations`
- `search_index.search_queries` + `search_clicks`
- `search_index.saved_searches` + `search_alerts`
- `vector_store.embeddings` (migrate from any existing embedding storage)
- `vector_store.embedding_versions`
- `experimentation.experiments` + `experiment_variants`

**Dependencies:** Phase AA.1 (listings must exist in new schema)  
**Migration Risks:** HNSW index build time for existing listings; cold-start for new search candidates  
**Validation Strategy:**
- Embedding generation test for 1,000 sample listings
- HNSW index recall test (top-10 semantic search precision >0.85)
- Feed generation latency test (<50ms at 10K candidates)

---

### Phase AA.3 — AI & Personalization Layer
**Duration:** Weeks 9-12  
**Objective:** Build the complete AI operational infrastructure and personalization foundation.

**Entities Introduced:**
- `ai_ops.prompt_templates` with versioning
- `ai_ops.semantic_cache` with HNSW index
- `ai_ops.ai_governance_policies`
- `ai_ops.provider_health_log`
- `ai_ops.ai_experiments` + `ai_evaluations` + `ai_feedback`
- `personalization.user_behavior_profiles`
- `personalization.interaction_history`
- `personalization.affinity_scores`
- `personalization.explicit_preferences`
- `recommendations.recommendation_snapshots`
- `recommendations.related_listings`
- `recommendations.trending_listings`
- `recommendations.recommendation_feedback`

**Dependencies:** Phase AA.2 (search candidates and embeddings must exist)  
**Migration Risks:** Cold-start for personalization profiles; AI provider rate limits during bulk embedding  
**Validation Strategy:**
- Semantic cache hit rate test (should exceed 40% within 72h of warm-up)
- Personalization vector update latency test (<100ms for fast-loop Redis update)
- Recommendation snapshot delivery test (<5ms from Redis)

---

### Phase AA.4 — Billing & Monetization Layer
**Duration:** Weeks 13-16  
**Objective:** Build enterprise-grade billing infrastructure with usage metering.

**Entities Introduced:**
- `billing_ledger.subscriptions` (migrate from existing billing data)
- `billing_ledger.ledger_entries` (immutable, write-only)
- `billing_ledger.invoices` + `invoice_line_items`
- `billing_ledger.credit_balances`
- `billing_ledger.usage_meters`
- `billing_ledger.payment_methods`
- `billing_ledger.stripe_sync_log`
- `billing_ledger.ad_campaigns` + `ad_bids` + `ad_impressions`
- `tenant_config.quota_meters`

**Dependencies:** Phase AA.1 (tenant config), Phase AA.3 (AI usage tracking)  
**Migration Risks:** Double-billing during migration; Stripe sync integrity  
**Validation Strategy:**
- Ledger idempotency test (duplicate events must produce single ledger entry)
- Quota enforcement test (resource creation must fail at 100% quota)
- Stripe webhook round-trip test (charge → webhook → ledger entry verified)

---

### Phase AA.5 — Trust, Moderation & Governance Layer
**Duration:** Weeks 17-20  
**Objective:** Complete the trust infrastructure, full moderation pipeline, and governance compliance layer.

**Entities Introduced:**
- `trust_registry.trust_scores` + `trust_score_history`
- `trust_registry.verification_requests` + `verification_records`
- `trust_registry.fraud_signals` + `behavioral_anomalies`
- `trust_registry.risk_profiles`
- `trust_registry.platform_fraud_patterns`
- `moderation.moderation_items` + `ai_scan_results`
- `moderation.human_review_tasks` + `moderation_decisions`
- `moderation.appeals` + `content_reports`
- `moderation.reviewer_performance`
- `governance.compliance_records`
- `governance.global_announcements`
- `notifications.notification_templates` (full expansion)
- `notifications.push_subscriptions`
- `notifications.notification_preferences`
- `analytics.analytics_kpi_snapshots` + `funnel_definitions` + cohort models
- `realtime_state.realtime_channels` + `presence_records`

**Dependencies:** All previous phases  
**Migration Risks:** High false-positive rate in AI moderation (calibration required); trust score cold-start  
**Validation Strategy:**
- Moderation pipeline end-to-end test (listing submission → AI scan → decision → notification)
- Trust score recalculation test (fraud signal → trust_score update within 30 seconds)
- RLS comprehensive penetration test across all 15 domains
- GDPR right-to-erasure test (user deletion → 90-day hard delete verification)

---

## SECTION 20 — FINAL DATABASE BLUEPRINT

### 20.1 Complete ERD Domain Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         KERNEL TIER (No AI Dependencies)                     │
│                                                                               │
│  ┌──────────────┐    ┌──────────────────┐    ┌─────────────────────────┐    │
│  │ auth schema  │    │ tenant_config    │    │ governance schema        │    │
│  │ (Identity)   │◄───│ schema (Tenant)  │    │ (audit, configs, admin) │    │
│  └──────────────┘    └──────────────────┘    └─────────────────────────┘    │
│         │                    │                                               │
│         └────────────────────┼───────────────────────────────────────────┐  │
│                              │                                            │  │
│  ┌───────────────────────────▼────────────────────────────────────────┐  │  │
│  │                      billing_ledger schema                          │  │  │
│  │        (subscriptions, ledger, invoices, usage meters, ads)        │  │  │
│  └────────────────────────────────────────────────────────────────────┘  │  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    MARKETPLACE TIER (Core Business Logic)                    │
│                                                                               │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                    marketplace schema                               │     │
│  │  listings · versions · media · attributes · categories             │     │
│  │  companies · agents · projects · reviews · leads · favorites       │     │
│  └───────────────────────────┬────────────────────────────────────────┘     │
│                              │                                               │
│  ┌───────────────────────────▼──────────┐  ┌────────────────────────────┐  │
│  │         trust_registry schema        │  │     moderation schema       │  │
│  │  (trust scores, fraud, verification) │  │ (cases, decisions, appeals) │  │
│  └──────────────────────────────────────┘  └────────────────────────────┘  │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │              notifications schema + realtime_state schema            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│               COGNITIVE TIER (AI-Dependent, Gracefully Degradable)           │
│                                                                               │
│  ┌──────────────┐    ┌────────────────────┐    ┌──────────────────────┐    │
│  │  ai_ops      │───►│  search_index      │───►│  recommendations     │    │
│  │  schema      │    │  schema            │    │  schema              │    │
│  │  (AI infra)  │    │  (candidates, feed)│    │  (snapshots, related)│    │
│  └──────┬───────┘    └────────────────────┘    └──────────────────────┘    │
│         │                                                                    │
│  ┌──────▼───────────────────────────────────────────────────────────────┐   │
│  │                     personalization schema                            │   │
│  │          (behavior profiles, interactions, affinity scores)           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
│                                                                               │
│  ┌──────────────────────────┐    ┌────────────────────────────────────┐    │
│  │  analytics schema (PG)   │    │  experimentation schema             │    │
│  │  + ClickHouse (external) │    │  (experiments, variants, bandit)   │    │
│  └──────────────────────────┘    └────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘

                        ┌──────────────────────┐
                        │  event_outbox schema  │
                        │  (shared, cross-tier) │
                        └──────────────────────┘
```

### 20.2 Complete Entity Count Summary

| Domain | Schema | Tables | Partitioned Tables | Vector Indexes | Estimated Year 1 Scale |
|:-------|:-------|:-------|:-----------------|:--------------|:----------------------|
| Identity | `auth` | 8 | 1 | 0 | 100K users, 1M sessions |
| Tenant | `tenant_config` | 11 | 0 | 0 | 10K tenants |
| Marketplace | `marketplace` | 17 | 4 | 0 | 500K listings |
| Discovery | `search_index` | 9 | 3 | 1 (HNSW on candidates) | 500K candidates |
| AI | `ai_ops` | 9 | 3 | 1 (HNSW on semantic cache) | 50M inferences |
| Recommendations | `recommendations` | 5 | 0 | 0 | 100K snapshots |
| Personalization | `personalization` | 5 | 2 | 1 (HNSW on profiles) | 100K profiles |
| Analytics | `analytics` | 7 | 0 | 0 | 1B events (ClickHouse) |
| Trust & Safety | `trust_registry` | 7 | 2 | 0 | 1M fraud signals |
| Moderation | `moderation` | 7 | 1 | 0 | 500K cases |
| Billing | `billing_ledger` | 11 | 5 | 0 | 10M ledger entries |
| Notifications | `notifications` | 5 | 0 | 0 | 5M records |
| Realtime | `realtime_state` | 3 | 0 | 0 | 50K presence records |
| Governance | `governance` | 6 | 2 | 0 | 50M audit logs |
| Experimentation | `experimentation` | 7 | 2 | 0 | 10M assignments |
| Event Outbox | `event_outbox` | 1 | 1 | 0 | 100M events (purged) |
| **TOTAL** | **16 schemas** | **118 tables** | **26 partitioned** | **3 HNSW** | — |

### 20.3 Complete Ownership Map Summary

```
WRITE AUTHORITY (per schema):
  auth            → Identity Service only
  tenant_config   → Tenant Service only
  marketplace     → Marketplace Service (listings); Trust Service (quarantine flags via events)
  search_index    → Discovery Engine only
  ai_ops          → AI Infrastructure Service only
  recommendations → Recommendation Engine only
  personalization → Intelligence Engine (slow loop); Redis (fast loop, ephemeral)
  analytics       → Analytics ETL Workers + ClickHouse consumers
  trust_registry  → Trust & Safety Service only
  moderation      → Moderation Service only
  billing_ledger  → Billing Service (subscriptions/invoices); Ledger Writer (ledger_entries, append-only)
  notifications   → Notification Service only
  realtime_state  → Realtime Infrastructure + Supabase Realtime
  governance      → Audit Writers + Super Admin only
  experimentation → Experimentation Service only
  event_outbox    → ANY domain (write only); Outbox Collector (read only)
```

### 20.4 Lifecycle Map Summary

| Lifecycle Stage | Trigger | Affected Domains |
|:---------------|:--------|:----------------|
| **User Registration** | Auth event | Identity, Tenant (membership), Personalization (profile init), Notifications (welcome) |
| **Tenant Provisioning** | Plan purchase | Tenant, Billing (subscription + meters), Governance (audit), Notifications |
| **Listing Published** | Moderator approval | Marketplace (status), Discovery (candidate added), AI (embedding generated), Trust (quality evaluated) |
| **User Searches** | Search request | Discovery (feed generated, query logged), Personalization (fast-loop update), Analytics (event), Billing (quota meter) |
| **Lead Captured** | Buyer action | Marketplace (lead record), Notifications (agent alert), Analytics (conversion event), Billing (lead credit if applicable) |
| **Invoice Generated** | Billing period end | Billing (invoice, ledger entry), Notifications (invoice email), Analytics (revenue event) |
| **Fraud Detected** | Trust engine | Trust (fraud signal, score update), Moderation (case created), Marketplace (listing quarantined), Notifications (admin alert) |
| **Tenant Deprovisioned** | Owner request | Tenant (status archived), Marketplace (listings soft-deleted), Billing (subscription canceled), Personalization (profiles deleted), AI (embeddings deleted), Governance (audit log), Storage (scheduled deletion) |

### 20.5 Scaling Evolution Map

| Scale Stage | Active Listings | Tenants | Actions Required |
|:-----------|:---------------|:--------|:----------------|
| **Stage 0: MVP** | <10K | <100 | Single PostgreSQL, no partitioning required |
| **Stage 1: Growth** | <500K | <10K | Enable partitioning; add HNSW indexes; PgBouncer |
| **Stage 2: Scale** | <5M | <100K | Partition by tenant hash for vector store; extract billing ledger |
| **Stage 3: Enterprise** | <15M | <1M | Extract pgvector to dedicated cluster; full ClickHouse; Kafka |
| **Stage 4: Global** | >15M | >1M | Multi-region Aurora; Pinecone/Milvus; Global Redis; Edge indexes |

### 20.6 Inviolable Database Laws

1. **Ledger Immutability**: `billing_ledger.ledger_entries` permits only INSERT. No UPDATE or DELETE. Ever. Violations are a security incident.

2. **Tenant Context Always Set**: Every database session from an application service must execute `SET LOCAL app.current_tenant_id` before any query. Services that bypass this are in violation.

3. **Vector Queries Always Tenant-Filtered**: All `ORDER BY embedding <=> :vector` queries must include `WHERE tenant_id = :tenant_id`. Vector search without tenant scope is a data breach vector.

4. **Cross-Domain Direct Queries Forbidden**: No service may execute queries against a schema it does not own. Cross-domain data access occurs only via the Event Mesh or REST APIs.

5. **Audit Logs Are Append-Only**: `governance.audit_logs` permits only INSERT. No UPDATE or DELETE. The audit trail is the system's immutable memory.

6. **Outbox Before External**: Any state change and its associated event must be written in the same transaction to the outbox table. Direct Kafka/webhook calls without the outbox pattern are forbidden.

7. **AI Inference Must Be Metered**: Every call to the AI Gateway must result in a token usage record in `ai_ops.inference_logs` and an increment to `billing_ledger.usage_meters`. Unmetered inference is a billing integrity violation.

8. **Soft Delete Before Hard Delete**: No entity with a `deleted_at` column may be hard-deleted without a minimum 30-day soft-delete period. GDPR right-to-erasure requests are the only exception (90 days for user data).

9. **Financial Data Compliance**: Invoices, ledger entries, and payment records must be retained for 7 years. Automated deletion jobs must explicitly exclude financial tables.

10. **pgvector Dimensions Are Fixed**: The embedding dimension (1536) must not be changed without a full re-indexing migration plan. All HNSW indexes must be rebuilt before any model version change is activated in production.

---

*End of Spec 22 — Database Evolution Master Design*  
*Basis: PLANNER.md, Spec 01–21*  
*Status: Execution-Ready*  
*Next Action: Begin Phase AA.1 — Foundation Consolidation*
