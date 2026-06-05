-- =============================================================================
-- PHASE AV: WORKSTREAM K — AUTONOMOUS OPERATIONS
-- Migration: 20260606000070_phase_av_autonomous_ops.sql
-- Purpose: Policies, kill switches, audit logs for autonomous agents.
-- Safety: New tables in 'autonomous' schema. RLS enabled. GraphQL excluded.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS autonomous;

-- ─────────────────────────────────────────────────────────────────────────────
-- AUTOMATION POLICIES
-- Rules dictating what agents can do without human approval
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS autonomous.automation_policies (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID,           -- NULL = platform-wide
    agent_type          TEXT NOT NULL, -- 'support', 'fraud', 'moderation', 'growth'
    action_type         TEXT NOT NULL, -- 'refund', 'ban_user', 'change_pricing'
    requires_approval   BOOLEAN NOT NULL DEFAULT TRUE,
    max_amount_usd      NUMERIC(10,2), -- e.g., auto-refund up to $50
    risk_threshold      NUMERIC(4,3),  -- requires human if risk > 0.3
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_by          UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automation_policies_agent ON autonomous.automation_policies(company_id, agent_type);
COMMENT ON TABLE autonomous.automation_policies IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- HUMAN REVIEW QUEUE
-- Tasks escalated from agents to humans
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS autonomous.human_review_queue (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    agent_id            TEXT NOT NULL,
    task_type           TEXT NOT NULL,
    context_data        JSONB NOT NULL,
    agent_recommendation TEXT,
    confidence_score    NUMERIC(4,3),
    risk_score          NUMERIC(4,3),
    status              TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    reviewed_by         UUID,
    reviewed_at         TIMESTAMPTZ,
    escalation_reason   TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_human_review_queue_status ON autonomous.human_review_queue(company_id, status);
COMMENT ON TABLE autonomous.human_review_queue IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- KILL SWITCHES
-- Emergency stop controls for autonomous systems
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS autonomous.kill_switches (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID,
    system_name         TEXT NOT NULL, -- 'all_agents', 'support_agent', 'pricing_algo'
    is_triggered        BOOLEAN NOT NULL DEFAULT FALSE,
    triggered_by        UUID,
    triggered_at        TIMESTAMPTZ,
    reason              TEXT,
    restored_by         UUID,
    restored_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kill_switches_system ON autonomous.kill_switches(system_name) WHERE is_triggered = TRUE;
COMMENT ON TABLE autonomous.kill_switches IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- AUTOMATION AUDIT LOG
-- Immutable ledger of autonomous actions
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS autonomous.automation_audit_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    agent_id            TEXT NOT NULL,
    action_taken        TEXT NOT NULL,
    target_entity_id    UUID,
    target_entity_type  TEXT,
    action_data         JSONB,
    was_approved        BOOLEAN DEFAULT FALSE,
    approved_by         UUID,
    execution_time_ms   INTEGER,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automation_audit_company ON autonomous.automation_audit_log(company_id, created_at DESC);
COMMENT ON TABLE autonomous.automation_audit_log IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE autonomous.automation_policies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous.human_review_queue   ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous.kill_switches        ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous.automation_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON autonomous.automation_policies  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON autonomous.human_review_queue   FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON autonomous.kill_switches        FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON autonomous.automation_audit_log FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTS
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA autonomous TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA autonomous TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA autonomous TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TRIGGER set_updated_at BEFORE UPDATE ON autonomous.automation_policies
    FOR EACH ROW EXECUTE FUNCTION autonomous.update_updated_at();

-- Insert default global kill switch
INSERT INTO autonomous.kill_switches (company_id, system_name, is_triggered)
VALUES (NULL, 'all_agents', FALSE)
ON CONFLICT DO NOTHING;

-- =============================================================================
-- ROLLBACK: 
-- DROP TABLE autonomous.automation_audit_log;
-- DROP TABLE autonomous.kill_switches;
-- DROP TABLE autonomous.human_review_queue;
-- DROP TABLE autonomous.automation_policies;
-- =============================================================================
