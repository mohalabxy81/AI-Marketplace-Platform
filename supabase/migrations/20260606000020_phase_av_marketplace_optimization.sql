-- =============================================================================
-- PHASE AV: WORKSTREAM F — MARKETPLACE OPTIMIZATION SCHEMA
-- Migration: 20260606000020_phase_av_marketplace_optimization.sql
-- Purpose: Auto-scoring, auto-matching, auto-recommendations, auto-ranking,
--          pricing insights, marketplace KPIs (Liquidity, Match Rate, Conversion, Retention)
-- Safety: All new tables, zero existing table modification, full RLS from day one
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SCHEMA
-- ─────────────────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS marketplace;
COMMENT ON SCHEMA marketplace IS 'Marketplace optimization: scoring, matching, discovery, KPIs';

-- ─────────────────────────────────────────────────────────────────────────────
-- LISTING QUALITY SCORES
-- Composite score: completeness + trust + engagement + freshness + AI-enrichment
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace.listing_scores (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id          UUID NOT NULL,
    company_id          UUID NOT NULL,
    -- Score Components (0.0 - 1.0 each)
    completeness_score  NUMERIC(4,3) NOT NULL DEFAULT 0,
    trust_score         NUMERIC(4,3) NOT NULL DEFAULT 0,
    engagement_score    NUMERIC(4,3) NOT NULL DEFAULT 0,
    freshness_score     NUMERIC(4,3) NOT NULL DEFAULT 0,
    ai_enrichment_score NUMERIC(4,3) NOT NULL DEFAULT 0,
    -- Composite quality score (weighted: 0.2*completeness + 0.25*trust + 0.25*engagement + 0.15*freshness + 0.15*ai)
    quality_score       NUMERIC(4,3) NOT NULL DEFAULT 0,
    -- Ranking signals
    search_rank_boost   NUMERIC(4,3) NOT NULL DEFAULT 0,
    recommendation_weight NUMERIC(4,3) NOT NULL DEFAULT 0,
    -- Metadata
    score_version       INTEGER NOT NULL DEFAULT 1,
    scored_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    next_rescore_at     TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_listing_scores_listing ON marketplace.listing_scores(listing_id);
CREATE INDEX idx_listing_scores_company ON marketplace.listing_scores(company_id);
CREATE INDEX idx_listing_scores_quality ON marketplace.listing_scores(quality_score DESC);
CREATE INDEX idx_listing_scores_rescore ON marketplace.listing_scores(next_rescore_at) WHERE next_rescore_at <= NOW();

COMMENT ON TABLE marketplace.listing_scores IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- MATCH SCORES
-- Buyer-Seller compatibility scoring for intelligent matching
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace.match_scores (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_company_id    UUID NOT NULL,
    seller_listing_id   UUID NOT NULL,
    seller_company_id   UUID NOT NULL,
    -- Match dimensions (0.0 - 1.0)
    category_match      NUMERIC(4,3) NOT NULL DEFAULT 0,
    location_match      NUMERIC(4,3) NOT NULL DEFAULT 0,
    budget_match        NUMERIC(4,3) NOT NULL DEFAULT 0,
    intent_match        NUMERIC(4,3) NOT NULL DEFAULT 0,
    semantic_match      NUMERIC(4,3) NOT NULL DEFAULT 0,  -- pgvector cosine similarity
    -- Composite match score
    match_score         NUMERIC(4,3) NOT NULL DEFAULT 0,
    match_confidence    NUMERIC(4,3) NOT NULL DEFAULT 0,
    -- Match metadata
    match_algorithm     TEXT NOT NULL DEFAULT 'hybrid_v1',
    match_reason        TEXT[],
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_scores_buyer ON marketplace.match_scores(buyer_company_id, match_score DESC);
CREATE INDEX idx_match_scores_listing ON marketplace.match_scores(seller_listing_id);
CREATE INDEX idx_match_scores_expiry ON marketplace.match_scores(expires_at);

COMMENT ON TABLE marketplace.match_scores IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- DISCOVERY FEED
-- Personalized discovery feed cache per tenant/user
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace.discovery_feed (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID NOT NULL,
    user_id         UUID,           -- NULL = company-level feed
    feed_type       TEXT NOT NULL DEFAULT 'recommended',  -- recommended | trending | new | similar
    listing_ids     UUID[] NOT NULL DEFAULT '{}',
    listing_scores  NUMERIC(4,3)[] NOT NULL DEFAULT '{}',
    algorithm       TEXT NOT NULL DEFAULT 'collaborative_hybrid_v1',
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 hour',
    page_size       INTEGER NOT NULL DEFAULT 20,
    total_candidates INTEGER NOT NULL DEFAULT 0,
    hit_rate        NUMERIC(4,3),  -- % of feed items that got engagement
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_discovery_feed_company_type ON marketplace.discovery_feed(company_id, feed_type, expires_at DESC);
CREATE INDEX idx_discovery_feed_user ON marketplace.discovery_feed(user_id, feed_type) WHERE user_id IS NOT NULL;
CREATE INDEX idx_discovery_feed_expiry ON marketplace.discovery_feed(expires_at) WHERE expires_at < NOW();

COMMENT ON TABLE marketplace.discovery_feed IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- PRICING INSIGHTS
-- AI-generated pricing recommendations per listing/category
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace.pricing_insights (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID NOT NULL,
    listing_id          UUID,           -- NULL = category-level insight
    category            TEXT,
    -- Price analysis
    current_price       NUMERIC(14,2),
    recommended_min     NUMERIC(14,2),
    recommended_max     NUMERIC(14,2),
    market_median       NUMERIC(14,2),
    competitive_index   NUMERIC(4,3),   -- 0 = underpriced, 1 = overpriced, 0.5 = optimal
    price_elasticity    NUMERIC(6,3),   -- estimated demand elasticity
    -- Competitive context
    similar_listings    INTEGER NOT NULL DEFAULT 0,
    lower_priced_count  INTEGER NOT NULL DEFAULT 0,
    higher_priced_count INTEGER NOT NULL DEFAULT 0,
    -- Recommendation
    recommendation      TEXT,           -- 'increase' | 'decrease' | 'maintain' | 'test'
    expected_cvr_impact NUMERIC(5,2),   -- % change in conversion rate
    confidence_score    NUMERIC(4,3),
    -- Data freshness
    data_window_days    INTEGER NOT NULL DEFAULT 30,
    analyzed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at          TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '24 hours',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pricing_insights_company ON marketplace.pricing_insights(company_id, expires_at DESC);
CREATE INDEX idx_pricing_insights_listing ON marketplace.pricing_insights(listing_id) WHERE listing_id IS NOT NULL;

COMMENT ON TABLE marketplace.pricing_insights IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- MARKETPLACE KPIs
-- Platform-wide and per-tenant marketplace health metrics
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace.marketplace_kpis (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id          UUID,           -- NULL = platform-wide
    snapshot_date       DATE NOT NULL,
    snapshot_hour       INTEGER,        -- NULL = daily; 0-23 = hourly
    -- Liquidity KPIs
    active_listings     INTEGER NOT NULL DEFAULT 0,
    active_buyers       INTEGER NOT NULL DEFAULT 0,
    active_sellers      INTEGER NOT NULL DEFAULT 0,
    liquidity_ratio     NUMERIC(6,3),   -- active_buyers / active_sellers
    bid_ask_spread      NUMERIC(8,2),   -- avg price gap between buyer intent and seller price
    -- Match Rate KPIs
    total_matches_made  INTEGER NOT NULL DEFAULT 0,
    match_rate          NUMERIC(5,2),   -- % of active buyers matched to listings
    avg_match_score     NUMERIC(4,3),
    time_to_first_match NUMERIC(8,2),   -- seconds
    -- Conversion KPIs
    listing_views       INTEGER NOT NULL DEFAULT 0,
    lead_conversions    INTEGER NOT NULL DEFAULT 0,
    view_to_lead_rate   NUMERIC(5,2),   -- %
    lead_to_deal_rate   NUMERIC(5,2),   -- %
    gmv                 NUMERIC(14,2),  -- Gross Marketplace Value
    -- Retention KPIs
    buyer_retention_30d  NUMERIC(5,2),  -- % buyers returning in 30 days
    seller_retention_30d NUMERIC(5,2),  -- % sellers active in 30 days
    nps_score            NUMERIC(5,2),  -- -100 to 100
    -- Discovery KPIs
    search_sessions      INTEGER NOT NULL DEFAULT 0,
    discovery_sessions   INTEGER NOT NULL DEFAULT 0,
    avg_session_depth    NUMERIC(6,2),  -- avg listings viewed per session
    -- Metadata
    computed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (company_id, snapshot_date, snapshot_hour)
);

CREATE INDEX idx_marketplace_kpis_platform ON marketplace.marketplace_kpis(snapshot_date DESC) WHERE company_id IS NULL;
CREATE INDEX idx_marketplace_kpis_company ON marketplace.marketplace_kpis(company_id, snapshot_date DESC) WHERE company_id IS NOT NULL;

COMMENT ON TABLE marketplace.marketplace_kpis IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- CONVERSION FUNNELS
-- Detailed funnel analysis per event sequence
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace.conversion_funnels (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID,           -- NULL = platform-wide
    funnel_name     TEXT NOT NULL,  -- 'discovery_to_lead' | 'lead_to_contact' | 'contact_to_deal'
    snapshot_date   DATE NOT NULL,
    -- Funnel stages (ordered)
    stage_1_name    TEXT NOT NULL,
    stage_1_count   INTEGER NOT NULL DEFAULT 0,
    stage_2_name    TEXT NOT NULL,
    stage_2_count   INTEGER NOT NULL DEFAULT 0,
    stage_3_name    TEXT,
    stage_3_count   INTEGER,
    stage_4_name    TEXT,
    stage_4_count   INTEGER,
    stage_5_name    TEXT,
    stage_5_count   INTEGER,
    -- Overall conversion
    entry_count     INTEGER NOT NULL DEFAULT 0,
    exit_count      INTEGER NOT NULL DEFAULT 0,
    conversion_rate NUMERIC(5,2),   -- %
    -- Timing
    avg_time_s1_to_s2 NUMERIC(8,2), -- seconds
    avg_time_s2_to_s3 NUMERIC(8,2),
    avg_time_s1_to_exit NUMERIC(8,2),
    -- Metadata
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversion_funnels_date ON marketplace.conversion_funnels(snapshot_date DESC, funnel_name);
CREATE INDEX idx_conversion_funnels_company ON marketplace.conversion_funnels(company_id, snapshot_date DESC) WHERE company_id IS NOT NULL;

COMMENT ON TABLE marketplace.conversion_funnels IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- AUTO-RANKING CONFIGURATION
-- Per-tenant ranking weight configuration
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS marketplace.ranking_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id      UUID,           -- NULL = platform-wide default
    config_name     TEXT NOT NULL DEFAULT 'default',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    -- Signal weights (must sum to 1.0)
    quality_weight      NUMERIC(4,3) NOT NULL DEFAULT 0.25,
    relevance_weight    NUMERIC(4,3) NOT NULL DEFAULT 0.30,
    trust_weight        NUMERIC(4,3) NOT NULL DEFAULT 0.20,
    freshness_weight    NUMERIC(4,3) NOT NULL DEFAULT 0.15,
    popularity_weight   NUMERIC(4,3) NOT NULL DEFAULT 0.10,
    -- Boost rules
    boost_verified      NUMERIC(4,3) NOT NULL DEFAULT 0.15,
    boost_promoted      NUMERIC(4,3) NOT NULL DEFAULT 0.10,
    boost_new_listing   NUMERIC(4,3) NOT NULL DEFAULT 0.05,
    -- Penalty rules
    penalty_incomplete  NUMERIC(4,3) NOT NULL DEFAULT -0.20,
    penalty_stale       NUMERIC(4,3) NOT NULL DEFAULT -0.10,
    -- Metadata
    created_by          UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE marketplace.ranking_configs IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS POLICIES
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE marketplace.listing_scores       ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.match_scores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.discovery_feed       ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.pricing_insights     ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.marketplace_kpis     ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.conversion_funnels   ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.ranking_configs      ENABLE ROW LEVEL SECURITY;

-- Service role has full access (agents and background jobs)
CREATE POLICY "service_role_full_access" ON marketplace.listing_scores
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_full_access" ON marketplace.match_scores
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_full_access" ON marketplace.discovery_feed
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_full_access" ON marketplace.pricing_insights
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_full_access" ON marketplace.marketplace_kpis
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_full_access" ON marketplace.conversion_funnels
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);
CREATE POLICY "service_role_full_access" ON marketplace.ranking_configs
    FOR ALL TO service_role USING (TRUE) WITH CHECK (TRUE);

-- Platform-wide KPIs visible to super admins only
-- Tenant-scoped KPIs visible to tenant members only (via Edge Functions / service_role)

-- ─────────────────────────────────────────────────────────────────────────────
-- GRANT to service_role (all marketplace tables accessed via service_role only)
-- ─────────────────────────────────────────────────────────────────────────────
GRANT USAGE ON SCHEMA marketplace TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA marketplace TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA marketplace TO service_role;

-- No grants to anon or authenticated — access only via Edge Functions with service_role

-- ─────────────────────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION marketplace.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON marketplace.listing_scores
    FOR EACH ROW EXECUTE FUNCTION marketplace.update_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON marketplace.ranking_configs
    FOR EACH ROW EXECUTE FUNCTION marketplace.update_updated_at();

-- =============================================================================
-- ROLLBACK: DROP SCHEMA marketplace CASCADE;
-- =============================================================================
