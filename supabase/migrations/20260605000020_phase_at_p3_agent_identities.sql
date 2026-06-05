-- ============================================================
-- Phase AT.P3 — Agent Identity System
-- ============================================================
-- Creates the identity and RBAC model for agents.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.agent_roles
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.agent_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed some default roles
INSERT INTO agents.agent_roles (slug, description) VALUES
    ('system', 'Core system agents with elevated privileges'),
    ('tenant', 'Tenant-specific custom agents'),
    ('read_only', 'Agents that can only read data')
ON CONFLICT (slug) DO NOTHING;

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.agent_identities
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.agent_identities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id            UUID NOT NULL REFERENCES agents.agent_registry(id) ON DELETE CASCADE,
    role_id             UUID REFERENCES agents.agent_roles(id),
    api_key_hash        TEXT, -- Optional, if we issue API keys specifically for the agent
    scopes              TEXT[] NOT NULL DEFAULT '{}',
    last_authenticated  TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id)
);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS agent_identities_updated_at ON agents.agent_identities;
CREATE TRIGGER agent_identities_updated_at
    BEFORE UPDATE ON agents.agent_identities
    FOR EACH ROW EXECUTE FUNCTION agents.update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE agents.agent_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_identities ENABLE ROW LEVEL SECURITY;

-- Everyone can read roles
DROP POLICY IF EXISTS agent_roles_read ON agents.agent_roles;
CREATE POLICY agent_roles_read ON agents.agent_roles FOR SELECT USING (true);

-- Identities follow registry visibility
DROP POLICY IF EXISTS agent_identities_read ON agents.agent_identities;
CREATE POLICY agent_identities_read ON agents.agent_identities FOR SELECT USING (
    EXISTS (SELECT 1 FROM agents.agent_registry ar WHERE ar.id = agent_id AND (ar.company_id IS NULL OR ar.company_id = public.get_current_company_id()))
);

-- Admins can manage all identities
DROP POLICY IF EXISTS agent_identities_admin ON agents.agent_identities;
CREATE POLICY agent_identities_admin ON agents.agent_identities FOR ALL USING (public.is_platform_admin_user(auth.uid()));

-- Tenant can manage their own agents' identities
DROP POLICY IF EXISTS agent_identities_tenant_write ON agents.agent_identities;
CREATE POLICY agent_identities_tenant_write ON agents.agent_identities FOR ALL USING (
    EXISTS (SELECT 1 FROM agents.agent_registry ar WHERE ar.id = agent_id AND ar.company_id = public.get_current_company_id())
) WITH CHECK (
    EXISTS (SELECT 1 FROM agents.agent_registry ar WHERE ar.id = agent_id AND ar.company_id = public.get_current_company_id())
);
