-- ============================================================
-- Phase AT.P4 — Agent Memory
-- ============================================================
-- Creates tables for agent memory, context, sessions and knowledge.
-- Integrates with pgvector for semantic retrieval.
-- ============================================================

-- Ensure pgvector is available
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.agent_sessions
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.agent_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    UUID NOT NULL REFERENCES agents.agent_registry(id) ON DELETE CASCADE,
    company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Optional: if tied to a user session
    title       TEXT,
    status      TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'terminated')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS agent_sessions_updated_at ON agents.agent_sessions;
CREATE TRIGGER agent_sessions_updated_at
    BEFORE UPDATE ON agents.agent_sessions
    FOR EACH ROW EXECUTE FUNCTION agents.update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.agent_memory
-- Short-term conversation / interaction memory (usually tied to a session)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.agent_memory (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id  UUID NOT NULL REFERENCES agents.agent_sessions(id) ON DELETE CASCADE,
    role        TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'function')),
    content     TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}',
    embedding   extensions.vector(1536), -- Optional semantic index of this turn
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_memory_session_idx ON agents.agent_memory (session_id, created_at);

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.agent_knowledge
-- Long-term knowledge / semantic facts extracted by the agent
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.agent_knowledge (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    UUID NOT NULL REFERENCES agents.agent_registry(id) ON DELETE CASCADE,
    company_id  UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    fact        TEXT NOT NULL,
    embedding   extensions.vector(1536) NOT NULL,
    metadata    JSONB DEFAULT '{}',
    source_ref  TEXT, -- E.g. session ID or document ID
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS agent_knowledge_updated_at ON agents.agent_knowledge;
CREATE TRIGGER agent_knowledge_updated_at
    BEFORE UPDATE ON agents.agent_knowledge
    FOR EACH ROW EXECUTE FUNCTION agents.update_updated_at();

-- Vector Index for similarity search
CREATE INDEX IF NOT EXISTS agent_knowledge_embedding_idx ON agents.agent_knowledge
    USING hnsw (embedding extensions.vector_cosine_ops);

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.agent_context
-- Ephemeral contextual data for an agent's current task
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.agent_context (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    UUID NOT NULL REFERENCES agents.agent_registry(id) ON DELETE CASCADE,
    session_id  UUID REFERENCES agents.agent_sessions(id) ON DELETE CASCADE,
    key         TEXT NOT NULL,
    value       JSONB NOT NULL,
    expires_at  TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (agent_id, session_id, key)
);

-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE agents.agent_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_context ENABLE ROW LEVEL SECURITY;

-- Admins
CREATE POLICY agent_sessions_admin ON agents.agent_sessions FOR ALL USING (public.is_platform_admin_user(auth.uid()));
CREATE POLICY agent_memory_admin ON agents.agent_memory FOR ALL USING (public.is_platform_admin_user(auth.uid()));
CREATE POLICY agent_knowledge_admin ON agents.agent_knowledge FOR ALL USING (public.is_platform_admin_user(auth.uid()));
CREATE POLICY agent_context_admin ON agents.agent_context FOR ALL USING (public.is_platform_admin_user(auth.uid()));

-- Tenant visibility
CREATE POLICY agent_sessions_tenant ON agents.agent_sessions FOR ALL USING (
    company_id = public.get_current_company_id() OR
    (company_id IS NULL AND EXISTS (SELECT 1 FROM agents.agent_registry ar WHERE ar.id = agent_id AND ar.company_id = public.get_current_company_id()))
) WITH CHECK (
    company_id = public.get_current_company_id() OR
    (company_id IS NULL AND EXISTS (SELECT 1 FROM agents.agent_registry ar WHERE ar.id = agent_id AND ar.company_id = public.get_current_company_id()))
);

-- Memory follows session
CREATE POLICY agent_memory_tenant ON agents.agent_memory FOR ALL USING (
    EXISTS (SELECT 1 FROM agents.agent_sessions s WHERE s.id = session_id AND (s.company_id = public.get_current_company_id() OR (s.company_id IS NULL AND EXISTS (SELECT 1 FROM agents.agent_registry ar WHERE ar.id = s.agent_id AND ar.company_id = public.get_current_company_id()))))
);

-- Knowledge
CREATE POLICY agent_knowledge_tenant ON agents.agent_knowledge FOR ALL USING (
    company_id = public.get_current_company_id() OR
    (company_id IS NULL AND EXISTS (SELECT 1 FROM agents.agent_registry ar WHERE ar.id = agent_id AND ar.company_id = public.get_current_company_id()))
);

-- Context
CREATE POLICY agent_context_tenant ON agents.agent_context FOR ALL USING (
    EXISTS (SELECT 1 FROM agents.agent_registry ar WHERE ar.id = agent_id AND (ar.company_id = public.get_current_company_id() OR (ar.company_id IS NULL AND EXISTS (SELECT 1 FROM agents.agent_sessions s WHERE s.id = session_id AND s.company_id = public.get_current_company_id()))))
);
