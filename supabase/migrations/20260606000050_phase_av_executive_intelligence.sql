-- =============================================================================
-- PHASE AV: WORKSTREAM I — EXECUTIVE INTELLIGENCE
-- Migration: 20260606000050_phase_av_executive_intelligence.sql
-- Purpose: Executive KPIs, board reports, strategic recommendations.
-- Safety: New tables in 'autonomous' schema. RLS enabled. GraphQL excluded.
-- =============================================================================

-- Extending the existing 'autonomous' schema from AU
CREATE SCHEMA IF NOT EXISTS autonomous;

-- ─────────────────────────────────────────────────────────────────────────────
-- EXECUTIVE KPIs
-- High-level strategic metrics aggregated for C-Suite
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS autonomous.executive_kpis (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID,           -- NULL = platform-wide
    snapshot_date       DATE NOT NULL,
    arr_usd             NUMERIC(14,2) NOT NULL DEFAULT 0,
    arr_growth_yoy      NUMERIC(5,4),
    blended_cac         NUMERIC(10,2),
    ltv_to_cac_ratio    NUMERIC(8,2),
    net_revenue_retention NUMERIC(5,4),
    burn_rate_monthly   NUMERIC(14,2),
    months_of_runway    NUMERIC(6,2),
    market_share_est    NUMERIC(5,4),
    overall_health_score NUMERIC(4,3) NOT NULL DEFAULT 0.5,
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, snapshot_date)
);

CREATE INDEX idx_executive_kpis_date ON autonomous.executive_kpis(snapshot_date DESC);
COMMENT ON TABLE autonomous.executive_kpis IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- BOARD REPORTS
-- AI-generated summaries and board decks
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS autonomous.board_reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    report_period       TEXT NOT NULL, -- e.g., 'Q3 2026'
    executive_summary   TEXT NOT NULL,
    key_achievements    TEXT[],
    key_risks           TEXT[],
    financial_summary   JSONB,
    generated_by_ai     BOOLEAN DEFAULT TRUE,
    ai_confidence_score NUMERIC(4,3),
    approved_by         UUID,          -- User ID of executive who approved
    approved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_board_reports_company ON autonomous.board_reports(company_id);
COMMENT ON TABLE autonomous.board_reports IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- STRATEGIC RECOMMENDATIONS
-- AI-driven moves for the executive team
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS autonomous.strategic_recommendations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    category            TEXT NOT NULL, -- 'm_and_a', 'product_expansion', 'hiring', 'cost_cutting'
    title               TEXT NOT NULL,
    description         TEXT NOT NULL,
    expected_impact_arr NUMERIC(14,2),
    cost_estimate       NUMERIC(14,2),
    time_to_execute     TEXT,
    confidence_score    NUMERIC(4,3) NOT NULL,
    status              TEXT NOT NULL DEFAULT 'proposed', -- 'proposed', 'accepted', 'rejected', 'in_progress'
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_strategic_recommendations_company ON autonomous.strategic_recommendations(company_id, status);
COMMENT ON TABLE autonomous.strategic_recommendations IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE autonomous.executive_kpis             ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous.board_reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE autonomous.strategic_recommendations  ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON autonomous.executive_kpis             FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON autonomous.board_reports              FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON autonomous.strategic_recommendations  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTS
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA autonomous TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA autonomous TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA autonomous TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION autonomous.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON autonomous.strategic_recommendations
    FOR EACH ROW EXECUTE FUNCTION autonomous.update_updated_at();

-- =============================================================================
-- ROLLBACK: 
-- DROP TABLE autonomous.strategic_recommendations;
-- DROP TABLE autonomous.board_reports;
-- DROP TABLE autonomous.executive_kpis;
-- =============================================================================
