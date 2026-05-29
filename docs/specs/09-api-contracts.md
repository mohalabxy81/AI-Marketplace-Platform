# SPEC 09 — API CONTRACT SPECIFICATION

> **Basis**: [PLANNER.md §2–3](file:///home/mohal665544/pr1/PLANNER.md) — Master Domain Architecture
> **Status**: Execution-Ready v2 (Full Depth)
> **Version**: 2.0.0
> **Last Updated**: 2026-05-30

---

## 1. API Architecture Overview

### 1.1 API Surface Classification

| API Tier | Audience | Auth Mechanism | Rate Limit Tier | Versioning |
|:---------|:---------|:--------------|:---------------|:----------|
| **Public APIs** | Anonymous browsers, SEO crawlers | None | 100 req/min per IP | `/api/v1/*` |
| **Tenant APIs** | Authenticated tenant users & services | JWT (tenant-scoped) | Per-plan quotas | `/api/v1/*` |
| **Admin APIs** | Super Admin operators | JWT (super_admin role) | 1,000 req/min | `/api/v1/admin/*` |
| **AI APIs** | Tenant services, agents | JWT + AI quota | Per-plan AI budgets | `/api/v1/ai/*` |
| **Marketplace APIs** | Tenant users | JWT | Per-plan | `/api/v1/*` |
| **Analytics APIs** | Tenant dashboard | JWT | 60 req/min | `/api/v1/analytics/*` |
| **Internal APIs** | Inter-service (gRPC) | mTLS + service tokens | No external limits | gRPC |
| **Realtime APIs** | WebSocket clients | JWT (on connection) | Per-plan connections | `wss://` |
| **Webhook APIs** | External providers (Stripe) | HMAC signatures | N/A (provider-push) | `/api/webhooks/*` |

### 1.2 API Gateway Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                         API GATEWAY / EDGE                         │
│                                                                    │
│  Request Pipeline:                                                 │
│  1. TLS Termination                                               │
│  2. Rate Limiting (per IP, per tenant)                            │
│  3. JWT Authentication (if required)                               │
│  4. Tenant Context Injection (x-tenant-id header)                 │
│  5. Request Validation (schema validation)                         │
│  6. Trace Context Injection (x-correlation-id header)             │
│  7. Route to Domain Service                                        │
│  8. Response Transformation                                        │
│  9. Observability Logging                                          │
└────────────────────────────────────────────────────────────────────┘
```

### 1.3 Universal Request/Response Standards

**Required Request Headers:**
```
Authorization: Bearer {jwt_token}         (required for authenticated endpoints)
Content-Type: application/json
Accept: application/json
X-Request-ID: {uuid}                      (client-generated; used as correlation_id if no trace ID)
X-Idempotency-Key: {uuid}                 (required for POST/PATCH/DELETE mutations)
```

**Universal Response Headers:**
```
X-Correlation-ID: {trace_id}
X-Request-ID: {original_request_id}
X-Rate-Limit-Limit: {limit}
X-Rate-Limit-Remaining: {remaining}
X-Rate-Limit-Reset: {unix_timestamp}
X-Tenant-ID: {tenant_id}
Content-Type: application/json
```

**Standard Error Response:**
```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested listing was not found.",
    "details": {},
    "request_id": "uuid",
    "documentation_url": "https://docs.platform.io/errors/RESOURCE_NOT_FOUND"
  }
}
```

**Standard Error Codes:**

| HTTP Status | Error Code | Meaning |
|:-----------|:----------|:--------|
| 400 | `VALIDATION_ERROR` | Request body fails schema validation |
| 400 | `INVALID_PARAMETER` | Query parameter value is invalid |
| 401 | `UNAUTHORIZED` | Missing or invalid authentication |
| 403 | `FORBIDDEN` | Authenticated but insufficient permissions |
| 403 | `TENANT_SUSPENDED` | Tenant account is suspended |
| 404 | `RESOURCE_NOT_FOUND` | Requested resource does not exist |
| 409 | `CONFLICT` | Resource already exists or state conflict |
| 422 | `UNPROCESSABLE_ENTITY` | Semantically invalid request |
| 429 | `QUOTA_EXCEEDED` | Resource quota exhausted |
| 429 | `RATE_LIMITED` | Too many requests in time window |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
| 503 | `SERVICE_UNAVAILABLE` | Dependency unavailable |

---

## 2. Authentication API Contracts

### 2.1 User Registration

```
POST /api/v1/auth/register
Authentication: None (public)
Rate Limit: 10 req/min per IP

