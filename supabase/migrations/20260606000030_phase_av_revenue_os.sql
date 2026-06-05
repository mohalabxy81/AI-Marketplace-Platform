-- =============================================================================
-- PHASE AV: WORKSTREAM G — REVENUE OPERATING SYSTEM
-- Migration: 20260606000030_phase_av_revenue_os.sql
-- Purpose: MRR tracking, ARR projections, churn analytics, LTV calculation,
--          revenue forecasting, cohort analysis, and attribution.
-- Safety: New tables in 'revenue' schema. RLS enabled. GraphQL excluded.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS revenue;
COMMENT ON SCHEMA revenue IS 'Revenue OS: MRR, ARR, churn, LTV, and forecasting analytics';

-- ─────────────────────────────────────────────────────────────────────────────
-- MRR/ARR SNAPSHOTS
-- Daily/Monthly revenue snapshots per tenant or platform
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue.mrr_snapshots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID,           -- NULL = platform-wide
    snapshot_date       DATE NOT NULL,
    -- Core metrics
    total_mrr           NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_arr           NUMERIC(14,2) NOT NULL DEFAULT 0,
    -- MRR Components
    new_mrr             NUMERIC(14,2) NOT NULL DEFAULT 0,
    expansion_mrr       NUMERIC(14,2) NOT NULL DEFAULT 0,
    contraction_mrr     NUMERIC(14,2) NOT NULL DEFAULT 0,
    churned_mrr         NUMERIC(14,2) NOT NULL DEFAULT 0,
    resurrected_mrr     NUMERIC(14,2) NOT NULL DEFAULT 0,
    net_new_mrr         NUMERIC(14,2) NOT NULL DEFAULT 0,
    -- Customer metrics
    total_customers     INTEGER NOT NULL DEFAULT 0,
    new_customers       INTEGER NOT NULL DEFAULT 0,
    churned_customers   INTEGER NOT NULL DEFAULT 0,
    arpu                NUMERIC(10,2) NOT NULL DEFAULT 0, -- Average Revenue Per User
    -- Metadata
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, snapshot_date)
);

CREATE INDEX idx_mrr_snapshots_date ON revenue.mrr_snapshots(snapshot_date DESC);
COMMENT ON TABLE revenue.mrr_snapshots IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- CHURN EVENTS
-- Detailed record of downgrades and cancellations
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue.churn_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    customer_id         UUID NOT NULL,
    subscription_id     TEXT NOT NULL,
    event_type          TEXT NOT NULL, -- 'voluntary_churn', 'involuntary_churn', 'contraction'
    mrr_lost            NUMERIC(14,2) NOT NULL,
    reason_code         TEXT,
    reason_text         TEXT,
    competitor_lost_to  TEXT,
    preventable         BOOLEAN,
    event_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_churn_events_company ON revenue.churn_events(company_id, event_date DESC);
COMMENT ON TABLE revenue.churn_events IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- LTV (LIFETIME VALUE) CALCULATIONS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue.ltv_calculations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID,           -- NULL = platform-wide
    segment_name        TEXT NOT NULL DEFAULT 'all', -- e.g., 'enterprise', 'smb'
    snapshot_date       DATE NOT NULL,
    avg_customer_lifespan_months NUMERIC(8,2) NOT NULL DEFAULT 0,
    gross_margin_percent NUMERIC(5,2) NOT NULL DEFAULT 100.0,
    cac                 NUMERIC(14,2),  -- Customer Acquisition Cost
    estimated_ltv       NUMERIC(14,2) NOT NULL DEFAULT 0,
    ltv_to_cac_ratio    NUMERIC(8,2),
    confidence_score    NUMERIC(4,3),
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, segment_name, snapshot_date)
);

CREATE INDEX idx_ltv_calculations_date ON revenue.ltv_calculations(snapshot_date DESC);
COMMENT ON TABLE revenue.ltv_calculations IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- COHORT ANALYSIS
-- Retention and revenue by customer cohort (join month)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue.cohort_analysis (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID,           -- NULL = platform-wide
    cohort_month        DATE NOT NULL,  -- e.g., '2026-01-01'
    analysis_month      DATE NOT NULL,  -- e.g., '2026-06-01'
    months_since_join   INTEGER NOT NULL,
    initial_customers   INTEGER NOT NULL,
    retained_customers  INTEGER NOT NULL,
    retention_rate      NUMERIC(5,2) NOT NULL,
    initial_mrr         NUMERIC(14,2) NOT NULL,
    retained_mrr        NUMERIC(14,2) NOT NULL,
    net_revenue_retention NUMERIC(6,2) NOT NULL, -- NRR
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, cohort_month, analysis_month)
);

CREATE INDEX idx_cohort_analysis_cohort ON revenue.cohort_analysis(cohort_month DESC, months_since_join);
COMMENT ON TABLE revenue.cohort_analysis IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- REVENUE FORECASTS
-- AI-generated predictions for future MRR
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue.revenue_forecasts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID,           -- NULL = platform-wide
    forecast_date       DATE NOT NULL,
    target_month        DATE NOT NULL,
    model_version       TEXT NOT NULL DEFAULT 'prophet_v1',
    predicted_mrr       NUMERIC(14,2) NOT NULL,
    lower_bound_mrr     NUMERIC(14,2) NOT NULL,
    upper_bound_mrr     NUMERIC(14,2) NOT NULL,
    predicted_churn_rate NUMERIC(5,2),
    predicted_expansion NUMERIC(14,2),
    confidence_score    NUMERIC(4,3),
    actual_mrr          NUMERIC(14,2),  -- Filled in retrospectively
    error_margin        NUMERIC(5,2),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revenue_forecasts_target ON revenue.revenue_forecasts(target_month, forecast_date DESC);
COMMENT ON TABLE revenue.revenue_forecasts IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- REVENUE ATTRIBUTION
-- Tie revenue back to specific campaigns, agents, or features
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS revenue.revenue_attribution (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    customer_id         UUID NOT NULL,
    revenue_amount      NUMERIC(14,2) NOT NULL,
    event_date          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attribution_type    TEXT NOT NULL, -- 'marketing_campaign', 'sales_agent', 'feature_upsell'
    source_id           TEXT NOT NULL,
    source_name         TEXT NOT NULL,
    weight              NUMERIC(4,3) NOT NULL DEFAULT 1.0, -- for multi-touch attribution
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_revenue_attribution_source ON revenue.revenue_attribution(attribution_type, source_id);
COMMENT ON TABLE revenue.revenue_attribution IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE revenue.mrr_snapshots       ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue.churn_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue.ltv_calculations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue.cohort_analysis     ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue.revenue_forecasts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue.revenue_attribution ENABLE ROW LEVEL SECURITY;

-- Service role has full access
CREATE POLICY service_role_all ON revenue.mrr_snapshots       FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON revenue.churn_events        FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON revenue.ltv_calculations    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON revenue.cohort_analysis     FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON revenue.revenue_forecasts   FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON revenue.revenue_attribution FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTS
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA revenue TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA revenue TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA revenue TO service_role;

-- =============================================================================
-- ROLLBACK: DROP SCHEMA revenue CASCADE;
-- =============================================================================
