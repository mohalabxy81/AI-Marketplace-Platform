# SPEC 07 — VECTOR & EMBEDDING SPECIFICATION

> **Basis**: [PLANNER.md §6, §13](file:///home/mohal665544/pr1/PLANNER.md) — Platform Intelligence Model & Tenant Isolation
> **Status**: Execution-Ready v2 (Full Depth)
> **Version**: 2.0.0
> **Last Updated**: 2026-05-30

---

## 1. Vector Architecture Overview

The platform's competitive advantage in discovery and personalization is entirely dependent on the quality, freshness, and tenant-isolation of its vector infrastructure. This specification defines every dimension of the embedding lifecycle: types, storage, indexing, retrieval strategies, refresh scheduling, invalidation protocols, versioning governance, and scaling paths.

### 1.1 Embedding Type Registry

| Embedding Type | Entity | Dimensions | Model | Update Trigger | Use Case |
|:--------------|:-------|:----------|:------|:--------------|:---------|
| `listing_semantic` | Marketplace listing | 1536 | `text-embedding-3-small` | `marketplace.listing_created/updated` | Candidate retrieval (Stage 1) |
| `listing_image` | Listing media asset | 1024 | `clip-vit-large-patch14` | On media upload | Multi-modal search |
| `user_preference` | User session | 1536 | Computed (EMA of clicked items) | Each user interaction | Personalization |
| `user_longterm` | User historical | 1536 | Batch recomputed | Daily slow loop | Cold start recovery |
| `query_semantic` | Search query | 1536 | `text-embedding-3-small` | Per search request | Query-candidate matching |
| `category_centroid` | Category taxonomy | 1536 | Average of listings in category | Daily batch | Category affinity scoring |
| `company_profile` | Company entity | 1536 | Company description text | `marketplace.company_updated` | Company similarity |
| `agent_capability` | AI agent | 1536 | Agent capability description | `marketplace.agent_registered/updated` | Agent discovery |
| `prompt_semantic` | AI prompt template | 1536 | Prompt template text | Prompt registry update | Semantic cache lookup |
| `trust_behavioral` | User behavioral pattern | 128 | Lightweight encoder | Batch: daily | Fraud detection clustering |
| `trend_signal` | Trending topic cluster | 1536 | Computed from trending searches | Hourly | Trend-aware retrieval |

---

## 2. Embedding Storage Architecture

### 2.1 Primary Storage: `vector_store.embeddings`

| Column | Type | Constraints | Description |
|:-------|:-----|:-----------|:------------|
| `embedding_id` | UUID | PRIMARY KEY | |
| `tenant_id` | UUID | NOT NULL | Tenant isolation key |
| `entity_type` | VARCHAR(50) | NOT NULL | From embedding type registry above |
| `entity_id` | UUID | NOT NULL | The entity's primary key |
| `embedding_model_version` | VARCHAR(100) | NOT NULL | e.g., `text-embedding-3-small@1.0` |
| `dimensions` | INTEGER | NOT NULL | Vector dimensionality |
| `embedding` | VECTOR(1536) | NOT NULL | pgvector column |
| `quality_score` | DECIMAL(5,4) | NULL | Self-assessed embedding quality (0–1) |
| `source_text_hash` | VARCHAR(64) | NOT NULL | SHA-256 of source content (for change detection) |
| `is_current` | BOOLEAN | NOT NULL DEFAULT true | Only one current embedding per entity_type+entity_id |
| `generated_at` | TIMESTAMPTZ | NOT NULL | When embedding was computed |
| `expires_at` | TIMESTAMPTZ | NULL | Scheduled refresh time |
| `metadata` | JSONB | NULL | Type-specific additional metadata |
| `created_at` | TIMESTAMPTZ | NOT NULL | |
| `updated_at` | TIMESTAMPTZ | NOT NULL | |

**Unique Constraint:** `(tenant_id, entity_type, entity_id, is_current = true)` — Only one active embedding per entity.

### 2.2 Embedding Version History: `vector_store.embedding_versions`

| Column | Type | Description |
|:-------|:-----|:------------|
| `version_id` | UUID | PRIMARY KEY |
| `embedding_id` | UUID | FK → embeddings.embedding_id |
| `tenant_id` | UUID | |
| `entity_type` | VARCHAR(50) | |
| `entity_id` | UUID | |
| `embedding_model_version` | VARCHAR(100) | |
| `embedding` | VECTOR(1536) | Historical embedding snapshot |
| `source_text_hash` | VARCHAR(64) | Source content hash at time of generation |
| `replaced_at` | TIMESTAMPTZ | When this version was superseded |
| `replacement_reason` | VARCHAR(50) | `CONTENT_UPDATE`, `MODEL_UPGRADE`, `MANUAL_REFRESH`, `SCHEDULED` |

**Retention:** 90 days. After 90 days, version history purged (current embedding always retained).

### 2.3 Vector Index Registry: `vector_store.vector_indexes`

| Column | Type | Description |
|:-------|:-----|:------------|
| `index_id` | UUID | PRIMARY KEY |
| `index_name` | VARCHAR(200) | |
| `entity_type` | VARCHAR(50) | Which embedding type this index serves |
| `model_version` | VARCHAR(100) | Embedding model this index is built on |
| `index_algorithm` | VARCHAR(20) | `HNSW`, `IVFFlat` |
| `m_parameter` | INTEGER | HNSW m parameter (default 16) |
| `ef_construction` | INTEGER | HNSW build quality (default 200) |
| `ef_search` | INTEGER | Query-time search quality (default 100) |
| `dimensions` | INTEGER | |
| `total_vectors` | BIGINT | Tracked by background counter |
| `build_status` | VARCHAR(20) | `BUILDING`, `ACTIVE`, `STALE`, `REBUILDING` |
| `last_built_at` | TIMESTAMPTZ | |
| `build_duration_ms` | INTEGER | |
| `coverage_pct` | DECIMAL(5,2) | Percentage of embeddings indexed (vs total) |

---

## 3. HNSW Index Configuration

### 3.1 Index Parameters by Use Case

| Index | m | ef_construction | ef_search | Rationale |
|:------|:--|:---------------|:---------|:---------|
| `listing_semantic` (main retrieval) | 16 | 200 | 100 | Balanced accuracy/speed for production retrieval |
| `listing_semantic` (high-accuracy) | 32 | 400 | 200 | Premium plan re-ranking improvement |
| `user_preference` (personalization) | 8 | 64 | 40 | Lightweight; user vectors updated frequently |
| `query_semantic` (not indexed) | N/A | N/A | N/A | Queries are not indexed; used as probe vectors |
| `prompt_semantic` (cache) | 8 | 64 | 50 | Small dataset; semantic cache lookup |
| `trust_behavioral` (128-dim) | 8 | 100 | 50 | Fraud clustering; smaller dimensions |

### 3.2 Index Build Strategy

**Online vs. Background Build:**
- New embeddings are written to the `embeddings` table immediately (available via exact sequential scan for small datasets).
- HNSW index is rebuilt asynchronously by a background worker on a schedule.
- During HNSW rebuild: queries continue using the previous index (zero-downtime rotation).

**Zero-Downtime Index Rotation:**
1. Background worker builds new HNSW index into a shadow index name (e.g., `idx_embeddings_listing_v2`).
2. After build completes, atomically rename: `idx_listing_v1` → `idx_listing_v1_retired`, `idx_listing_v2` → `idx_listing_v1`.
3. Drop retired index after 24 hours (allow any in-flight queries to complete).
4. Update `vector_indexes` table: set `build_status = 'ACTIVE'` for new, `'STALE'` for old.

**Rebuild Triggers:**
- Scheduled: daily at 03:00 UTC (low-traffic window).
- Event-driven: after 10,000 new embeddings inserted since last build (`coverage_pct` drops below 85%).
- Manual: Operator triggers via Admin API `POST /api/v1/admin/vector-indexes/{index_id}/rebuild`.
- Model upgrade: when active embedding model changes, ALL indexes must rebuild.

---

## 4. Embedding Generation Pipeline

### 4.1 Synchronous Path (Listing Creation)

```
[marketplace.listing_created event]
          │
          ▼
[Embedding Worker: consume Kafka topic]
          │
          ├─ 1. Fetch listing content via gRPC: MarketplaceService.GetListingContent(listing_id)
          │      Returns: { title, description, tags, category_name, attributes }
          │
          ├─ 2. Construct embedding source text:
          │      "{title}. {category_name}. {description}. Tags: {tags.join(', ')}"
          │
          ├─ 3. Hash source text: SHA-256(source_text)
          │
          ├─ 4. Check for existing embedding with same source_text_hash
          │      If hash matches → skip (idempotent)
          │
          ├─ 5. Call AI Gateway: AIGateway.Embed(source_text, model="text-embedding-3-small")
          │      Priority: LOW (background task)
          │
          ├─ 6. Upsert into vector_store.embeddings:
          │      - Set is_current = false on previous embedding
          │      - Insert new record with is_current = true
          │
          ├─ 7. Upsert into search_index.search_candidates:
          │      - Set embedding_status = 'READY'
          │
          └─ 8. Emit event: ai.embedding_generated
```

### 4.2 Batch Re-Embedding (Model Upgrade)

When the platform upgrades its embedding model, ALL existing embeddings become stale and must be regenerated.

**Process:**
1. Operator sets new model as active in `ai_cache.model_registry`.
2. Operator triggers batch job: `POST /api/v1/admin/embeddings/batch-regenerate?model={new_model}`.
3. Batch job creates `embedding_refresh_jobs` records for every entity with `embedding_model_version != new_model`.
4. Background workers process these jobs in LOW-priority queue batches of 100 at a time.
5. Progress tracked in `embedding_refresh_jobs` table.
6. On completion of all jobs: emit `intelligence.index_rebuilt` event.
7. HNSW index rebuild triggered automatically after batch completion.

**Estimated Processing Rates:**
- LOW priority queue: ~50 embeddings per second sustained.
- 500,000 listings: ~10,000 seconds (~3 hours) with full worker pool.

### 4.3 Embedding Refresh Jobs Table: `vector_store.embedding_refresh_jobs`

| Column | Type | Description |
|:-------|:-----|:------------|
| `job_id` | UUID | PRIMARY KEY |
| `tenant_id` | UUID | |
| `entity_type` | VARCHAR(50) | |
| `entity_id` | UUID | |
| `trigger_reason` | VARCHAR(50) | `MODEL_UPGRADE`, `CONTENT_UPDATE`, `SCHEDULED`, `MANUAL` |
| `old_model_version` | VARCHAR(100) | |
| `target_model_version` | VARCHAR(100) | |
| `status` | VARCHAR(20) | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED` |
| `attempts` | INTEGER | Default 0, max 3 |
| `last_error` | TEXT | NULL |
| `created_at` | TIMESTAMPTZ | |
| `completed_at` | TIMESTAMPTZ | NULL |

---

## 5. Tenant Isolation in Vector Space

### 5.1 Database-Level Isolation

Every vector retrieval query MUST include tenant_id filter:

```sql
-- CORRECT: Tenant-isolated vector search
SELECT
  e.entity_id,
  e.embedding <=> :query_vector AS distance
FROM vector_store.embeddings e
INNER JOIN search_index.search_candidates s ON s.listing_id = e.entity_id
WHERE
  e.entity_type = 'listing_semantic'
  AND e.tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  AND e.is_current = true
  AND s.status = 'active'
ORDER BY e.embedding <=> :query_vector
LIMIT 500;

-- INCORRECT: Cross-tenant query (MUST NEVER OCCUR)
SELECT entity_id FROM vector_store.embeddings
ORDER BY embedding <=> :query_vector LIMIT 500;
-- ↑ This would leak across tenant boundaries
```

**RLS Policy on `vector_store.embeddings`:**
```sql
ALTER TABLE vector_store.embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY embeddings_tenant_isolation ON vector_store.embeddings
  FOR ALL
  USING (
    tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  );

CREATE POLICY embeddings_admin_bypass ON vector_store.embeddings
  FOR SELECT
  USING (
    current_setting('app.current_user_role', true) = 'super_admin'
  );
```

### 5.2 Vector Space Partitioning Strategy

**Phase 1–4 (pgvector, shared instance):**
- All tenant embeddings coexist in the same physical table.
- Tenant isolation enforced via `WHERE tenant_id = ?` filter in every query.
- HNSW index is global but tenant filter applied post-ANN (pgvector supports pre-filter via `WHERE`).
- Risk: Tenant A's vectors could theoretically influence ANN graph navigation for Tenant B (HNSW graph is shared).
- Mitigation: Acceptable for MVP. HNSW WITH tenant_id pre-filter is supported in pgvector and limits graph traversal to tenant-owned vectors.

**Phase 5–7 (Dedicated Vector DB per Major Tenant):**
- Tenants on `enterprise` plan get dedicated namespace/collection in Milvus or Pinecone.
- Partitioned by `tenant_id` as collection prefix: `tenant_{tenant_id}_listings`.
- Strict physical separation: no cross-tenant ANN graph traversal possible.

### 5.3 Cache Key Namespacing

All embedding-related cache keys use tenant namespace:

| Cache Purpose | Key Pattern |
|:-------------|:-----------|
| User preference vector | `tenant:{tenant_id}:{user_id}:preference_vector` |
| Category centroid | `tenant:{tenant_id}:category:{category_id}:centroid` |
| Pre-computed query embedding | `discovery:query_embed:{sha256(normalized_query)}` (global, query text is not tenant-specific) |
| Trending cluster centroids | `tenant:{tenant_id}:trending:centroids` |
| Company profile embedding | `tenant:{tenant_id}:company:{company_id}:embedding` |

---

## 6. Embedding Lifecycle Management

### 6.1 Lifecycle States

```
[Content Created] → PENDING → IN_PROGRESS → CURRENT
                                    │              │
                              FAILED (retry)   SUPERSEDED (on update)
                                    │
                               PENDING (retry queue)
```

**State Definitions:**

| State | Meaning | Represented By |
|:------|:--------|:--------------|
| `PENDING` | Embedding requested but not yet generated | Row in `embedding_refresh_jobs` with status=PENDING |
| `IN_PROGRESS` | Worker currently generating embedding | `embedding_refresh_jobs.status = IN_PROGRESS` |
| `CURRENT` | Active embedding, used for retrieval | `embeddings.is_current = true` |
| `SUPERSEDED` | Previous version, kept in history | `embeddings.is_current = false` |
| `FAILED` | Generation failed after max retries | `embedding_refresh_jobs.status = FAILED`, alert emitted |

### 6.2 Embedding Invalidation Rules

| Trigger | Entity Types Invalidated | Invalidation Method |
|:--------|:------------------------|:-------------------|
| `marketplace.listing_updated` (content changed) | `listing_semantic`, `listing_image` | Check `source_text_hash`; if different → queue refresh |
| `marketplace.listing_deleted` | All listing embedding types | Set `is_current = false`, delete from search_candidates |
| Embedding model version upgrade | All entity types using old model | Batch refresh job for all |
| `marketplace.company_updated` | `company_profile` | Immediate refresh |
| Manual operator action | Any | Admin API: `POST /api/v1/admin/embeddings/{entity_id}/invalidate` |

**Hash-Based Change Detection:**
- Before queuing a refresh job, always compute `SHA-256(source_text)` and compare to stored `source_text_hash`.
- If hashes match: no content change → skip re-embedding (prevents wasteful re-computation on trivial updates).
- If hashes differ: queue refresh job.

### 6.3 Embedding Freshness Policy

| Entity Type | Max Freshness Age | Refresh Strategy |
|:-----------|:-----------------|:----------------|
| `listing_semantic` | Refreshed on content change | Event-driven |
| `user_preference` | 30 days (TTL in Redis) | Fast-loop continuous update |
| `user_longterm` | 7 days | Daily slow-loop batch |
| `category_centroid` | 24 hours | Daily batch recomputation |
| `company_profile` | Refreshed on profile change | Event-driven |
| `trend_signal` | 1 hour | Hourly batch job |
| `prompt_semantic` | Refreshed on prompt version change | Event-driven |

---

## 7. Vector Retrieval Specification

### 7.1 Hybrid Retrieval Strategy

Hybrid retrieval combines vector similarity search with relational keyword search for superior recall:

**BM25 + Vector Hybrid Formula:**
```
hybrid_score = (α × vector_score) + ((1 - α) × bm25_score)
```
Where:
- `vector_score = 1.0 - cosine_distance` (normalized to 0–1)
- `bm25_score` = normalized BM25 score from PostgreSQL full-text search (using `pg_trgm` trigram index on title/description)
- `α = 0.70` (70% semantic, 30% keyword; configurable per tenant via feature flag `discovery.hybrid_alpha`)

**When to use hybrid retrieval:**
- Query length > 3 tokens AND query contains specific entity names or technical terms.
- Query intent class = `NAVIGATIONAL`.
- Query contains non-alphanumeric characters (product codes, versions).

**When to use pure vector retrieval:**
- Query intent class = `BROWSE` (no query text).
- Query intent class = `INFORMATIONAL`.
- Query length ≤ 3 tokens (insufficient BM25 signal).

### 7.2 Retrieval Query Patterns

| Pattern | SQL Strategy | Use Case |
|:--------|:------------|:---------|
| Pure vector ANN | `ORDER BY embedding <=> :q LIMIT 500` | Homepage feed, browse |
| Filtered vector ANN | `WHERE category_id = :cat ORDER BY embedding <=> :q LIMIT 500` | Category-scoped search |
| Hybrid ANN + BM25 | Union of ANN results and full-text results, merged by hybrid score | Keyword-intent queries |
| Exact ID retrieval | `WHERE entity_id = :id` | Direct listing lookup, no vector needed |
| User-item similarity | `WHERE entity_type='user_preference' ORDER BY embedding <=> :user_vec LIMIT K` | Collaborative filtering |

### 7.3 Similarity Score Thresholds

| Application | Threshold | Rationale |
|:-----------|:---------|:---------|
| Feed candidate retrieval (Stage 1) | No threshold (return top 500 by distance) | Prefer recall over precision at this stage |
| Semantic cache lookup | cosine_similarity ≥ 0.96 | Near-identical prompts only |
| User-user collaborative filtering | cosine_similarity ≥ 0.70 | Reasonably similar taste |
| Category-listing assignment | cosine_similarity ≥ 0.60 | Broad category match |
| Duplicate listing detection | cosine_similarity ≥ 0.95 | Near-duplicate content |
| Fraud behavioral clustering | cosine_similarity ≥ 0.80 | Tight behavioral cluster |

---

## 8. User Preference Vector Architecture

### 8.1 Preference Vector Data Model

The user preference vector is the central state artifact for personalization. It is a 1536-dimensional float32 vector stored in Redis and backed by PostgreSQL.

**Redis Storage:**
- Key: `tenant:{tenant_id}:{user_id}:preference_vector`
- Type: Binary (serialized float32 array)
- TTL: 30 days (refreshed on each update)
- Size: 1536 × 4 bytes = 6,144 bytes per user

**PostgreSQL Backup:**
- Table: `vector_store.embeddings` where `entity_type = 'user_preference'`
- Updated: daily slow-loop batch (Redis is source of truth for real-time)
- Serves as recovery source if Redis evicts due to memory pressure

### 8.2 EMA Update Algorithm

**On user interaction (Fast Loop):**

Interaction weight table:

| Action | Weight w |
|:-------|:---------|
| Purchase / Trial Activation | 0.30 |
| Bookmark / Save | 0.20 |
| Long View (> 30 seconds) | 0.18 |
| Click | 0.15 |
| Short View (3–30 seconds) | 0.08 |
| Short View (< 3 seconds) | 0.05 (negative signal, slight decay) |

Update formula:
```
V_user_new = (1 - w) × V_user_prev + w × V_item_interacted

Normalize: V_user_new = V_user_new / ||V_user_new||
```

**Normalization:** Preference vector is always L2-normalized to unit length after each update. This ensures cosine similarity comparisons remain valid regardless of interaction history length.

### 8.3 Cold Start Strategy

**Tier 1 (0 interactions):** Use zero vector → triggers pure exploration feed (ε = 0.25).

**Tier 2 (1–5 interactions):** Use interaction-weighted average of interacted item embeddings, supplemented by collaborative filtering (K=3 nearest similar users).

**Tier 3 (5–20 interactions):** EMA update active. Still supplement with 20% collaborative signal.

**Tier 4 (>20 interactions):** Pure EMA preference vector, collaborative supplement disabled.

### 8.4 Session vs. Persistent Vectors

| Vector Type | Storage | Scope | Purpose |
|:-----------|:--------|:------|:--------|
| Session vector | In-memory (request context) | Single request | Exploration of new interests within a session |
| Real-time preference vector | Redis | User, 30-day TTL | Fast-loop updates, primary retrieval signal |
| Historical preference vector | PostgreSQL | User, indefinite | Slow-loop batch training, cold-start recovery |

**Session vector enrichment:** Within a single browsing session, track items viewed but not yet clicked. Blend 10% of in-session interest signal into the retrieval query for the current request only:
```
request_vector = (0.9 × realtime_preference_vector) + (0.1 × session_interaction_average)
```

---

## 9. Embedding Governance & Observability

### 9.1 Embedding Quality Scoring

Each embedding receives a `quality_score` (0–1) computed at generation time:

| Quality Dimension | Weight | Measurement |
|:-----------------|:-------|:-----------|
| Source text length | 0.30 | Normalized by model's optimal input length (>500 chars = 1.0, <50 chars = 0.3) |
| Source text richness | 0.30 | Vocabulary diversity score (unique tokens / total tokens) |
| Embedding variance | 0.40 | L2 norm of embedding (extremely small = poor quality, near-zero source text) |

Listings with `quality_score < 0.4`: flagged with `low_quality_embedding = true` in `search_candidates`. These receive a `0.9x` score multiplier in Stage 2 light ranking.

### 9.2 Vector Infrastructure Metrics

| Metric | Type | Description | Alert Threshold |
|:-------|:-----|:------------|:---------------|
| `vector_embedding_lag_seconds` | Gauge | Time since listing creation to embedding ready | Alert if > 300s (5 min) |
| `vector_index_coverage_pct` | Gauge | % of embeddings in active HNSW index | Alert if < 80% |
| `vector_retrieval_latency_ms` | Histogram | Stage 1 query execution time | Alert P99 > 20ms |
| `vector_index_build_duration_ms` | Gauge | Time to rebuild HNSW index | Track for capacity planning |
| `vector_embedding_error_rate` | Counter | Failed embedding generation attempts | Alert if > 0.1% |
| `vector_refresh_backlog_count` | Gauge | Pending jobs in embedding_refresh_jobs | Alert if > 10,000 |
| `vector_tenant_isolation_violations` | Counter | Queries executed without tenant filter (should be 0) | Alert IMMEDIATELY if > 0 |

### 9.3 Embedding Audit Trail

All embedding operations are logged to `governance.audit_logs` with:
- `entity_type = 'embedding'`
- `action = 'GENERATED' | 'INVALIDATED' | 'SUPERSEDED' | 'BATCH_REBUILT'`
- `metadata = { model_version, source_text_hash, quality_score, trigger_reason }`

---

## 10. Vector Retrieval API Contracts

### 10.1 Similarity Search

```
POST /api/v1/vectors/search
Authorization: Bearer {jwt}

Request:
{
  query_embedding: float[] (1536 dimensions)
  entity_type: "listing_semantic" | "agent_capability" | "company_profile"
  filters: {
    category_id: UUID | null
    price_max: decimal | null
    status: "active" | null
  }
  limit: integer (default 25, max 500)
  include_scores: boolean (default false)
  min_similarity: float | null (0.0–1.0, optional threshold)
}

Response:
{
  results: [
    {
      entity_id: UUID
      entity_type: string
      similarity_score: float | null
      metadata: object
    }
  ]
  search_metadata: {
    total_searched: integer
    index_used: string
    latency_ms: integer
    tenant_id: UUID
  }
}
```

### 10.2 Upsert Embedding

```
POST /api/v1/vectors/embeddings
Authorization: Bearer {jwt} (service role required)

Request:
{
  entity_type: string
  entity_id: UUID
  embedding: float[]
  model_version: string
  source_text_hash: string
  quality_score: float | null
  metadata: object | null
}

Response:
{
  embedding_id: UUID
  is_new: boolean  // true if created, false if updated
  previous_version_archived: boolean
}
```

### 10.3 Internal gRPC Contracts

```
service VectorService {
  rpc SimilaritySearch (SimilaritySearchRequest) returns (SimilaritySearchResponse);
  rpc UpsertEmbedding (UpsertEmbeddingRequest) returns (UpsertEmbeddingResponse);
  rpc GetEmbedding (GetEmbeddingRequest) returns (GetEmbeddingResponse);
  rpc InvalidateEmbedding (InvalidateRequest) returns (InvalidateResponse);
  rpc BatchUpsertEmbeddings (stream UpsertEmbeddingRequest) returns (BatchUpsertResponse);
  rpc GetIndexHealth (IndexHealthRequest) returns (IndexHealthResponse);
}

message SimilaritySearchRequest {
  string tenant_id = 1;
  string entity_type = 2;
  bytes query_embedding = 3;  // Serialized float32 array
  int32 limit = 4;
  float min_similarity = 5;
  map<string, string> filters = 6;
}
```

---

## 11. Vector Database Evolution Strategy

### 11.1 Phase 1–4: pgvector (Shared Cluster)

- Single PostgreSQL instance with `pgvector` extension.
- Tenant isolation via `WHERE tenant_id = ?` and RLS policies.
- HNSW index on `vector_store.embeddings`.
- Suitable up to ~5M embeddings with acceptable performance.

### 11.2 Phase 5–6: pgvector (Dedicated Instance)

**Trigger:** When Stage 1 vector retrieval P99 latency exceeds 20ms, or pgvector CPU/IOPS > 40% of database capacity.

- Extract `vector_store` schema to dedicated PostgreSQL + pgvector instance.
- Application layer routes vector queries to dedicated endpoint.
- All other domain schemas remain on primary cluster.
- Dedicated connection pool for vector queries.

### 11.3 Phase 7–9: Milvus or Pinecone (External Vector DB)

**Trigger:** When dedicated pgvector instance hits limits (>50M vectors, or rebuild time > 6 hours).

**Milvus Self-Hosted:**
- Per-tenant collections: `tenant_{tenant_id}_{entity_type}`.
- Partition key: `tenant_id` (Milvus partition isolation).
- HNSW index per collection.
- Kafka Sink Connector to stream new embeddings from PostgreSQL outbox.

**Pinecone (Managed):**
- Serverless or pod-based deployment.
- Namespace per tenant: `{tenant_id}_{entity_type}`.
- Metadata filtering for additional attribute filters.

**Migration Process:**
1. Deploy Milvus/Pinecone alongside pgvector (dual-write mode).
2. Migrate all existing embeddings in batch (background job, LOW priority).
3. Feature flag: `vector.backend = PGVECTOR | MILVUS | PINECONE`.
4. Enable dual-write for 14 days.
5. Validate query result parity (recall@100 > 99% match between backends).
6. Cutover reads to new backend.
7. Disable pgvector writes after 7-day stability window.