Request:
{
  email: string (valid email format)
  password: string (min 8 chars, must contain uppercase, number, special char)
  full_name: string (2–100 chars)
  organization_name: string | null (if creating new org)
  invitation_token: string | null (if joining existing tenant)
  referral_code: string | null
}

Response 201:
{
  user_id: UUID
  email: string
  tenant_id: UUID
  organization_id: UUID
  session: {
    access_token: string (JWT, 15-minute TTL)
    refresh_token: string (opaque, 30-day TTL)
    expires_at: ISO-8601 UTC
  }
  onboarding_step: "EMAIL_VERIFICATION"
}
```

### 2.2 Login

```
POST /api/v1/auth/login
Authentication: None (public)
Rate Limit: 10 req/min per IP, 5 failures → lockout 15min

Request:
{
  email: string
  password: string
  mfa_code: string | null (required if MFA enrolled)
  device_fingerprint: string | null (for trusted device tracking)
}

Response 200:
{
  user_id: UUID
  tenant_id: UUID
  session: {
    access_token: string
    refresh_token: string
    expires_at: ISO-8601 UTC
  }
  mfa_required: boolean (true if MFA enrolled but code not provided)
  mfa_challenge_token: string | null (short-lived, used to complete MFA step)
}
```

### 2.3 Token Refresh

```
POST /api/v1/auth/refresh
Authentication: None (public, uses refresh token)

Request:
{
  refresh_token: string
}

Response 200:
{
  access_token: string
  refresh_token: string (rotated)
  expires_at: ISO-8601 UTC
}
```

### 2.4 JWKS Endpoint

```
GET /.well-known/jwks.json
Authentication: None
Cache-Control: public, max-age=3600

Response 200:
{
  keys: [
    {
      kty: "RSA",
      use: "sig",
      n: "string",
      e: "AQAB",
      kid: "string",
      alg: "RS256"
    }
  ]
}
```

---

## 3. Tenant & Organization APIs

### 3.1 Create Organization

```
POST /api/v1/organizations
Authentication: JWT (any authenticated user)
Rate Limit: 5 req/hour per user

Request:
{
  name: string (3–200 chars)
  slug: string (3–50 chars, lowercase alphanumeric + hyphens)
  plan_tier: "starter" | "growth" | "premium" (default: "starter")
  billing_email: string
  country_code: string (ISO 3166-1 alpha-2)
}

Response 201:
{
  organization_id: UUID
  tenant_id: UUID
  workspace_id: UUID
  slug: string
  plan_tier: string
  provisioning_status: "PROVISIONING" | "ACTIVE"
  estimated_ready_seconds: integer
}
```

### 3.2 Get Tenant Configuration

```
GET /api/v1/tenants/{tenant_id}
Authentication: JWT (tenant member)

Response 200:
{
  tenant_id: UUID
  organization_id: UUID
  name: string
  slug: string
  status: "ACTIVE" | "SUSPENDED" | "PROVISIONING"
  plan: {
    tier: string
    limits: {
      monthly_ai_tokens: integer
      max_listings: integer
      max_seats: integer
      storage_gb: integer
    }
    current_usage: {
      ai_tokens_this_month: integer
      active_listings: integer
      seats_used: integer
      storage_used_gb: float
    }
  }
  feature_flags: { "flag_key": "value" }
  custom_domain: string | null
  created_at: ISO-8601 UTC
}
```

### 3.3 List Tenant Members

```
GET /api/v1/tenants/{tenant_id}/members
Authentication: JWT (tenant admin or above)
Query params: page, limit, role

Response 200:
{
  members: [
    {
      member_id: UUID
      user_id: UUID
      email: string
      full_name: string
      role: "owner" | "admin" | "editor" | "viewer" | "api_user"
      status: "ACTIVE" | "PENDING_INVITATION"
      joined_at: ISO-8601 UTC
      last_active_at: ISO-8601 UTC | null
    }
  ]
  pagination: { page, limit, total, total_pages }
}
```

### 3.4 Invite Member

```
POST /api/v1/tenants/{tenant_id}/members/invite
Authentication: JWT (tenant admin or owner)

Request:
{
  email: string
  role: "admin" | "editor" | "viewer" | "api_user"
  message: string | null (custom invitation message)
}

