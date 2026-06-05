-- ============================================================
-- Phase AT.P2 — Agent Registry
-- ============================================================
-- Creates the canonical registry for all agents on the platform.
-- Agents are first-class entities: they have identity, capabilities,
-- permissions, configuration and an audit trail.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- SCHEMA: agents (new — Agent Platform domain)
-- ─────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS agents;
COMMENT ON SCHEMA agents IS 'Agent Platform: registry, identity, memory, events, runtime and observability';

-- ─────────────────────────────────────────────────────────────
-- ENUM TYPES
-- ─────────────────────────────────────────────────────────────

DO $$ BEGIN
    CREATE TYPE agents.agent_type AS ENUM (
        'recommendation',   -- Surfaces relevant listings/content
        'trust',            -- Verifies companies and users
        'moderation',       -- Reviews and acts on content
        'fraud',            -- Detects and flags fraudulent activity
        'support',          -- Handles user support interactions
        'analytics',        -- Generates insights and reports
        'orchestrator',     -- Coordinates other agents
        'custom'            -- Tenant-defined agent
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
    CREATE TYPE agents.agent_status AS ENUM (
        'draft',        -- Registered but not yet active
        'active',       -- Fully operational
        'paused',       -- Temporarily suspended
        'deprecated',   -- No longer in use
        'error'         -- In an error state requiring attention
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.agent_registry
-- The single source of truth for all agents.
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.agent_registry (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Tenancy — NULL means a platform-level agent visible to all tenants
    tenant_id           UUID REFERENCES public.companies(id) ON DELETE CASCADE,

    -- Identity
    slug                TEXT NOT NULL,                          -- e.g. 'recommendation-v1', 'trust-agent'
    name                TEXT NOT NULL,                          -- Display name
    description         TEXT,

    -- Classification
    type                agents.agent_type NOT NULL DEFAULT 'custom',
    status              agents.agent_status NOT NULL DEFAULT 'draft',

    -- Capabilities: array of strings e.g. ['search', 'rank', 'explain']
    capabilities        TEXT[] NOT NULL DEFAULT '{}',

    -- Permissions: what DB operations / schemas the agent may access
    -- e.g. {"schemas": ["public"], "tables": ["listings", "trust_verifications"], "operations": ["SELECT", "INSERT"]}
    permissions         JSONB NOT NULL DEFAULT '{}',

    -- Runtime configuration: model, temperature, max_tokens, retry policy etc.
    configuration       JSONB NOT NULL DEFAULT '{}',

    -- Ownership — which auth user "owns" this agent (usually a service account or admin)
    owner_id            UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Version tracking
    version             INTEGER NOT NULL DEFAULT 1,

    -- Soft delete
    deleted_at          TIMESTAMPTZ,

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    UNIQUE (tenant_id, slug),
    CONSTRAINT agent_registry_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9\-]*[a-z0-9]$')
);

COMMENT ON TABLE agents.agent_registry IS 'Canonical registry of all agents. Platform agents have tenant_id = NULL.';
COMMENT ON COLUMN agents.agent_registry.slug IS 'URL-safe identifier unique per tenant, e.g. recommendation-v1';
COMMENT ON COLUMN agents.agent_registry.capabilities IS 'Array of capability strings the agent advertises';
COMMENT ON COLUMN agents.agent_registry.permissions IS 'JSON describing which schemas/tables/operations this agent may access';
COMMENT ON COLUMN agents.agent_registry.configuration IS 'Runtime config: model params, retry policy, rate limits, feature flags';

-- ─────────────────────────────────────────────────────────────
-- INDEXES
-- ─────────────────────────────────────────────────────────────

-- Tenant + status lookup (most common query pattern)
CREATE INDEX IF NOT EXISTS agent_registry_tenant_status_idx
    ON agents.agent_registry (tenant_id, status)
    WHERE deleted_at IS NULL;

-- Type-based lookup (e.g. "all active recommendation agents")
CREATE INDEX IF NOT EXISTS agent_registry_type_status_idx
    ON agents.agent_registry (type, status)
    WHERE deleted_at IS NULL;

-- Slug lookup within tenant
CREATE INDEX IF NOT EXISTS agent_registry_tenant_slug_idx
    ON agents.agent_registry (tenant_id, slug)
    WHERE deleted_at IS NULL;

-- GIN index on capabilities array for capability-based routing
CREATE INDEX IF NOT EXISTS agent_registry_capabilities_gin_idx
    ON agents.agent_registry USING gin(capabilities);

-- GIN index on configuration JSONB for config queries
CREATE INDEX IF NOT EXISTS agent_registry_configuration_gin_idx
    ON agents.agent_registry USING gin(configuration jsonb_path_ops);

-- ─────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION agents.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER agent_registry_updated_at
    BEFORE UPDATE ON agents.agent_registry
    FOR EACH ROW EXECUTE FUNCTION agents.update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- AUDIT LOGGING TRIGGER
-- Writes every INSERT/UPDATE/DELETE on agent_registry into
-- public.audit_logs for compliance and traceability.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION agents.audit_agent_registry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        old_values,
        new_values,
        created_at
    ) VALUES (
        TG_OP,
        'agents.agent_registry',
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN to_jsonb(NEW) ELSE NULL END,
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER agent_registry_audit
    AFTER INSERT OR UPDATE OR DELETE ON agents.agent_registry
    FOR EACH ROW EXECUTE FUNCTION agents.audit_agent_registry();

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────

ALTER TABLE agents.agent_registry ENABLE ROW LEVEL SECURITY;

-- Platform admins can see and manage ALL agents
CREATE POLICY agent_registry_platform_admin_all ON agents.agent_registry
    FOR ALL
    USING (public.is_platform_admin_user(auth.uid()))
    WITH CHECK (public.is_platform_admin_user(auth.uid()));

-- Tenants can read their own agents + platform agents (tenant_id IS NULL)
CREATE POLICY agent_registry_tenant_read ON agents.agent_registry
    FOR SELECT
    USING (
        deleted_at IS NULL
        AND (
            tenant_id IS NULL                                           -- platform agent
            OR tenant_id = public.get_current_company_id()             -- own tenant's agent
        )
    );

-- Tenants can insert/update/delete their own agents only
CREATE POLICY agent_registry_tenant_write ON agents.agent_registry
    FOR ALL
    USING (
        tenant_id = public.get_current_company_id()
        AND deleted_at IS NULL
    )
    WITH CHECK (
        tenant_id = public.get_current_company_id()
    );

-- ─────────────────────────────────────────────────────────────
-- HELPER FUNCTIONS
-- ─────────────────────────────────────────────────────────────

-- Resolve an agent by tenant + slug (used by runtime to look up agent config)
CREATE OR REPLACE FUNCTION agents.get_agent(
    p_tenant_id UUID,
    p_slug      TEXT
)
RETURNS agents.agent_registry
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT *
    FROM agents.agent_registry
    WHERE
        (tenant_id = p_tenant_id OR tenant_id IS NULL)
        AND slug = p_slug
        AND status = 'active'
        AND deleted_at IS NULL
    ORDER BY tenant_id NULLS LAST   -- prefer tenant-specific over platform agent
    LIMIT 1;
$$;

-- List all active agents for a tenant (includes platform agents)
CREATE OR REPLACE FUNCTION agents.list_active_agents(p_tenant_id UUID)
RETURNS SETOF agents.agent_registry
LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT *
    FROM agents.agent_registry
    WHERE
        (tenant_id = p_tenant_id OR tenant_id IS NULL)
        AND status = 'active'
        AND deleted_at IS NULL
    ORDER BY type, name;
$$;
