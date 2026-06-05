-- =============================================================================
-- PHASE AV: WORKSTREAM H — GROWTH OPERATING SYSTEM
-- Migration: 20260606000040_phase_av_growth_os.sql
-- Purpose: A/B testing, experimentation, attribution modeling, and growth KPIs.
-- Safety: New tables in 'growth' schema. RLS enabled. GraphQL excluded.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS growth;
COMMENT ON SCHEMA growth IS 'Growth OS: Experiments, attribution, and growth metrics';

-- ─────────────────────────────────────────────────────────────────────────────
-- EXPERIMENTS (A/B Tests)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS growth.experiments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID,           -- NULL = platform-wide experiment
    name                TEXT NOT NULL,
    description         TEXT,
    hypothesis          TEXT,
    status              TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'running', 'paused', 'completed'
    target_audience     JSONB,          -- filter criteria
    primary_metric      TEXT NOT NULL,  -- e.g., 'conversion_rate', 'mrr_lift'
    secondary_metrics   TEXT[],
    start_date          TIMESTAMPTZ,
    end_date            TIMESTAMPTZ,
    min_sample_size     INTEGER,
    significance_level  NUMERIC(4,3) DEFAULT 0.05,
    winner_variant_id   UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_experiments_status ON growth.experiments(status);
CREATE INDEX idx_experiments_company ON growth.experiments(company_id) WHERE company_id IS NOT NULL;
COMMENT ON TABLE growth.experiments IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- EXPERIMENT VARIANTS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS growth.experiment_variants (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id       UUID NOT NULL REFERENCES growth.experiments(id) ON DELETE CASCADE,
    name                TEXT NOT NULL, -- 'Control', 'Variant A', etc.
    description         TEXT,
    allocation_percent  NUMERIC(5,2) NOT NULL DEFAULT 50.0,
    config_overrides    JSONB,         -- Features or UI overrides
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_experiment_variants_exp ON growth.experiment_variants(experiment_id);
COMMENT ON TABLE growth.experiment_variants IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- A/B ASSIGNMENTS
-- User assignments to variants
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS growth.ab_assignments (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id       UUID NOT NULL REFERENCES growth.experiments(id) ON DELETE CASCADE,
    variant_id          UUID NOT NULL REFERENCES growth.experiment_variants(id) ON DELETE CASCADE,
    user_id             UUID,
    session_id          TEXT,           -- For anonymous users
    company_id          UUID,
    assigned_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (experiment_id, user_id),
    UNIQUE (experiment_id, session_id)
);

CREATE INDEX idx_ab_assignments_user ON growth.ab_assignments(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_ab_assignments_variant ON growth.ab_assignments(variant_id);
COMMENT ON TABLE growth.ab_assignments IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- EXPERIMENT RESULTS
-- Periodic aggregations of experiment metrics
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS growth.experiment_results (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    experiment_id       UUID NOT NULL REFERENCES growth.experiments(id) ON DELETE CASCADE,
    variant_id          UUID NOT NULL REFERENCES growth.experiment_variants(id) ON DELETE CASCADE,
    snapshot_date       DATE NOT NULL,
    sample_size         INTEGER NOT NULL DEFAULT 0,
    conversions         INTEGER NOT NULL DEFAULT 0,
    conversion_rate     NUMERIC(5,4) NOT NULL DEFAULT 0,
    lift_percent        NUMERIC(6,2),
    p_value             NUMERIC(6,5),
    confidence_interval NUMERIC[],
    is_significant      BOOLEAN DEFAULT FALSE,
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (experiment_id, variant_id, snapshot_date)
);

CREATE INDEX idx_experiment_results_exp ON growth.experiment_results(experiment_id, snapshot_date DESC);
COMMENT ON TABLE growth.experiment_results IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- ATTRIBUTION EVENTS
-- Tracking UTM parameters and referral sources
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS growth.attribution_events (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID,
    user_id             UUID,
    session_id          TEXT,
    event_type          TEXT NOT NULL, -- 'page_view', 'signup', 'purchase'
    utm_source          TEXT,
    utm_medium          TEXT,
    utm_campaign        TEXT,
    utm_term            TEXT,
    utm_content         TEXT,
    referrer_url        TEXT,
    landing_page        TEXT,
    event_time          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_attribution_events_utm ON growth.attribution_events(utm_source, utm_medium, utm_campaign);
CREATE INDEX idx_attribution_events_user ON growth.attribution_events(user_id) WHERE user_id IS NOT NULL;
COMMENT ON TABLE growth.attribution_events IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- GROWTH METRICS
-- Daily viral coefficients and acquisition costs
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS growth.growth_metrics (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID,           -- NULL = platform-wide
    snapshot_date       DATE NOT NULL,
    -- Acquisition
    new_users           INTEGER NOT NULL DEFAULT 0,
    organic_signups     INTEGER NOT NULL DEFAULT 0,
    paid_signups        INTEGER NOT NULL DEFAULT 0,
    referral_signups    INTEGER NOT NULL DEFAULT 0,
    -- Viral Math
    invites_sent        INTEGER NOT NULL DEFAULT 0,
    invites_accepted    INTEGER NOT NULL DEFAULT 0,
    k_factor            NUMERIC(5,3) NOT NULL DEFAULT 0, -- Viral coefficient
    viral_cycle_time_days NUMERIC(5,2),
    -- Costs
    total_ad_spend      NUMERIC(14,2) NOT NULL DEFAULT 0,
    blended_cac         NUMERIC(10,2) NOT NULL DEFAULT 0,
    paid_cac            NUMERIC(10,2) NOT NULL DEFAULT 0,
    -- Metadata
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, snapshot_date)
);

CREATE INDEX idx_growth_metrics_date ON growth.growth_metrics(snapshot_date DESC);
COMMENT ON TABLE growth.growth_metrics IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE growth.experiments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth.experiment_variants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth.ab_assignments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth.experiment_results   ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth.attribution_events   ENABLE ROW LEVEL SECURITY;
ALTER TABLE growth.growth_metrics       ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_role_all ON growth.experiments          FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON growth.experiment_variants  FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON growth.ab_assignments       FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON growth.experiment_results   FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON growth.attribution_events   FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY service_role_all ON growth.growth_metrics       FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- ─────────────────────────────────────────────────────────────────────────────
-- GRANTS
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA growth TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA growth TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA growth TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- TRIGGERS
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION growth.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON growth.experiments
    FOR EACH ROW EXECUTE FUNCTION growth.update_updated_at();

-- =============================================================================
-- ROLLBACK: DROP SCHEMA growth CASCADE;
-- =============================================================================