Response 200:
{
  invitation_id: UUID
  email: string
  role: string
  expires_at: ISO-8601 UTC
  invitation_url: string
}
```

---

## 4. Marketplace APIs

### 4.1 Create Listing

```
POST /api/v1/listings
Authentication: JWT (tenant member with editor+ role)
Idempotency-Key: required

Request:
{
  title: string (5–300 chars)
  description: string (50–10000 chars, markdown supported)
  price: decimal (0.00+)
  currency: string (ISO 4217, default "USD")
  price_model: "SUBSCRIPTION" | "ONE_TIME" | "FREEMIUM" | "USAGE_BASED" | "CONTACT"
  category_id: UUID
  company_id: UUID | null
  tags: string[] (max 10, each 2–50 chars)
  attributes: object (category-specific)
  media: [
    {
      type: "IMAGE" | "VIDEO" | "DOCUMENT"
      url: string (S3 CDN URL)
      alt_text: string | null
      is_primary: boolean
    }
  ]
  listing_type: "AGENT" | "TOOL" | "DATASET" | "SERVICE" | "TEMPLATE"
  external_url: string | null
  demo_url: string | null
  is_featured: boolean (subject to plan limits)
}

Response 201:
{
  listing_id: UUID
  status: "PENDING_REVIEW"
  estimated_review_time_hours: integer
  embedding_status: "PENDING"
  created_at: ISO-8601 UTC
}
```

### 4.2 Get Listing Detail

```
GET /api/v1/listings/{listing_id}
Authentication: JWT (optional; public fields returned if unauthenticated)

Response 200:
{
  listing_id: UUID
  title: string
  description: string
  price: decimal
  currency: string
  price_model: string
  category: { id: UUID, name: string, slug: string, breadcrumbs: [] }
  company: { id: UUID, name: string, verified: boolean, trust_score: float }
  tags: string[]
  attributes: object
  media: [{ type, url, alt_text, is_primary }]
  listing_type: string
  status: string
  rating: { average: float, count: integer }
  reviews_preview: [ { rating, comment_excerpt, reviewer_name_hash, created_at } ]
  version: integer
  created_at: ISO-8601 UTC
  updated_at: ISO-8601 UTC
  is_sponsored: boolean
  agent_details: {
    api_endpoint: string | null
    supported_models: string[]
    capability_description: string
    pricing_tiers: []
  } | null
}
```

### 4.3 Update Listing

```
PATCH /api/v1/listings/{listing_id}
Authentication: JWT (listing owner)
Idempotency-Key: required

Request (all fields optional):
{
  title: string | null
  description: string | null
  price: decimal | null
  category_id: UUID | null
  tags: string[] | null
  attributes: object | null
}

Response 200:
{
  listing_id: UUID
  updated_fields: string[]
  new_version: integer
  re_embedding_queued: boolean
  re_moderation_required: boolean
}
```

### 4.4 List Listings (Tenant Catalog)

```
GET /api/v1/listings
Authentication: JWT
Query params:
  status: DRAFT | PENDING_REVIEW | ACTIVE | ARCHIVED (default: ACTIVE)
  category_id: UUID
  page: integer (default 1)
  limit: integer (default 25, max 100)
  sort: CREATED_DESC | CREATED_ASC | PRICE_ASC | PRICE_DESC | RATING_DESC

Response 200:
{
  listings: [ { listing_id, title, status, price, category, rating, created_at } ]
  pagination: { page, limit, total, total_pages }
}
```

### 4.5 Category Tree

```
GET /api/v1/categories
Authentication: None (public)

Response 200:
{
  categories: [
    {
      id: UUID
      name: string
      slug: string
      parent_id: UUID | null
      icon_url: string | null
      listing_count: integer
      children: [ {...recursive} ]
    }
  ]
}
```

---

## 5. Discovery APIs

### 5.1 Personalized Feed

```
POST /api/v1/feed
Authentication: JWT
Rate Limit: 60 req/min per user

Request:
{
  context: {
    query: string | null
    filters: {
      category_id: UUID | null
      price_min: decimal | null
      price_max: decimal | null
      tags: string[] | null
    }
    limit: integer (default 25, max 50)
    offset: integer (default 0)
    device_type: "MOBILE" | "DESKTOP" | "TABLET"
    session_id: UUID
  }
  experiment_id: UUID | null
}

