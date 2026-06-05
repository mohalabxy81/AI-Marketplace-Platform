-- =============================================================================
-- PHASE AV: WORKSTREAM J — OBSERVABILITY
-- Migration: 20260606000060_phase_av_observability.sql
-- Purpose: System telemetry, error tracking, alerts, and SLOs.
-- Safety: New tables in 'observability' schema. RLS enabled. GraphQL excluded.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS observability;
COMMENT ON SCHEMA observability IS 'Observability OS: Telemetry, traces, errors, and SLO monitoring';

-- ─────────────────────────────────────────────────────────────────────────────
-- ERROR REGISTRY
-- Centralized error tracking and bucketing (like Sentry)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS observability.error_registry (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_hash          TEXT NOT NULL, -- SHA-256 of normalized stack trace
    service_name        TEXT NOT NULL,
    error_class         TEXT NOT NULL,
    error_message       TEXT NOT NULL,
    stack_trace         TEXT,
    first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    occurrence_count    INTEGER NOT NULL DEFAULT 1,
    severity            TEXT NOT NULL DEFAULT 'error', -- 'info', 'warning', 'error', 'critical', 'fatal'
    status              TEXT NOT NULL DEFAULT 'open', -- 'open', 'investigating', 'resolved', 'ignored'
    assigned_to         UUID,
    UNIQUE (error_hash)
);

CREATE INDEX idx_error_registry_status ON observability.error_registry(status, severity);
COMMENT ON TABLE observability.error_registry IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- PLATFORM TRACES (Sampled)
-- Used for high-level latency and performance tracking
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS observability.platform_traces (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id            TEXT NOT NULL,
    span_id             TEXT NOT NULL,
    parent_span_id      TEXT,
    service_name        TEXT NOT NULL,
    operation_name      TEXT NOT NULL,
    duration_ms         NUMERIC(10,2) NOT NULL,
    status_code         INTEGER,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    tags                JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_platform_traces_service ON observability.platform_traces(service_name, timestamp DESC);
CREATE INDEX idx_platform_traces_duration ON observability.platform_traces(duration_ms DESC);
COMMENT ON TABLE observability.platform_traces IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- SLO SNAPSHOTS
-- Service Level Objectives (e.g., 99.9% uptime, p95 latency < 200ms)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS observability.slo_snapshots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name        TEXT NOT NULL,
    metric_name         TEXT NOT NULL, -- 'availability', 'latency_p95', 'error_rate'
    snapshot_date       DATE NOT NULL,
    target_value        NUMERIC(8,4) NOT NULL,
    actual_value        NUMERIC(8,4) NOT NULL,
    is_breached         BOOLEAN NOT NULL DEFAULT FALSE,
    error_budget_remaining NUMERIC(8,4),
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (service_name, metric_name, snapshot_date)
);

CREATE INDEX idx_slo_snapshots_date ON observability.slo_snapshots(snapshot_date DESC);
COMMENT ON TABLE observability.slo_snapshots IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- ALERT RULES & INCIDENT LOG
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS observability.alert_rules (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                TEXT NOT NULL,
    description         TEXT,
    metric_query        TEXT NOT NULL,
    condition           TEXT NOT NULL, -- '>', '<', '=='
    threshold           NUMERIC(14,4) NOT NULL,
    severity            TEXT NOT NULL,
    channels            TEXT[], -- ['slack', 'pagerduty', 'email']
    is_active           BOOLEAN NOT NULL DEFAULT TRUE,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS observability.incident_log (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_id             UUID REFERENCES observability.alert_rules(id) ON DELETE SET NULL,
    title               TEXT NOT NULL,
    severity            TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'triggered', -- 'triggered', 'acknowledged', 'resolved'
    triggered_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ,
    resolved_by         UUID,
    postmortem_link     TEXT
);

COMMENT ON TABLE observability.alert_rules IS E'@graphql({"exclude": true})';
COMMENT ON TABLE observability.incident_log IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE observability.error_registry  ENABLE ROW LEVEL SECURITY;
ALTER TABLE observability.platform_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE observability.slo_snapshots   ENABLE ROW LEVEL SECURITY;
ALTER TABLE observability.alert_rules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE observability.incident_log    ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON observability.error_registry  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON observability.platform_traces FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON observability.slo_snapshots   FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON observability.alert_rules     FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON observability.incident_log    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTS
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA observability TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA observability TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA observability TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION observability.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON observability.alert_rules
    FOR EACH ROW EXECUTE FUNCTION observability.update_updated_at();

-- =============================================================================
-- ROLLBACK: DROP SCHEMA observability CASCADE;
-- =============================================================================
