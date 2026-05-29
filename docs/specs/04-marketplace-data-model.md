# SPEC 04 — MARKETPLACE DATA MODEL

> **Basis**: [PLANNER.md §2, §8](file:///home/mohal665544/pr1/PLANNER.md) — Marketplace Core & Discovery  
> **Status**: Execution-Ready

---

## 1. Listing Entity Specification

### 1.1 Core Listing Record

| Field | Type | Constraints | Purpose |
|:------|:-----|:-----------|:--------|
| `listing_id` | UUID v7 | PK, time-ordered | Unique listing identifier |
| `tenant_id` | UUID | FK → tenants, NOT NULL, RLS-enforced | Tenant ownership |
| `workspace_id` | UUID | FK → workspaces, NOT NULL | Workspace scoping |
| `category_id` | UUID | FK → categories, NOT NULL | Primary category |
| `property_type_id` | UUID | FK → property_types, NULLABLE | Property classification |
| `company_id` | UUID | FK → companies, NULLABLE | Publishing company |
| `created_by` | UUID | FK → users, NOT NULL | Author user |
| `title` | VARCHAR(200) | NOT NULL, indexed (trigram) | Display title |
| `slug` | VARCHAR(250) | UNIQUE per tenant | URL-safe identifier |
| `description` | TEXT | NOT NULL | Full description |
| `short_description` | VARCHAR(500) | NOT NULL | Feed/card preview text |
| `price` | DECIMAL(12,2) | >= 0, NULLABLE (free items) | Price in base currency |
| `currency` | CHAR(3) | DEFAULT 'USD' | ISO 4217 currency code |
| `pricing_model` | ENUM | one_time, subscription, usage_based, free, contact | Pricing structure |
| `status` | ENUM | draft, pending_review, active, paused, archived, deleted | Lifecycle status |
| `visibility` | ENUM | public, unlisted, private | Discovery visibility |
| `listing_type` | ENUM | ai_agent, tool, dataset, service, integration, template | Asset classification |
| `version` | INTEGER | DEFAULT 1, auto-increment on update | Current version number |
| `quality_score` | DECIMAL(3,2) | 0.00-1.00, computed | AI-computed quality score |
| `embedding_status` | ENUM | pending, processing, ready, failed, stale | Vector embedding state |
| `metadata` | JSONB | Flexible extension fields | Platform-specific metadata |
| `seo_metadata` | JSONB | title, description, keywords | SEO optimization fields |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, auto-update | Last modification |
| `published_at` | TIMESTAMPTZ | NULLABLE | First publication time |
| `deleted_at` | TIMESTAMPTZ | NULLABLE | Soft-delete timestamp |

### 1.2 Listing Lifecycle

```
draft ──────► pending_review ──────► active ──────► paused ──────► active
  │                │                   │                              │
  │                ▼                   │                              │
  │           [quarantined]            ▼                              │
  │                │              archived ──────────────────────► deleted
  │                ▼                                                   ▲
  └──────────── deleted ──────────────────────────────────────────────┘
```

| Transition | Trigger | Side Effects |
|:-----------|:--------|:-------------|
| draft → pending_review | Author submits listing | Event: `marketplace.listing_created`. Trust scan queued |
| pending_review → active | Trust scan passes | Event: `marketplace.listing_status_changed`. Embedding generation triggered. Listing appears in discovery |
| pending_review → quarantined | Trust scan fails | Event: `trust.content_quarantined`. Listing hidden. Escalation created |
| active → paused | Author pauses listing | Event: `marketplace.listing_status_changed`. Removed from discovery feeds |
| active → archived | Author archives | Event: `marketplace.listing_status_changed`. Retained for analytics but hidden |
| any → deleted | Author/Admin deletes | Event: `marketplace.listing_deleted`. Soft-delete (set `deleted_at`). Embeddings invalidated |

---

## 2. Category & Taxonomy Specification

### 2.1 Category Structure (Adjacency List)

| Field | Type | Purpose |
|:------|:-----|:--------|
| `category_id` | UUID v7 | PK |
| `parent_id` | UUID, NULLABLE | FK → categories (self-referential) |
| `name` | VARCHAR(100) | Display name |
| `slug` | VARCHAR(120) | URL-safe path segment |
| `description` | TEXT | Category description |
| `icon` | VARCHAR(50) | Icon identifier |
| `sort_order` | INTEGER | Display ordering |
| `depth` | INTEGER | Tree depth (0 = root) |
| `path` | TEXT | Materialized path (e.g., `/ai/agents/rag/`) |
| `listing_count` | INTEGER | Denormalized count (updated via event) |
| `is_active` | BOOLEAN | Visibility toggle |

### 2.2 Root Category Taxonomy

```
AI & Machine Learning
├── AI Agents
│   ├── RAG Agents
│   ├── Conversational Agents
│   ├── Autonomous Agents
│   └── Multi-Agent Systems
├── Models
│   ├── Language Models
│   ├── Vision Models
│   ├── Audio Models
│   └── Multimodal Models
└── Datasets
    ├── Training Datasets
    ├── Evaluation Benchmarks
    └── Pre-processed Datasets

Developer Tools
├── APIs & SDKs
├── IDE Extensions
├── CI/CD Tools
└── Testing Tools

Infrastructure
├── Deployment
├── Monitoring
├── Security
└── Data Pipelines

Integrations
├── CRM
├── ERP
├── Communication
└── Analytics

Templates & Workflows
├── Prompt Templates
├── Workflow Automations
└── Starter Kits
```

### 2.3 Category Attributes

| Field | Type | Purpose |
|:------|:-----|:--------|
| `attribute_id` | UUID v7 | PK |
| `category_id` | UUID | FK → categories |
| `name` | VARCHAR(100) | Attribute name |
| `attribute_type` | ENUM | text, number, select, multi_select, boolean, url |
| `options` | JSONB | Enumerated options for select/multi_select |
| `is_required` | BOOLEAN | Required for listings in this category |
| `is_filterable` | BOOLEAN | Available as search facet |
| `is_searchable` | BOOLEAN | Included in text search index |
| `sort_order` | INTEGER | Display order in forms |
| `validation_rules` | JSONB | Regex, min/max, etc. |

---

## 3. Media Specification

### 3.1 Listing Media

| Field | Type | Purpose |
|:------|:-----|:--------|
| `media_id` | UUID v7 | PK |
| `listing_id` | UUID | FK → listings |
| `tenant_id` | UUID | FK → tenants (denormalized for RLS) |
| `media_type` | ENUM | image, video, document, demo_recording |
| `storage_path` | TEXT | S3 object key |
| `cdn_url` | TEXT | CDN-served URL |
| `original_filename` | VARCHAR(255) | Uploaded filename |
| `mime_type` | VARCHAR(100) | MIME type |
| `file_size_bytes` | BIGINT | File size |
| `dimensions` | JSONB | width, height for images/video |
| `alt_text` | VARCHAR(500) | Accessibility text |
| `sort_order` | INTEGER | Display order |
| `processing_status` | ENUM | uploading, processing, ready, failed |
| `created_at` | TIMESTAMPTZ | Upload timestamp |

### 3.2 Media Processing Pipeline

```
Upload Request → Presigned S3 URL → Client Direct Upload → S3 Event
    │
    ▼
Processing Worker:
├── Image: Resize (thumbnail 200px, card 600px, full 1200px), WebP conversion, EXIF strip
├── Video: Thumbnail extraction, duration detection, format validation
├── Document: PDF preview generation, text extraction for search
└── Demo: Recording thumbnail, playback URL generation
    │
    ▼
CDN URL Generation → Media record update (status: ready)
```

---

## 4. Agent Entity Specification

### 4.1 AI Agent Record

| Field | Type | Purpose |
|:------|:-----|:--------|
| `agent_id` | UUID v7 | PK |
| `listing_id` | UUID | FK → listings (1:1, agent is a listing type) |
| `tenant_id` | UUID | RLS-enforced |
| `developer_id` | UUID | FK → developers |
| `agent_type` | ENUM | rag, conversational, autonomous, multi_agent, custom |
| `runtime` | ENUM | cloud_hosted, self_hosted, hybrid |
| `capabilities` | JSONB | Array of capability tags |
| `supported_models` | JSONB | Array of compatible model IDs |
| `api_schema` | JSONB | OpenAPI specification for the agent's API |
| `configuration_schema` | JSONB | JSON Schema for agent configuration |
| `health_status` | ENUM | healthy, degraded, offline, unknown |
| `last_health_check` | TIMESTAMPTZ | Last health probe timestamp |
| `avg_response_time_ms` | INTEGER | Rolling average response latency |
| `total_invocations` | BIGINT | Lifetime invocation count (denormalized) |
| `success_rate` | DECIMAL(5,4) | Rolling success rate |

### 4.2 Company Entity

| Field | Type | Purpose |
|:------|:-----|:--------|
| `company_id` | UUID v7 | PK |
| `tenant_id` | UUID | RLS-enforced |
| `name` | VARCHAR(200) | Company name |
| `slug` | VARCHAR(220) | URL-safe identifier |
| `description` | TEXT | Company description |
| `logo_url` | TEXT | Logo asset URL |
| `website_url` | TEXT | Company website |
| `contact_email` | VARCHAR(255) | Primary contact |
| `verification_status` | ENUM | unverified, pending, verified | Trust verification |
| `trust_score` | DECIMAL(3,2) | 0.00-1.00, from Trust domain |
| `total_listings` | INTEGER | Denormalized count |
| `created_at` | TIMESTAMPTZ | Registration time |

### 4.3 Developer Entity

| Field | Type | Purpose |
|:------|:-----|:--------|
| `developer_id` | UUID v7 | PK |
| `user_id` | UUID | FK → auth.users |
| `tenant_id` | UUID | RLS-enforced |
| `company_id` | UUID | FK → companies, NULLABLE |
| `display_name` | VARCHAR(100) | Public display name |
| `bio` | TEXT | Developer bio |
| `avatar_url` | TEXT | Avatar image |
| `github_url` | TEXT | GitHub profile |
| `specializations` | JSONB | Array of specialization tags |
| `total_agents` | INTEGER | Denormalized count |
| `avg_rating` | DECIMAL(3,2) | Aggregate rating |

### 4.4 Project Entity

| Field | Type | Purpose |
|:------|:-----|:--------|
| `project_id` | UUID v7 | PK |
| `tenant_id` | UUID | RLS-enforced |
| `company_id` | UUID | FK → companies |
| `name` | VARCHAR(200) | Project name |
| `description` | TEXT | Project description |
| `status` | ENUM | planning, active, completed, archived |
| `listing_ids` | UUID[] | Array of associated listing IDs |
| `created_at` | TIMESTAMPTZ | Creation time |

---

## 5. Listing Version Specification

### 5.1 Version Record

| Field | Type | Purpose |
|:------|:-----|:--------|
| `version_id` | UUID v7 | PK |
| `listing_id` | UUID | FK → listings |
| `tenant_id` | UUID | RLS-enforced |
| `version_number` | INTEGER | Sequential version |
| `snapshot` | JSONB | Complete listing state at this version |
| `change_summary` | TEXT | Human-readable change description |
| `changed_by` | UUID | FK → users |
| `created_at` | TIMESTAMPTZ | Version creation time |

### 5.2 Versioning Rules

| Rule | Specification |
|:-----|:-------------|
| Version creation trigger | Any update to title, description, price, attributes, or media |
| Snapshot contents | Full serialization of listing + attributes + media references |
| Max versions retained | 50 per listing (oldest auto-archived to S3) |
| Version comparison | API supports diff between any two versions |
| Rollback capability | Restore any previous version as a new version |

---

## 6. Signal Specifications

### 6.1 Listing Signals

| Signal Type | Source | Update Frequency | Storage |
|:-----------|:-------|:----------------|:--------|
| `view_count` | Clickstream | Real-time increment | Redis counter → ClickHouse (batch) |
| `click_through_rate` | Clickstream | Hourly aggregation | ClickHouse → search_candidates |
| `conversion_rate` | Transaction events | Daily aggregation | ClickHouse → search_candidates |
| `avg_time_on_page` | Clickstream | Hourly aggregation | ClickHouse |
| `bounce_rate` | Clickstream | Hourly aggregation | ClickHouse |
| `save_count` | User action | Real-time increment | Redis → PostgreSQL |
| `share_count` | User action | Real-time increment | Redis → PostgreSQL |
| `review_score` | Review submission | On-event | PostgreSQL |
| `review_count` | Review submission | On-event | PostgreSQL |
| `freshness_score` | System (age-based decay) | Daily recalculation | search_candidates |

### 6.2 Search Signals

| Signal Type | Purpose | Computation |
|:-----------|:--------|:-----------|
| `query_match_score` | Text relevance to search query | BM25 + trigram similarity |
| `vector_similarity` | Semantic relevance to query embedding | Cosine distance (pgvector <=> operator) |
| `category_relevance` | Category match strength | Binary (exact match) + path proximity |
| `attribute_match_count` | Number of filter criteria matched | Count of matching attribute values |
| `recency_score` | Freshness based on publish date | Exponential decay: e^(-λ × age_days), λ=0.01 |

### 6.3 Discovery Signals

| Signal Type | Purpose | Computation |
|:-----------|:--------|:-----------|
| `personalization_score` | Alignment with user preference vector | Cosine similarity (user_vector <=> listing_vector) |
| `collaborative_score` | Similar users liked this listing | Matrix factorization affinity |
| `trending_score` | Recent engagement velocity | Δ(interactions) / Δ(time) over 24h window |
| `diversity_score` | Category/attribute diversity within feed | Intra-list diversity calculation |
| `exploration_score` | Novelty for this user | 1.0 - max(previous_interaction_similarity) |

### 6.4 Ranking Signals

| Signal Type | Purpose | Weight (Default) |
|:-----------|:--------|:----------------|
| `vector_relevance` | Primary semantic match | 0.35 |
| `personalization_alignment` | User preference fit | 0.25 |
| `trust_score` | Tenant/listing trustworthiness | 0.15 |
| `engagement_velocity` | Recent interaction rate | 0.10 |
| `quality_score` | AI-assessed content quality | 0.10 |
| `sponsored_boost` | Paid promotion modifier | 0.05 (additive, not multiplicative) |

### 6.5 Trust Signals

| Signal Type | Source | Range | Impact |
|:-----------|:-------|:------|:-------|
| `tenant_trust_score` | Trust & Safety Domain | 0.20 - 1.00 | Multiplicative on ranking score |
| `listing_quality_flag` | Content moderation | pass, warning, fail | fail = quarantine; warning = penalty |
| `developer_reputation` | Review aggregation | 0.00 - 5.00 | Included in quality_score |
| `verification_status` | KYC/Company verification | unverified, pending, verified | verified = 1.1x boost |
| `fraud_risk_score` | Behavioral analysis | 0.00 - 1.00 | > 0.70 = quarantine trigger |

### 6.6 Engagement Signals

| Signal Type | Collection | Aggregation Window |
|:-----------|:-----------|:-------------------|
| `impressions` | Feed generation events | Rolling 7-day |
| `clicks` | Click events | Rolling 7-day |
| `detail_views` | Page view events | Rolling 7-day |
| `saves` | Save/bookmark events | All-time |
| `shares` | Share events | All-time |
| `inquiries` | Message/contact events | Rolling 30-day |
| `purchases` | Transaction events | All-time |
| `reviews` | Review submission events | All-time |

---

## 7. Query Patterns & Scaling Concerns

### 7.1 Critical Query Patterns

| Pattern | Tables Involved | Estimated Frequency | Latency Target |
|:--------|:---------------|:-------------------|:--------------|
| Feed generation (vector + filter) | embeddings, listings, search_candidates | 1,000/min peak | <50ms |
| Listing detail page | listings, listing_attributes, listing_media, reviews | 5,000/min peak | <100ms |
| Category browsing | listings, categories | 2,000/min peak | <100ms |
| Search with facets | listings, listing_attributes, categories | 3,000/min peak | <150ms |
| Listing creation (full) | listings, listing_attributes, listing_media, outbox | 100/min peak | <500ms |
| Tenant listing management | listings (tenant-scoped) | 500/min peak | <200ms |
| Review aggregation | reviews (per listing) | 1,000/min peak | <100ms |
| Agent health dashboard | agents | 100/min peak | <200ms |

### 7.2 Scaling Concerns

| Concern | Trigger Threshold | Mitigation |
|:--------|:-----------------|:-----------|
| Listing table size | >10M rows | Quarterly partitioning by `created_at` |
| Vector index rebuild time | >30 minutes | Background index builds, swap-in strategy |
| Media storage cost | >1TB | Lifecycle policies: infrequent access after 90 days, Glacier after 1 year |
| Review count per listing | >10,000 | Pagination + denormalized aggregation counters |
| Category tree depth | >5 levels | Materialized path for O(1) ancestry queries |
| Attribute value cardinality | >1,000 unique values per attribute | GIN index, consider separate facet index |