Response 200:
{
  feed_id: UUID
  items: [
    {
      listing_id: UUID
      title: string
      description: string
      price: decimal
      currency: string
      media_url: string
      category: { id, name, slug }
      company: { id, name, verified }
      rating: { average, count }
      score: float
      is_sponsored: boolean
      explanation_tags: string[]
      position: integer
    }
  ]
  metadata: {
    total_candidates_evaluated: integer
    feed_source: "LIVE" | "CACHED" | "FALLBACK"
    latency_ms: integer
    experiment_variant: string | null
    intent_class: string
  }
}
```

### 5.2 Search

```
GET /api/v1/search
Authentication: JWT
Rate Limit: 120 req/min per user

Query params:
  q: string (required, 1–500 chars)
  category: UUID
  price_min: decimal
  price_max: decimal
  tags: string (comma-separated)
  sort: RELEVANCE | PRICE_ASC | PRICE_DESC | RATING | RECENCY
  page: integer (default 1)
  limit: integer (default 25, max 100)

Response 200:
{
  search_id: UUID
  query: string
  results: [ {same structure as feed items} ]
  facets: {
    categories: [ { id, name, count } ]
    price_ranges: [ { label, min, max, count } ]
    tags: [ { tag, count } ]
  }
  pagination: { page, limit, total, total_pages }
  metadata: { latency_ms, intent_class }
}
```

### 5.3 Typeahead Suggestions

```
GET /api/v1/search/suggestions
Authentication: JWT
Rate Limit: 300 req/min per user (typeahead is high-frequency)

Query params:
  q: string (required, 1–100 chars)
  limit: integer (default 5, max 10)

Response 200:
{
  suggestions: [
    {
      type: "QUERY" | "LISTING" | "CATEGORY" | "COMPANY"
      text: string
      entity_id: UUID | null
      score: float
    }
  ]
  latency_ms: integer
}
```

### 5.4 Track Interaction (Clickstream)

```
POST /api/v1/interactions
Authentication: JWT
Rate Limit: 600 req/min per user

Request:
{
  session_id: UUID
  feed_id: UUID
  events: [
    {
      type: "CLICK" | "IMPRESSION" | "SAVE" | "SHARE"
      listing_id: UUID
      position: integer
      timestamp: ISO-8601 UTC
      duration_ms: integer | null (for IMPRESSION)
      viewport_percent: float | null (for IMPRESSION)
    }
  ]
}

Response 202:
{
  accepted: true
  events_queued: integer
}
```

---

## 6. AI APIs

### 6.1 Chat Completions (See also Spec 06)

```
POST /api/v1/ai/chat/completions
Authentication: JWT
Rate Limit: Per plan AI token budget

Request:
{
  model: string | null
  prompt_name: string | null
  prompt_variables: object | null
  messages: [ { role, content } ] | null
  temperature: float (0.0–2.0)
  max_tokens: integer
  priority: "high" | "low"
  bypass_cache: boolean
  response_format: "text" | "json_object" | "json_schema"
  json_schema: object | null
}

Response 200: (see Spec 06 §11.1)
```

### 6.2 Streaming Chat Completions

```
POST /api/v1/ai/chat/completions/stream
Authentication: JWT
Content-Type: text/event-stream (SSE)

Request: Same as 6.1

Response: Server-Sent Events stream
data: {"delta": {"content": "chunk of text"}}
data: {"delta": {"content": " more text"}}
data: [DONE]
```

### 6.3 Embedding Generation (See also Spec 06)

```
POST /api/v1/ai/embeddings
Authentication: JWT

Request/Response: (see Spec 06 §11.2)
```

---

## 7. Analytics APIs

### 7.1 Dashboard Overview

```
GET /api/v1/analytics/dashboard
Authentication: JWT
Rate Limit: 60 req/min

Query params:
  period: "7d" | "30d" | "90d" | "custom"
  start_date: ISO-8601 date (required if period=custom)
  end_date: ISO-8601 date (required if period=custom)

Response 200:
{
  period: { start, end }
  overview: {
    total_feed_generations: integer
    total_searches: integer
    total_clicks: integer
    click_through_rate: float
    total_conversions: integer
    conversion_rate: float
    ai_tokens_consumed: integer
    ai_spend_usd: decimal
    active_listings: integer
    average_listing_trust_score: float
  }
  time_series: {
    dates: ["ISO-8601 date"]
    feed_generations: [integer]
    searches: [integer]
    clicks: [integer]
    conversions: [integer]
  }
}
```

### 7.2 Listing Analytics

```
GET /api/v1/analytics/listings/{listing_id}
Authentication: JWT (listing owner)
Rate Limit: 30 req/min

