# SPEC 03 — MULTI-TENANT DATA MODEL

> **Basis**: [PLANNER.md §13](file:///home/mohal665544/pr1/PLANNER.md) — Master Tenant Isolation Model  
> **Status**: Execution-Ready

---

## 1. Organizational Hierarchy

```
Platform (Global)
└── Organization
    └── Tenant
        └── Workspace
            └── Members (Users with Roles)
```

### 1.1 Organization Entity

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | Top-level legal/billing entity. A company or individual that owns one or more tenants |
| **Identity** | `organization_id` (UUID v7, time-ordered) |
| **Fields** | `name`, `legal_name`, `tax_id`, `billing_email`, `billing_address`, `country_code`, `created_at`, `updated_at`, `status` (active, suspended, closed) |
| **Limits** | Max 50 tenants per organization (Enterprise: unlimited) |
| **Billing Ownership** | Organization is the billing entity. Invoices are generated at the organization level and may aggregate across tenants |
| **KYC Status** | `kyc_status` (pending, verified, rejected). Required for Enterprise tier |

### 1.2 Tenant Entity

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | Isolated workspace instance with independent data, configurations, and quotas |
| **Identity** | `tenant_id` (UUID v7), `slug` (unique, URL-safe) |
| **Fields** | `name`, `slug`, `organization_id`, `plan_id`, `status` (provisioning, active, suspended, deprovisioning), `environment` (production, staging, development), `created_at`, `updated_at`, `custom_domain`, `branding` (JSONB: logo_url, primary_color, secondary_color), `settings` (JSONB: timezone, locale, currency) |
| **Isolation Scope** | Every tenant-owned table row includes `tenant_id`. RLS policies enforce isolation |
| **Plan Binding** | Exactly one active `tenant_plan` record linking to a `plan_definition` |
| **Feature Flags** | Per-tenant feature flag overrides stored in `feature_flags` table |

### 1.3 Workspace Entity

| Attribute | Specification |
|:----------|:-------------|
| **Purpose** | Sub-partition within a tenant for team-level or project-level isolation |
| **Identity** | `workspace_id` (UUID v7) |
| **Fields** | `tenant_id`, `name`, `slug`, `description`, `created_by`, `created_at`, `updated_at`, `status` (active, archived) |
| **Isolation** | Workspaces share the tenant's RLS boundary but can have workspace-specific permissions |
| **Default** | Every tenant has a default workspace created at provisioning time |

---

## 2. Role & Permission Model

### 2.1 Role Hierarchy

```
Platform Level:
  super_admin ──── Full platform access, tenant impersonation, system configuration

Organization Level:
  org_owner ────── Organization billing, tenant creation/deletion, member management
  org_admin ────── Organization member management, billing view (no deletion)

Tenant Level:
  tenant_owner ─── Full tenant access, workspace management, plan upgrades
  tenant_admin ─── Tenant configuration, member management, listing management
  tenant_editor ── Content creation, listing management, analytics view
  tenant_viewer ── Read-only access to dashboards, analytics, listings
  tenant_api ───── Programmatic API access only (no dashboard access)

Workspace Level:
  workspace_admin ── Full workspace access within tenant boundaries
  workspace_member ─ Standard workspace access, content creation
  workspace_viewer ─ Read-only workspace access
```

### 2.2 Permission Matrix

| Permission | super_admin | org_owner | tenant_owner | tenant_admin | tenant_editor | tenant_viewer | tenant_api |
|:-----------|:-----------:|:---------:|:------------:|:------------:|:-------------:|:-------------:|:----------:|
| **Platform Config** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Tenant Impersonation** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Moderation Queue** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Create Tenant** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Delete Tenant** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Manage Billing** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Upgrade Plan** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Manage Members** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Configure Settings** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Create/Edit Listings** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **View Analytics** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Listings** | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **AI Inference** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **API Key Management** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |

### 2.3 Membership Model

| Attribute | Specification |
|:----------|:-------------|
| **Table** | `tenant_config.tenant_members` |
| **Fields** | `membership_id`, `user_id`, `tenant_id`, `role`, `workspace_ids[]` (ARRAY), `invited_by`, `joined_at`, `status` (active, suspended, removed), `last_active_at` |
| **Constraints** | One user can belong to multiple tenants (multi-tenancy). One user has exactly one role per tenant. Workspace access is a subset of tenant access |
| **Invitation Flow** | Invitation → Email verification → Membership creation → Default workspace assignment |

---

## 3. Feature Access Model

### 3.1 Plan Definitions

| Plan | Monthly Price | Tenants | Members | Listings | AI Tokens/mo | Vector Storage | API Rate | Support |
|:-----|:-------------|:--------|:--------|:---------|:-------------|:--------------|:---------|:--------|
| **Free** | $0 | 1 | 2 | 10 | 10,000 | 100MB | 100 req/min | Community |
| **Starter** | $29 | 1 | 5 | 100 | 100,000 | 1GB | 500 req/min | Email |
| **Professional** | $99 | 3 | 20 | 1,000 | 500,000 | 10GB | 2,000 req/min | Priority |
| **Business** | $299 | 10 | 100 | 10,000 | 2,000,000 | 50GB | 10,000 req/min | Dedicated |
| **Enterprise** | Custom | Unlimited | Unlimited | Unlimited | Custom | Custom | Custom | 24/7 SLA |

### 3.2 Feature Flag Schema

| Attribute | Specification |
|:----------|:-------------|
| **Table** | `tenant_config.feature_flags` |
| **Fields** | `flag_id`, `tenant_id`, `flag_key` (string), `flag_value` (JSONB), `enabled` (boolean), `override_source` (plan_default, admin_override, experiment), `created_at`, `updated_at` |
| **Resolution Order** | Experiment assignment → Admin override → Plan default → Platform default |

### 3.3 Feature Flags Catalog

| Flag Key | Type | Description | Free | Starter | Pro | Business | Enterprise |
|:---------|:-----|:-----------|:----:|:-------:|:---:|:--------:|:----------:|
| `ai.completions_enabled` | boolean | Access to AI completions API | ❌ | ✅ | ✅ | ✅ | ✅ |
| `ai.custom_models_enabled` | boolean | Upload/use custom models | ❌ | ❌ | ❌ | ✅ | ✅ |
| `discovery.neural_reranking` | boolean | Neural re-ranking in feeds | ❌ | ❌ | ✅ | ✅ | ✅ |
| `discovery.sponsored_listings` | boolean | Run promoted listing campaigns | ❌ | ❌ | ✅ | ✅ | ✅ |
| `analytics.advanced_funnels` | boolean | Custom funnel definitions | ❌ | ❌ | ✅ | ✅ | ✅ |
| `analytics.export_enabled` | boolean | Data export capabilities | ❌ | ❌ | ✅ | ✅ | ✅ |
| `branding.custom_domain` | boolean | Custom domain mapping | ❌ | ❌ | ❌ | ✅ | ✅ |
| `branding.white_label` | boolean | Remove platform branding | ❌ | ❌ | ❌ | ✅ | ✅ |
| `api.webhooks_enabled` | boolean | Webhook event delivery | ❌ | ✅ | ✅ | ✅ | ✅ |
| `api.graphql_enabled` | boolean | GraphQL API access | ❌ | ❌ | ✅ | ✅ | ✅ |
| `trust.priority_moderation` | boolean | Expedited content moderation | ❌ | ❌ | ❌ | ✅ | ✅ |
| `realtime.max_connections` | integer | Max concurrent WebSocket connections | 5 | 25 | 100 | 500 | Custom |

---

## 4. Quota System

### 4.1 Quota Types

| Quota Key | Unit | Enforcement Point | Overage Behavior |
|:----------|:-----|:-----------------|:-----------------|
| `listings.total` | count | Marketplace API (create listing) | Hard block with 403 |
| `members.total` | count | Tenant API (add member) | Hard block with 403 |
| `ai.tokens_monthly` | tokens | AI Gateway (pre-flight check) | Soft block (warning at 80%, hard at 100%) |
| `ai.requests_daily` | count | AI Gateway (rate limiter) | Hard block with 429 |
| `storage.vectors_mb` | megabytes | Vector Store (upsert) | Hard block with 413 |
| `storage.media_gb` | gigabytes | Media upload endpoint | Hard block with 413 |
| `api.requests_per_minute` | count | API Gateway (rate limiter) | Hard block with 429 |
| `realtime.connections` | count | WebSocket Gateway | Connection refused |
| `workspaces.total` | count | Tenant API (create workspace) | Hard block with 403 |

### 4.2 Quota Enforcement Pipeline

```
Request → API Gateway Rate Check → Service Quota Pre-Flight → Database Operation
    │              │                        │                        │
    │         [429 if rate        [403/413 if quota      [Usage meter
    │          exceeded]            exceeded]              increment]
    │                                                        │
    │                                                        ▼
    │                                                 Event Outbox
    │                                                 (usage recorded)
    │                                                        │
    └──────────────────────── Response ◄─────────────────────┘
```

### 4.3 Quota Monitoring

| Threshold | Action |
|:----------|:-------|
| 80% of any quota | `monetization.quota_warning` event published. Dashboard warning notification via WebSocket |
| 95% of any quota | `monetization.quota_critical` event published. Email notification to tenant owner |
| 100% of any quota | `monetization.quota_exceeded` event published. Resource blocked. Upgrade prompt displayed |

---

## 5. AI Ownership Model

### 5.1 AI Resource Allocation Per Tenant

| Resource | Allocation Strategy | Isolation Level |
|:---------|:-------------------|:---------------|
| **Inference Tokens** | Leaky-bucket per `tenant_id`, refilled monthly based on plan | Strict per-tenant metering |
| **Embedding Storage** | Quota in MB, tracked per tenant in `vector_store.embeddings` | RLS-enforced tenant isolation |
| **Model Access** | Plan-gated model availability (Free: base models only, Enterprise: all models + custom) | Feature flag check |
| **Prompt Cache** | Shared cache with tenant-namespaced keys. Cache hits benefit the tenant's token budget | Redis namespace isolation |
| **Priority Queue** | High-priority queue for Business/Enterprise, standard queue for others | Queue routing by plan tier |

### 5.2 AI Budget Tracking

| Metric | Tracking Location | Aggregation | Billing Impact |
|:-------|:-----------------|:------------|:--------------|
| Input tokens consumed | `ai_cache.token_usage_log` | Real-time per-request | Cost = Σ(input_tokens × rate_in) |
| Output tokens consumed | `ai_cache.token_usage_log` | Real-time per-request | Cost = Σ(output_tokens × rate_out) |
| Embedding operations | `ai_cache.token_usage_log` | Real-time per-request | Cost = Σ(vectors × rate_vec) |
| Cache hits | `ai_cache.token_usage_log` | Real-time per-request | No cost (savings tracked) |

---

## 6. Billing Ownership Model

### 6.1 Billing Hierarchy

```
Organization (Billing Entity)
├── Payment Method (Stripe Customer)
├── Subscription (Plan + Add-ons)
│   ├── Tenant A ── Usage Meter A
│   ├── Tenant B ── Usage Meter B
│   └── Tenant C ── Usage Meter C
├── Credit Balance (Prepaid tokens)
└── Invoice History
```

### 6.2 Billing Events Flow

```
Usage Event (any domain) → Event Mesh → Billing Service Consumer
    │
    ▼
Usage Meter Increment (per tenant, per resource type)
    │
    ▼ (End of billing period OR on-demand)
Invoice Generation
    │
    ├── Subscription base fee
    ├── Usage overage charges
    ├── Credit deductions
    └── Tax calculations
    │
    ▼
Stripe Invoice Creation → Payment Processing → Ledger Entry
```

---

## 7. Analytics Ownership Model

### 7.1 Per-Tenant Analytics Isolation

| Analytics Type | Storage | Isolation | Access |
|:-------------|:--------|:----------|:-------|
| **Operational Metrics** | ClickHouse (tenant-partitioned) | Tenant ID column filter | Tenant dashboard |
| **Clickstream Events** | ClickHouse (tenant-partitioned) | Tenant ID column filter | Tenant analytics |
| **AI Usage Analytics** | ClickHouse (tenant-partitioned) | Tenant ID column filter | Tenant billing dashboard |
| **Platform-wide Analytics** | ClickHouse (global aggregation) | No isolation (aggregated) | Super Admin only |
| **Discovery Analytics** | ClickHouse (tenant-partitioned) | Tenant ID column filter | Tenant + Super Admin |

### 7.2 Analytics Data Ownership Rules

| Rule | Specification |
|:-----|:-------------|
| Tenants can only see their own analytics data | Enforced by `tenant_id` filter in all ClickHouse queries |
| Super Admin can see all tenant data individually or aggregated | Separate admin query endpoints with no tenant filter |
| Analytics data deletion follows tenant deletion workflow | When a tenant is deprovisioned, analytics data is archived then purged after 30 days |
| Cross-tenant analytics are never exposed to non-admin roles | API-level authorization check before ClickHouse query execution |

---

## 8. Tenant Lifecycle

### 8.1 Provisioning Flow

```
1. Organization creation (or existing org lookup)
2. Plan selection and payment method capture
3. Tenant record creation (status: provisioning)
4. Database RLS context setup
5. Default workspace creation
6. Feature flags initialization from plan defaults
7. Quota meters initialization
8. Welcome notification via WebSocket
9. Status transition: provisioning → active
10. Event: tenant.provisioned
```

### 8.2 Suspension Flow

```
1. Trigger: Admin action OR payment failure OR trust violation
2. Status transition: active → suspended
3. API access: Read-only (no create/update/delete operations)
4. AI inference: Blocked
5. WebSocket: Disconnected after grace period (1 hour)
6. Listings: Hidden from public marketplace discovery
7. Event: tenant.suspended
8. Notification: Email to org_owner + tenant_owner
```

### 8.3 Deprovisioning Flow

```
1. Trigger: org_owner explicit request (confirmed via email)
2. 30-day grace period (status: deprovisioning)
3. Data export available during grace period
4. Status transition: active → deprovisioning
5. After grace period:
   a. Soft-delete all tenant-owned rows (set deleted_at)
   b. Archive analytics data to S3
   c. Revoke all API keys
   d. Remove custom domain mapping
   e. Delete vector embeddings
   f. Remove from billing (cancel Stripe subscription)
6. After 90 days: Hard-delete all tenant data
7. Event: tenant.deprovisioned
```
