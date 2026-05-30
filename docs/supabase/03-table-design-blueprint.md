# 3. TABLE DESIGN BLUEPRINT

> **Status**: Approved
> **Target Audience**: Database Administrators, Backend Engineers
> **Document Class**: Official Backend Constitution
> **System Context**: AI-Native Multi-Tenant Marketplace Operating System

---

## 1. Core Schema Reference

This blueprint details the structural design of the core domains of the marketplace. All tables follow a strict convention:
- Primary Keys are `UUID DEFAULT gen_random_uuid()`.
- Standard timestamps: `created_at` and `updated_at` (managed by Postgres trigger).
- Every tenant-bound table MUST have a `tenant_id UUID NOT NULL` column.

---

## 2. Platform & Identity Schemas

### 2.1 `platform.tenants`
The master record for a marketplace instance.
```sql
CREATE TABLE platform.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,                -- e.g., 'acme-corp'
    name TEXT NOT NULL,
    domain TEXT UNIQUE,                       -- Custom domain mapping
    plan_tier TEXT DEFAULT 'starter',
    status TEXT DEFAULT 'active',             -- active, suspended, archived
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- Index: CREATE UNIQUE INDEX idx_tenants_slug ON platform.tenants(slug);
```

### 2.2 `identity.user_profiles`
Extends the immutable `auth.users` table with platform-specific data.
```sql
CREATE TABLE identity.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
    email TEXT NOT NULL,
    first_name TEXT,
    last_name TEXT,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, email)
);
```

### 2.3 `identity.tenant_members`
Maps users to tenants and defines their RBAC roles.
```sql
CREATE TABLE identity.tenant_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
    user_id UUID NOT NULL REFERENCES identity.user_profiles(id),
    role TEXT NOT NULL DEFAULT 'member',      -- owner, admin, member, viewer
    status TEXT NOT NULL DEFAULT 'active',    -- active, invited, suspended
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, user_id)
);
```

---

## 3. Marketplace Schema

### 3.1 `marketplace.categories`
Hierarchical taxonomy for listings.
```sql
CREATE TABLE marketplace.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
    parent_id UUID REFERENCES marketplace.categories(id),
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, slug)
);
```

### 3.2 `marketplace.listings`
The core transactional entity (e.g., an AI Agent, a physical product, a service).
```sql
CREATE TABLE marketplace.listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
    seller_id UUID NOT NULL REFERENCES identity.user_profiles(id),
    category_id UUID REFERENCES marketplace.categories(id),
    title TEXT NOT NULL,
    description TEXT,
    price DECIMAL(12,2),
    currency TEXT DEFAULT 'USD',
    pricing_model TEXT DEFAULT 'one_time',    -- one_time, subscription, usage
    status TEXT DEFAULT 'draft',              -- draft, active, archived, suspended
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
-- Index: CREATE INDEX idx_listings_tenant_status ON marketplace.listings(tenant_id, status);
```

---

## 4. AI & Vector Schemas

### 4.1 `ai.embeddings`
Stores vector representations of listings for semantic search.
```sql
CREATE TABLE ai.embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
    entity_type TEXT NOT NULL,                -- 'listing', 'user_preference'
    entity_id UUID NOT NULL,
    model_version TEXT NOT NULL,              -- e.g., 'text-embedding-3-small'
    embedding vector(1536) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, entity_type, entity_id, model_version)
);
-- Index: CREATE INDEX idx_embeddings_hnsw ON ai.embeddings USING hnsw (embedding vector_cosine_ops);
```

### 4.2 `ai.semantic_cache`
Reduces LLM API costs by caching identical/highly-similar inference requests.
```sql
CREATE TABLE ai.semantic_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
    prompt_hash TEXT NOT NULL,
    prompt_embedding vector(1536) NOT NULL,
    completion_text TEXT NOT NULL,
    hit_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
```

---

## 5. Monetization Schema

### 5.1 `monetization.ledger_events`
Immutable, event-sourced financial ledger.
```sql
CREATE TABLE monetization.ledger_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
    user_id UUID REFERENCES identity.user_profiles(id),
    event_type TEXT NOT NULL,                 -- 'token_usage', 'subscription_charge'
    amount DECIMAL(12,4) NOT NULL,            -- Positive = charge, Negative = credit
    currency TEXT DEFAULT 'USD',
    resource_id UUID,                         -- e.g., listing_id or invoice_id
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
-- Note: This table is partitioned by month in production.
```

---

## 6. Realtime & Outbox Schemas

### 6.1 `outbox.events`
Transactional outbox pattern implementation for the Event Mesh.
```sql
CREATE TABLE outbox.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
    event_type TEXT NOT NULL,                 -- 'listing_created'
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    payload JSONB NOT NULL,
    status TEXT DEFAULT 'pending',            -- pending, processing, processed, failed
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);
-- Index: CREATE INDEX idx_outbox_status ON outbox.events(status) WHERE status = 'pending';
```

---

## 7. Global Triggers

Every table with an `updated_at` column MUST have this trigger attached:
```sql
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied via:
-- CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON marketplace.listings FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```