Query params: period

Response 200:
{
  listing_id: UUID
  period: { start, end }
  impressions: integer
  clicks: integer
  ctr: float
  conversions: integer
  cvr: float
  average_position: float
  position_distribution: { "1-5": integer, "6-10": integer, "11-25": integer }
  revenue_attributed_usd: decimal | null
  discovery_sources: {
    "FEED": integer
    "SEARCH": integer
    "DIRECT": integer
  }
}
```

### 7.3 Funnel Analysis

```
GET /api/v1/analytics/funnels
Authentication: JWT
Rate Limit: 30 req/min

Query params:
  funnel_type: "DISCOVERY_TO_CONVERSION" | "REGISTRATION_TO_ACTIVATION" | "TRIAL_TO_PAID"
  period: string

Response 200:
{
  funnel_name: string
  stages: [
    {
      stage_name: string
      users_entered: integer
      users_completed: integer
      conversion_rate: float
      average_time_to_complete_seconds: float | null
    }
  ]
  overall_conversion_rate: float
}
```

### 7.4 AI Usage Analytics

```
GET /api/v1/analytics/ai-usage
Authentication: JWT
Rate Limit: 30 req/min

Query params: period

Response 200:
{
  period: { start, end }
  total_tokens_consumed: integer
  total_cost_usd: decimal
  cache_hit_rate: float
  by_model: [
    { model_id, tokens_consumed, requests_count, cache_hits, cost_usd }
  ]
  by_task_type: [
    { task_type, tokens_consumed, requests_count, cost_usd }
  ]
  budget_utilization_pct: float
  estimated_remaining_budget_usd: decimal
}
```

---

## 8. Admin APIs (Super Admin)

### 8.1 Platform Dashboard

```
GET /api/v1/admin/dashboard
Authentication: JWT (super_admin role)
Rate Limit: 120 req/min

Response 200:
{
  platform: {
    total_tenants: integer
    active_tenants: integer
    total_listings: integer
    active_listings: integer
    total_users: integer
    mrr_usd: decimal
    arr_usd: decimal
  }
  health: {
    api_p99_latency_ms: integer
    discovery_p99_latency_ms: integer
    ai_error_rate_pct: float
    db_connection_pool_utilization_pct: float
    kafka_consumer_lag_max: integer
  }
  alerts: [
    { severity, message, triggered_at, component }
  ]
}
```

### 8.2 List Tenants

```
GET /api/v1/admin/tenants
Authentication: JWT (super_admin)
Query params: status, plan, page, limit, search

Response 200:
{
  tenants: [
    {
      tenant_id: UUID
      organization_name: string
      slug: string
      plan_tier: string
      status: string
      member_count: integer
      listing_count: integer
      mrr_usd: decimal
      trust_score: float
      created_at: ISO-8601 UTC
    }
  ]
  pagination: { page, limit, total, total_pages }
}
```

### 8.3 Tenant Impersonation

```
POST /api/v1/admin/tenants/{tenant_id}/impersonate
Authentication: JWT (super_admin)
Audit: LOGGED (mandatory)

Request:
{
  reason: string (required, min 20 chars)
  duration_minutes: integer (max 60)
}

Response 200:
{
  impersonation_session_id: UUID
  impersonation_token: string (JWT scoped to tenant, limited permissions)
  expires_at: ISO-8601 UTC
  tenant: { tenant_id, name, plan }
}
```

### 8.4 Moderation Queue

```
GET /api/v1/admin/moderation/queue
Authentication: JWT (super_admin or trust_reviewer role)
Query params: status, priority, page, limit

Response 200:
{
  items: [
    {
      queue_id: UUID
      entity_type: "LISTING" | "USER" | "COMPANY"
      entity_id: UUID
      title: string
      risk_score: float
      violation_categories: string[]
      status: "PENDING" | "IN_REVIEW" | "APPROVED" | "REJECTED"
      priority: "URGENT" | "HIGH" | "NORMAL"
      submitted_at: ISO-8601 UTC
      reviewer_id: UUID | null
    }
  ]
  pagination: { page, limit, total, total_pages }
  stats: { pending, in_review, resolved_today }
}
```

### 8.5 Resolve Moderation Item

```
PATCH /api/v1/admin/moderation/{queue_id}/resolve
Authentication: JWT (super_admin or trust_reviewer)

