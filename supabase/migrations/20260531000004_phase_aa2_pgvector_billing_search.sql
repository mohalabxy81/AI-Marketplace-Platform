-- ============================================================
-- Phase AA.2 Migration — pgvector + AI Ops + Billing Schema
-- ============================================================
-- Spec Reference: Spec 22 (Database Evolution Master Design)
--                 Spec 31 (Backend Engineering Blueprint)
--                 PLANNER.md §7 — AI Operating Model
-- ============================================================

-- Enable pgvector extension for semantic search & embeddings
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- Enable pg_trgm for BM25 / full-text GIN indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Enable uuid-ossp for UUID generation helpers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ─────────────────────────────────────────────────────────────
-- SCHEMA: ai_ops (already created in AA.1 — extend it here)
-- ─────────────────────────────────────────────────────────────

-- AI Embeddings table — stores vectorized representations of listings
CREATE TABLE IF NOT EXISTS ai_ops.embeddings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type      TEXT NOT NULL CHECK (entity_type IN ('listing', 'user_profile', 'search_query', 'lead')),
    entity_id        UUID NOT NULL,
    tenant_id        UUID NOT NULL REFERENCES tenant_config.tenants(id) ON DELETE CASCADE,
    model_name       TEXT NOT NULL DEFAULT 'text-embedding-3-small',
    model_version    TEXT NOT NULL DEFAULT '1.0',
    dimensions       INTEGER NOT NULL DEFAULT 1536,
    embedding        extensions.vector(1536),
    metadata         JSONB NOT NULL DEFAULT '{}',
    is_current       BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- HNSW index for fast approximate nearest neighbour search (sub-50ms target)
-- Parameters per Spec 22: m=16, ef_construction=64
CREATE INDEX IF NOT EXISTS embeddings_hnsw_cosine_idx
    ON ai_ops.embeddings
    USING hnsw (embedding extensions.vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- Partial index: only active, current embeddings for listings
CREATE INDEX IF NOT EXISTS embeddings_listing_current_idx
    ON ai_ops.embeddings (entity_id, tenant_id)
    WHERE entity_type = 'listing' AND is_current = true;

-- Trigger for updated_at auto-update
CREATE TRIGGER ai_embeddings_updated_at
    BEFORE UPDATE ON ai_ops.embeddings
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- AI Prompt Registry — immutable versioned prompts (Spec 22 §7)
CREATE TABLE IF NOT EXISTS ai_ops.prompt_registry (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_key       TEXT NOT NULL,           -- e.g. 'listing.quality_check.v1'
    version          INTEGER NOT NULL DEFAULT 1,
    system_prompt    TEXT NOT NULL,
    user_template    TEXT,
    model_target     TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    max_tokens       INTEGER NOT NULL DEFAULT 1024,
    temperature      NUMERIC(3,2) NOT NULL DEFAULT 0.2,
    is_active        BOOLEAN NOT NULL DEFAULT true,
    created_by       UUID,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (prompt_key, version)
);

-- AI Inference Logs — already in AA.1 but extend with cost tracking
ALTER TABLE ai_ops.inference_logs
    ADD COLUMN IF NOT EXISTS cost_usd         NUMERIC(10,6),
    ADD COLUMN IF NOT EXISTS cached           BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS model_name       TEXT,
    ADD COLUMN IF NOT EXISTS prompt_tokens    INTEGER,
    ADD COLUMN IF NOT EXISTS completion_tokens INTEGER,
    ADD COLUMN IF NOT EXISTS latency_ms       INTEGER;

-- ─────────────────────────────────────────────────────────────
-- SCHEMA: billing (new — Monetization Infrastructure)
-- ─────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS billing;
COMMENT ON SCHEMA billing IS 'Monetization infrastructure: subscriptions, invoices, usage metering, quota enforcement';

-- Subscription Plans catalog
CREATE TABLE IF NOT EXISTS billing.plans (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_key         TEXT NOT NULL UNIQUE,    -- 'free', 'pro', 'business', 'enterprise'
    display_name     TEXT NOT NULL,
    stripe_price_id  TEXT,
    billing_interval TEXT NOT NULL DEFAULT 'monthly' CHECK (billing_interval IN ('monthly', 'yearly', 'usage')),
    price_usd        NUMERIC(10,2) NOT NULL DEFAULT 0,
    -- Quota limits
    max_listings     INTEGER NOT NULL DEFAULT 5,
    max_users        INTEGER NOT NULL DEFAULT 1,
    max_ai_tokens    BIGINT NOT NULL DEFAULT 10000,
    max_storage_gb   NUMERIC(6,2) NOT NULL DEFAULT 1,
    -- Feature flags
    features         JSONB NOT NULL DEFAULT '{}',
    is_active        BOOLEAN NOT NULL DEFAULT true,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default plans
INSERT INTO billing.plans (plan_key, display_name, price_usd, max_listings, max_users, max_ai_tokens, max_storage_gb, features) VALUES
  ('free',       'Free',       0,      5,    1,   10000,   1,    '{"ai_search": false, "recommendations": false, "analytics": "basic"}'),
  ('pro',        'Pro',        49,     50,   5,   100000,  10,   '{"ai_search": true,  "recommendations": false, "analytics": "standard"}'),
  ('business',   'Business',   149,    500,  25,  1000000, 50,   '{"ai_search": true,  "recommendations": true,  "analytics": "advanced"}'),
  ('enterprise', 'Enterprise', 499,    -1,   -1,  -1,      -1,   '{"ai_search": true,  "recommendations": true,  "analytics": "full",  "white_label": true}')
ON CONFLICT (plan_key) DO NOTHING;

-- Tenant Subscriptions
CREATE TABLE IF NOT EXISTS billing.subscriptions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id             UUID NOT NULL REFERENCES tenant_config.tenants(id) ON DELETE CASCADE,
    plan_id               UUID NOT NULL REFERENCES billing.plans(id),
    stripe_subscription_id TEXT UNIQUE,
    stripe_customer_id    TEXT,
    status                TEXT NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active', 'past_due', 'canceled', 'paused', 'trialing')),
    current_period_start  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    current_period_end    TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
    cancel_at_period_end  BOOLEAN NOT NULL DEFAULT false,
    trial_end             TIMESTAMPTZ,
    metadata              JSONB NOT NULL DEFAULT '{}',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id)    -- One active subscription per tenant
);

