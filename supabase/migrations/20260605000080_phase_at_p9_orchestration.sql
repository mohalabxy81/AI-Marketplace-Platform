-- ============================================================
-- Phase AT.P9 — Orchestration Layer
-- ============================================================
-- Creates the Multi-Agent Coordination Layer.
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.orchestrator_sessions
-- Represents a complex, multi-agent goal execution
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.orchestrator_sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    goal            TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'executing', 'completed', 'failed', 'paused')),
    context         JSONB DEFAULT '{}',
    created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS orchestrator_sessions_updated_at ON agents.orchestrator_sessions;
CREATE TRIGGER orchestrator_sessions_updated_at
    BEFORE UPDATE ON agents.orchestrator_sessions
    FOR EACH ROW EXECUTE FUNCTION agents.update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.task_planner
-- Breaks down the goal into individual tasks assigned to specific agents
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.task_planner (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES agents.orchestrator_sessions(id) ON DELETE CASCADE,
    parent_task_id  UUID REFERENCES agents.task_planner(id) ON DELETE CASCADE,
    agent_id        UUID REFERENCES agents.agent_registry(id) ON DELETE SET NULL, -- Null if not yet assigned
    instruction     TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'blocked')),
    dependencies    UUID[] DEFAULT '{}', -- Array of task IDs that must complete first
    assigned_task   UUID REFERENCES agents.agent_tasks(id) ON DELETE SET NULL, -- Link to actual runtime task
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS task_planner_updated_at ON agents.task_planner;
CREATE TRIGGER task_planner_updated_at
    BEFORE UPDATE ON agents.task_planner
    FOR EACH ROW EXECUTE FUNCTION agents.update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.goal_engine
-- Evaluates progress towards the high-level goal
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.goal_engine (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id      UUID NOT NULL REFERENCES agents.orchestrator_sessions(id) ON DELETE CASCADE,
    success_criteria TEXT[] NOT NULL DEFAULT '{}',
    evaluation_log   JSONB[] DEFAULT '{}',
    is_met          BOOLEAN NOT NULL DEFAULT false,
    evaluated_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.policy_engine
-- Rules and constraints for multi-agent coordination
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.policy_engine (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    policy_name     TEXT NOT NULL,
    description     TEXT,
    rules           JSONB NOT NULL DEFAULT '[]', -- E.g. {"condition": "cost > 10", "action": "pause"}
    enforcement     TEXT NOT NULL DEFAULT 'strict' CHECK (enforcement IN ('strict', 'audit', 'disabled')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS policy_engine_updated_at ON agents.policy_engine;
CREATE TRIGGER policy_engine_updated_at
    BEFORE UPDATE ON agents.policy_engine
    FOR EACH ROW EXECUTE FUNCTION agents.update_updated_at();

-- RLS
ALTER TABLE agents.orchestrator_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.task_planner ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.goal_engine ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.policy_engine ENABLE ROW LEVEL SECURITY;

CREATE POLICY orchestrator_sessions_admin ON agents.orchestrator_sessions FOR ALL USING (public.is_platform_admin_user(auth.uid()));
CREATE POLICY task_planner_admin ON agents.task_planner FOR ALL USING (public.is_platform_admin_user(auth.uid()));
CREATE POLICY goal_engine_admin ON agents.goal_engine FOR ALL USING (public.is_platform_admin_user(auth.uid()));
CREATE POLICY policy_engine_admin ON agents.policy_engine FOR ALL USING (public.is_platform_admin_user(auth.uid()));