Request:
{
  decision: "APPROVE" | "REJECT" | "ESCALATE"
  reason: string (required for REJECT)
  internal_notes: string | null
  notify_tenant: boolean (default true)
}

Response 200:
{
  queue_id: UUID
  decision: string
  entity_status_updated_to: string
  trust_score_impact: float | null
  notification_sent: boolean
}
```

### 8.6 System Configuration

```
GET /api/v1/admin/config
Authentication: JWT (super_admin)

Response 200:
{
  configs: [
    {
      key: string
      value: any
      description: string
      type: "STRING" | "INTEGER" | "BOOLEAN" | "JSON"
      is_sensitive: boolean
      last_updated_at: ISO-8601 UTC
      updated_by: string
    }
  ]
}

PATCH /api/v1/admin/config/{config_key}
Authentication: JWT (super_admin)

Request: { value: any, change_reason: string }
Response 200: { key, new_value, applied_at }
```

---

## 9. Billing APIs

### 9.1 Create Subscription

```
POST /api/v1/billing/subscribe
Authentication: JWT (tenant owner)
Idempotency-Key: required

Request:
{
  plan_tier: "starter" | "growth" | "premium" | "enterprise"
  billing_cycle: "MONTHLY" | "ANNUAL"
  payment_method_id: string (Stripe PaymentMethod ID)
  coupon_code: string | null
}

Response 200:
{
  subscription_id: UUID
  stripe_subscription_id: string
  plan_tier: string
  status: "ACTIVE" | "TRIALING"
  current_period_start: ISO-8601 date
  current_period_end: ISO-8601 date
  trial_end: ISO-8601 date | null
  amount_usd: decimal
  billing_cycle: string
}
```

### 9.2 Get Current Usage

```
GET /api/v1/billing/usage
Authentication: JWT (tenant member)

Response 200:
{
  billing_period: { start: ISO-8601 date, end: ISO-8601 date }
  plan_tier: string
  usage: {
    ai_tokens: { used, limit, pct_used }
    listings: { used, limit, pct_used }
    seats: { used, limit, pct_used }
    storage_gb: { used, limit, pct_used }
    api_calls: { used, limit, pct_used }
  }
  estimated_bill_usd: decimal
  credit_balance_usd: decimal
  next_bill_date: ISO-8601 date
}
```

### 9.3 Invoice History

```
GET /api/v1/billing/invoices
Authentication: JWT (tenant owner/admin)
Query params: page, limit, status

Response 200:
{
  invoices: [
    {
      invoice_id: UUID
      billing_period: string (YYYY-MM)
      status: "PAID" | "OPEN" | "VOID"
      total_usd: decimal
      line_items: [
        { description, quantity, unit_price, total }
      ]
      pdf_url: string
      created_at: ISO-8601 UTC
      paid_at: ISO-8601 UTC | null
    }
  ]
  pagination: { page, limit, total, total_pages }
}
```

### 9.4 Create Ad Campaign

```
POST /api/v1/ads/campaigns
Authentication: JWT (tenant member, editor+)

Request:
{
  name: string
  listing_ids: UUID[] (listings to promote)
  bid_type: "CPC" | "CPM"
  bid_amount: decimal (minimum $0.01)
  daily_budget_usd: decimal (minimum $1.00)
  total_budget_usd: decimal | null
  targeting: {
    keywords: string[] | null
    category_ids: UUID[] | null
  }
  start_date: ISO-8601 date
  end_date: ISO-8601 date | null
}

Response 201:
{
  campaign_id: UUID
  status: "ACTIVE" | "PENDING"
  estimated_daily_impressions: integer | null
}
```

---

## 10. Realtime (WebSocket) APIs

### 10.1 WebSocket Connection

```
wss://realtime.platform.internal/socket/websocket
?token={jwt_access_token}
&vsn=2.0.0

Handshake: HTTP Upgrade + JWT validation
Connection authenticated: tenant_id and user_id extracted from JWT
```

### 10.2 Channel Subscription Messages

```json
// Join feed channel
{
  "topic": "tenant_feed:{tenant_id}",
  "event": "phx_join",
  "payload": {},
  "ref": "unique-client-ref"
}

// Join moderation channel (admin only)
{
  "topic": "tenant_moderation:{tenant_id}",
  "event": "phx_join",
  "payload": {},
  "ref": "unique-client-ref"
}