CREATE TRIGGER billing_subscriptions_updated_at
    BEFORE UPDATE ON billing.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Usage Tracking — metered billing events (write-only ledger pattern)
CREATE TABLE IF NOT EXISTS billing.usage_events (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenant_config.tenants(id) ON DELETE CASCADE,
    subscription_id  UUID REFERENCES billing.subscriptions(id),
    resource_type    TEXT NOT NULL CHECK (resource_type IN ('ai_tokens', 'storage_bytes', 'api_calls', 'listings', 'leads')),
    quantity         BIGINT NOT NULL DEFAULT 1,
    unit_cost_usd    NUMERIC(12,8) NOT NULL DEFAULT 0,
    total_cost_usd   NUMERIC(10,6) GENERATED ALWAYS AS (quantity * unit_cost_usd) STORED,
    reference_id     UUID,                -- Optional: link to inference_logs, listing, etc.
    metadata         JSONB NOT NULL DEFAULT '{}',
    recorded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (recorded_at);

-- Create monthly partitions for current and next 3 months
CREATE TABLE IF NOT EXISTS billing.usage_events_2026_05
    PARTITION OF billing.usage_events
    FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

CREATE TABLE IF NOT EXISTS billing.usage_events_2026_06
    PARTITION OF billing.usage_events
    FOR VALUES FROM ('2026-06-01') TO ('2026-07-01');

CREATE TABLE IF NOT EXISTS billing.usage_events_2026_07
    PARTITION OF billing.usage_events
    FOR VALUES FROM ('2026-07-01') TO ('2026-08-01');

CREATE TABLE IF NOT EXISTS billing.usage_events_2026_08
    PARTITION OF billing.usage_events
    FOR VALUES FROM ('2026-08-01') TO ('2026-09-01');

-- Quota Usage tracking (aggregated counters — reset per billing cycle)
CREATE TABLE IF NOT EXISTS billing.quota_usage (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        UUID NOT NULL REFERENCES tenant_config.tenants(id) ON DELETE CASCADE,
    resource_type    TEXT NOT NULL,
    current_usage    BIGINT NOT NULL DEFAULT 0,
    limit_amount     BIGINT NOT NULL DEFAULT 0,       -- Copied from plan at cycle start
    warning_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.80,   -- 80% triggers warning
    cycle_start      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cycle_end        TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
    last_updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, resource_type, cycle_start)
);

