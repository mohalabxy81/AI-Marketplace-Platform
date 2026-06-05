-- ============================================================
-- Phase AT.P6 — Agent Runtime
-- ============================================================
-- Capabilities: Task Execution, Workflow Execution, Scheduling, Retry
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.agent_tasks
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.agent_tasks (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents.agent_registry(id) ON DELETE CASCADE,
    session_id      UUID REFERENCES agents.agent_sessions(id) ON DELETE SET NULL,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'retrying', 'cancelled')),
    input_data      JSONB DEFAULT '{}',
    output_data     JSONB,
    error_message   TEXT,
    retry_count     INTEGER NOT NULL DEFAULT 0,
    max_retries     INTEGER NOT NULL DEFAULT 3,
    started_at      TIMESTAMPTZ,
    completed_at    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS agent_tasks_updated_at ON agents.agent_tasks;
CREATE TRIGGER agent_tasks_updated_at
    BEFORE UPDATE ON agents.agent_tasks
    FOR EACH ROW EXECUTE FUNCTION agents.update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.agent_workflows
-- A collection of tasks
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.agent_workflows (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    description     TEXT,
    agent_id        UUID NOT NULL REFERENCES agents.agent_registry(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
    steps           JSONB NOT NULL DEFAULT '[]', -- Ordered array of step definitions
    state           JSONB NOT NULL DEFAULT '{}', -- Current execution state
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS agent_workflows_updated_at ON agents.agent_workflows;
CREATE TRIGGER agent_workflows_updated_at
    BEFORE UPDATE ON agents.agent_workflows
    FOR EACH ROW EXECUTE FUNCTION agents.update_updated_at();

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.agent_schedules
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.agent_schedules (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents.agent_registry(id) ON DELETE CASCADE,
    cron_expression TEXT NOT NULL,
    task_payload    JSONB NOT NULL DEFAULT '{}',
    is_active       BOOLEAN NOT NULL DEFAULT true,
    last_run_at     TIMESTAMPTZ,
    next_run_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS
ALTER TABLE agents.agent_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_tasks_admin ON agents.agent_tasks FOR ALL USING (public.is_platform_admin_user(auth.uid()));
CREATE POLICY agent_workflows_admin ON agents.agent_workflows FOR ALL USING (public.is_platform_admin_user(auth.uid()));
CREATE POLICY agent_schedules_admin ON agents.agent_schedules FOR ALL USING (public.is_platform_admin_user(auth.uid()));
