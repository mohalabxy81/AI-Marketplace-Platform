-- ============================================================
-- Phase AT.P7 — Agent Observability
-- ============================================================
-- Tracks latency, success rate, failures, cost, token usage
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.agent_logs
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.agent_logs (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id    UUID NOT NULL REFERENCES agents.agent_registry(id) ON DELETE CASCADE,
    session_id  UUID REFERENCES agents.agent_sessions(id) ON DELETE CASCADE,
    task_id     UUID REFERENCES agents.agent_tasks(id) ON DELETE CASCADE,
    level       TEXT NOT NULL DEFAULT 'info' CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
    message     TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_logs_agent_idx ON agents.agent_logs (agent_id, created_at DESC);

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.agent_metrics
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.agent_metrics (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents.agent_registry(id) ON DELETE CASCADE,
    metric_name     TEXT NOT NULL, -- E.g. 'latency_ms', 'tokens_used', 'cost_usd'
    metric_value    NUMERIC NOT NULL,
    dimensions      JSONB DEFAULT '{}',
    recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_metrics_name_idx ON agents.agent_metrics (agent_id, metric_name, recorded_at DESC);

-- ─────────────────────────────────────────────────────────────
-- TABLE: agents.agent_failures
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents.agent_failures (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id        UUID NOT NULL REFERENCES agents.agent_registry(id) ON DELETE CASCADE,
    task_id         UUID REFERENCES agents.agent_tasks(id) ON DELETE CASCADE,
    error_code      TEXT,
    error_message   TEXT NOT NULL,
    stack_trace     TEXT,
    context         JSONB DEFAULT '{}',
    resolved        BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at     TIMESTAMPTZ
);

-- RLS
ALTER TABLE agents.agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents.agent_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY agent_logs_admin ON agents.agent_logs FOR ALL USING (public.is_platform_admin_user(auth.uid()));
CREATE POLICY agent_metrics_admin ON agents.agent_metrics FOR ALL USING (public.is_platform_admin_user(auth.uid()));
CREATE POLICY agent_failures_admin ON agents.agent_failures FOR ALL USING (public.is_platform_admin_user(auth.uid()));