-- Indexes for billing performance
CREATE INDEX IF NOT EXISTS billing_subscriptions_tenant_idx ON billing.subscriptions (tenant_id);
CREATE INDEX IF NOT EXISTS billing_usage_events_tenant_idx ON billing.usage_events (tenant_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS billing_quota_tenant_resource_idx ON billing.quota_usage (tenant_id, resource_type);

-- ─────────────────────────────────────────────────────────────
-- SCHEMA: search (Discovery Engine read models)
-- ─────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS search;
COMMENT ON SCHEMA search IS 'Discovery engine: GIN full-text indexes, vector search read models, feed snapshots';

-- Listings search index — materialized read model for fast hybrid queries
CREATE TABLE IF NOT EXISTS search.listing_index (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id        UUID NOT NULL,                -- FK to marketplace.listings
    tenant_id         UUID NOT NULL,
    title             TEXT NOT NULL,
    description       TEXT,
    category          TEXT,
    price             NUMERIC(12,2),
    location_city     TEXT,
    location_country  TEXT,
    tags              TEXT[] DEFAULT '{}',
    status            TEXT NOT NULL DEFAULT 'active',
    quality_score     NUMERIC(4,3) DEFAULT 0.5,
    trust_score       NUMERIC(4,3) DEFAULT 1.0,
    -- Full-text search vector (auto-generated)
    fts_vector        TSVECTOR GENERATED ALWAYS AS (
        to_tsvector('english',
            COALESCE(title, '') || ' ' ||
            COALESCE(description, '') || ' ' ||
            COALESCE(category, '') || ' ' ||
            COALESCE(location_city, '')
        )
    ) STORED,
    indexed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- GIN index for full-text search (BM25-style)
CREATE INDEX IF NOT EXISTS listing_index_fts_gin_idx
    ON search.listing_index USING gin(fts_vector);

-- GIN index for tag array queries
CREATE INDEX IF NOT EXISTS listing_index_tags_gin_idx
    ON search.listing_index USING gin(tags);

-- Btree indexes for filter performance
CREATE INDEX IF NOT EXISTS listing_index_tenant_status_idx
    ON search.listing_index (tenant_id, status, quality_score DESC);

CREATE INDEX IF NOT EXISTS listing_index_category_idx
    ON search.listing_index (category, tenant_id)
    WHERE status = 'active';

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY — New tables
-- ─────────────────────────────────────────────────────────────

-- RLS: ai_ops.embeddings — tenants see only their embeddings
ALTER TABLE ai_ops.embeddings ENABLE ROW LEVEL SECURITY;
CREATE POLICY embeddings_tenant_isolation ON ai_ops.embeddings
    USING (tenant_id = public.tenant_id());

-- RLS: billing.subscriptions — tenants see only their subscription
ALTER TABLE billing.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_tenant_isolation ON billing.subscriptions
    USING (tenant_id = public.tenant_id());

-- RLS: billing.quota_usage — tenants see only their quota
ALTER TABLE billing.quota_usage ENABLE ROW LEVEL SECURITY;
CREATE POLICY quota_tenant_isolation ON billing.quota_usage
    USING (tenant_id = public.tenant_id());

-- RLS: search.listing_index — tenants see only their listings
ALTER TABLE search.listing_index ENABLE ROW LEVEL SECURITY;
CREATE POLICY listing_index_tenant_isolation ON search.listing_index
    USING (tenant_id = public.tenant_id());

-- ─────────────────────────────────────────────────────────────
-- FUNCTION: Hybrid Search (BM25 + Vector via RRF)
-- ─────────────────────────────────────────────────────────────
-- Spec Reference: Spec 36, Section 9 — Hybrid BM25 & Semantic Search
-- Formula: RRF(d) = 1/(rank_fts + 60) + 1/(rank_vec + 60)
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION search.hybrid_search(
    query_text   TEXT,
    query_vector extensions.vector(1536),
    tenant_val   UUID,
    result_limit INTEGER DEFAULT 25
)
RETURNS TABLE (
    listing_id      UUID,
    title           TEXT,
    rrf_score       DOUBLE PRECISION,
    fts_rank        INTEGER,
    vector_rank     INTEGER,
    quality_score   NUMERIC
)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
    WITH
    -- Stage 1: Full-text search candidates (BM25-style via GIN)
    fts_results AS (
        SELECT
            li.listing_id,
            li.title,
            li.quality_score,
            ROW_NUMBER() OVER (ORDER BY ts_rank_cd(li.fts_vector, plainto_tsquery('english', query_text)) DESC) AS fts_rank
        FROM search.listing_index li
        WHERE
            li.tenant_id = tenant_val
            AND li.status = 'active'
            AND li.fts_vector @@ plainto_tsquery('english', query_text)
        LIMIT 100
    ),
    -- Stage 2: Vector similarity candidates (cosine distance)
    vector_results AS (
        SELECT
            e.entity_id AS listing_id,
            ROW_NUMBER() OVER (ORDER BY e.embedding <=> query_vector ASC) AS vector_rank
        FROM ai_ops.embeddings e
        WHERE
            e.tenant_id = tenant_val
            AND e.entity_type = 'listing'
            AND e.is_current = true
        ORDER BY e.embedding <=> query_vector
        LIMIT 100
    ),
    -- Stage 3: Reciprocal Rank Fusion
    rrf_combined AS (
        SELECT
            COALESCE(f.listing_id, v.listing_id) AS listing_id,
            COALESCE(f.title, '') AS title,
            COALESCE(f.quality_score, 0.5) AS quality_score,
            COALESCE(f.fts_rank, 101) AS fts_rank,
            COALESCE(v.vector_rank, 101) AS vector_rank,
            (1.0 / (COALESCE(f.fts_rank, 101) + 60.0)) +
            (1.0 / (COALESCE(v.vector_rank, 101) + 60.0)) AS rrf_score
        FROM fts_results f
        FULL OUTER JOIN vector_results v ON f.listing_id = v.listing_id
    )
    SELECT
        listing_id,
        title,
        rrf_score,
        fts_rank,
        vector_rank,
        quality_score
    FROM rrf_combined
    ORDER BY rrf_score DESC
    LIMIT result_limit;
$$;
