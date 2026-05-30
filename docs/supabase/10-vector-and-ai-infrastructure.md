# 10. VECTOR & AI INFRASTRUCTURE

> **Status**: Approved
> **Target Audience**: AI Engineers, Database Administrators
> **Document Class**: Official Backend Constitution
> **System Context**: AI-Native Multi-Tenant Marketplace Operating System

---

## 1. Vector Infrastructure (`pgvector`)

The platform relies on the `pgvector` extension for PostgreSQL to store, index, and query high-dimensional embeddings. Integrating vectors directly alongside relational data allows us to execute complex hybrid searches (Semantic Search + Relational Filtering + Row Level Security) in a single database round-trip.

### 1.1 Vector Dimensions
All text-based embeddings use **1536 dimensions** (optimized for OpenAI `text-embedding-3-small`). 

### 1.2 Table Structure (`ai.embeddings`)
```sql
CREATE TABLE ai.embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
    entity_type TEXT NOT NULL,         -- 'listing', 'user_preference', 'chat_history'
    entity_id UUID NOT NULL,           -- references marketplace.listings(id)
    model_version TEXT NOT NULL,       -- 'text-embedding-3-small-v1'
    embedding vector(1536) NOT NULL,
    chunk_index INT DEFAULT 0,         -- For documents split into multiple chunks
    content_hash TEXT NOT NULL,        -- Used to detect if re-embedding is necessary
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, entity_type, entity_id, chunk_index, model_version)
);
```

---

## 2. Indexing Strategy (HNSW)

Exact nearest neighbor search (K-NN) requires scanning every vector, which scales linearly and becomes unacceptably slow beyond 100,000 vectors. We utilize **HNSW (Hierarchical Navigable Small World)** indexing for Approximate Nearest Neighbor (ANN) search.

```sql
-- Create an HNSW index using cosine distance
CREATE INDEX idx_embeddings_hnsw 
ON ai.embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### 2.1 Index Tuning
- **`m` (Max connections per node)**: 16 (Standard balance of recall vs memory).
- **`ef_construction`**: 64 (Higher value = longer index build time, better recall).
- **`ef_search`**: Set dynamically via `SET hnsw.ef_search = 40;` before executing a search query to prioritize speed or recall depending on the specific product feature.

---

## 3. The Hybrid Search Implementation

Vector similarity search is rarely useful in isolation. Buyers usually want: "Find listings similar to 'Enterprise CRM' (Vector) that are under $50/mo (Relational) and are active (Relational)."

### 3.1 The Retrieval RPC Function
We define a Postgres Function (callable via PostgREST RPC) to execute this hybrid search.

```sql
CREATE OR REPLACE FUNCTION search_marketplace(
  query_embedding vector(1536),
  match_threshold float,
  match_count int,
  filter_category_id UUID DEFAULT NULL,
  filter_max_price DECIMAL DEFAULT NULL
)
RETURNS TABLE (
  listing_id UUID, 
  title TEXT, 
  price DECIMAL,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Dynamic tuning for this specific query
  SET LOCAL hnsw.ef_search = 40;

  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.price,
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM marketplace.listings l
  JOIN ai.embeddings e ON l.id = e.entity_id
  WHERE 
    l.status = 'active'
    -- 1. Tenant Isolation enforced automatically if RLS is enabled on both tables
    AND l.tenant_id = auth.jwt_tenant_id() 
    -- 2. Relational Filters
    AND (filter_category_id IS NULL OR l.category_id = filter_category_id)
    AND (filter_max_price IS NULL OR l.price <= filter_max_price)
    -- 3. Vector Threshold Filter
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  -- 4. Order by Cosine Distance
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

---

## 4. Semantic Caching

To drastically reduce API costs to OpenAI and reduce latency by ~90%, we implement a Semantic Cache layer in Supabase.

### 4.1 Cache Mechanism
When a user submits a prompt to an AI Agent:
1. Edge Function receives the prompt: "Write a python script to parse CSV".
2. Edge Function embeds the prompt locally or via API.
3. Edge Function queries `ai.semantic_cache` for any prompt embedding with a cosine distance > 0.98.
4. If a match is found (Cache Hit), return the `completion_text` immediately. (Latency: 20ms).
5. If no match (Cache Miss), call OpenAI, stream the response to the user, and asynchronously save the new prompt embedding and completion text to the cache. (Latency: ~2000ms).

---

## 5. Model Management and Prompts

System prompts are not stored in the frontend codebase. They are stored in `ai.system_prompts`.

```sql
CREATE TABLE ai.system_prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
    agent_type TEXT NOT NULL,         -- 'support_bot', 'sales_bot'
    prompt_text TEXT NOT NULL,
    model_config JSONB DEFAULT '{"temperature": 0.7, "max_tokens": 500}'::jsonb,
    version INT NOT NULL,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, agent_type, version)
);
```

This allows tenant admins to customize the behavior of AI agents within their specific marketplace without altering the core platform code.