// Join global platform announcements
{
  "topic": "platform:global",
  "event": "phx_join",
  "payload": {},
  "ref": "unique-client-ref"
}
```

### 10.3 Server Push Event Shapes

**Feed Update Push:**
```json
{
  "topic": "tenant_feed:{tenant_id}",
  "event": "feed_updated",
  "payload": {
    "feed_id": "UUID",
    "new_items": [ { "listing_id", "score", "position" } ],
    "reason": "RANKING_UPDATED | NEW_LISTINGS | PREFERENCE_UPDATED"
  }
}
```

**Quota Warning Push:**
```json
{
  "topic": "tenant_feed:{tenant_id}",
  "event": "quota_warning",
  "payload": {
    "resource": "INFERENCE_TOKENS",
    "pct_consumed": 85.3,
    "estimated_depletion_hours": 2.4
  }
}
```

**Moderation Alert Push (admin):**
```json
{
  "topic": "tenant_moderation:{tenant_id}",
  "event": "content_quarantined",
  "payload": {
    "listing_id": "UUID",
    "risk_score": 0.87,
    "reason": "TOXICITY"
  }
}
```

---

## 11. Webhook APIs

### 11.1 Stripe Webhook

```
POST /api/webhooks/stripe
Authentication: HMAC-SHA256 signature (Stripe-Signature header)

Events handled:
  customer.subscription.created → Activate tenant plan
  customer.subscription.updated → Update plan limits
  customer.subscription.deleted → Suspend tenant
  invoice.payment_succeeded → Mark invoice paid
  invoice.payment_failed → Trigger payment retry workflow
  payment_intent.succeeded → Update credit balance
  payment_method.updated → Update payment method record
```

### 11.2 Outbound Platform Webhooks (Tenant-Configured)

Tenants can register webhook endpoints to receive platform events:

```
POST /api/v1/webhooks
Authentication: JWT (tenant admin)

Request:
{
  url: string (HTTPS required)
  events: ["marketplace.listing_status_changed", "trust.trust_score_updated", ...]
  secret: string (tenant provides signing secret)
  is_active: boolean
}

Delivery:
POST {tenant_url}
Stripe-Signature: t={timestamp},v1={hmac_sha256}

Body: Standard event envelope (see Spec 08)
```

---

## 12. API Rate Limiting Specification

### 12.1 Rate Limit Tiers by Plan

| Endpoint Group | Starter | Growth | Premium | Enterprise |
|:--------------|:--------|:-------|:--------|:-----------|
| Feed/Search | 60 req/min | 300 req/min | 1,200 req/min | Custom |
| Listings CRUD | 30 req/min | 120 req/min | 600 req/min | Custom |
| AI Completions | 10 req/min | 60 req/min | 300 req/min | Custom |
| Analytics | 10 req/min | 30 req/min | 120 req/min | Custom |
| Admin APIs | N/A | N/A | N/A | 1,000 req/min |
| Clickstream | 600 req/min | 3,000 req/min | 12,000 req/min | Custom |

### 12.2 Rate Limit Algorithm

- **Algorithm:** Sliding window counter (Redis ZSET with score=timestamp).
- **Granularity:** Per `(tenant_id, endpoint_group)` pair.
- **Burst tolerance:** Allow 2x limit for up to 10 seconds.
- **Headers returned:** `X-Rate-Limit-Limit`, `X-Rate-Limit-Remaining`, `X-Rate-Limit-Reset`.
- **Response on exceed:** HTTP 429 with `Retry-After` header.

---

## 13. API Versioning & Deprecation Policy

### 13.1 Versioning Strategy

- URL-based versioning: `/api/v1/`, `/api/v2/`.
- Minor, backward-compatible changes: no version bump. New optional fields added silently.
- Breaking changes: new version. Both versions served concurrently for 6 months.

### 13.2 Deprecation Timeline

| Phase | Duration | Action |
|:------|:---------|:-------|
| Soft Deprecation | 3 months | `Deprecation` header added to responses |
| Hard Deprecation | Month 4-6 | HTTP 410 on deprecated endpoints |
| Sunset | Month 7 | Endpoint removed from API surface |

**Deprecation Response Header:**
```
Deprecation: version="v1", sunset="2026-12-01"
Link: <https://docs.platform.io/migration/v2>; rel="deprecation"
```
