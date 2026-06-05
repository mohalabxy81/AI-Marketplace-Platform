
        { stage: 'Activation→Purchase', conversion_rate: 0.22, baseline: 0.25, z_score: 1.1, status: 'WATCH' },
        { stage: 'Awareness→Interest', conversion_rate: 0.042, baseline: 0.038, z_score: 0.8, status: 'HEALTHY' },
        { stage: 'Interest→Trial', conversion_rate: 0.031, baseline: 0.041, z_score: 2.4, status: 'BOTTLENECK' },
        { stage: 'Trial→Activation', conversion_rate: 0.58, baseline: 0.60, z_score: 0.5, status: 'HEALTHY' },
      ],
      funnel: [
      recommended_intervention: 'Campaign Agent: retargeting sequence for interest-stage visitors',
      top_bottleneck: 'Interest→Trial',
      { campaign_id: 'camp_q3_onboarding', type: 'email_drip', status: 'ACTIVE', recipients: 234, open_rate: 0.41, click_rate: 0.12 },
      { campaign_id: 'camp_retargeting_jun', type: 'in_app_notification', status: 'ACTIVE', recipients: 89, conversion_rate: 0.08 },
      { keyword: 'ai marketplace platform', volume: 1_200, difficulty: 42, priority_score: 0.81 },
      { keyword: 'autonomous agent marketplace', volume: 890, difficulty: 31, priority_score: 0.76 },
      { step: 'Account Created', count: 89 }, { step: 'Profile Completed', count: 71 },
      { step: 'First Listing', count: 58 }, { step: 'Aha! Moment (3 matches)', count: 39 },
      { tenant_id: 'ten_acme', expansion_score: 0.84, whitespace_features: ['Analytics Pro', 'API Access'], expected_arr_expansion: 28_000 },
      { tenant_id: 'ten_globex', expansion_score: 0.76, whitespace_features: ['Multi-branch'], expected_arr_expansion: 14_400 },
      { tenant_id: 'ten_nakatomi', usage_percentile: 91, current_plan: 'Starter', recommended_plan: 'Growth', expected_mrr_increase: 600 },
      { tenant_id: 'ten_waystar', usage_percentile: 88, current_plan: 'Growth', recommended_plan: 'Enterprise', expected_mrr_increase: 1_200 },
    ];
    return [
    return [{ channel: 'Organic Search', pct: 42 }, { channel: 'Paid Search', pct: 28 }, { channel: 'Referral', pct: 18 }, { channel: 'Direct', pct: 12 }];
    return [{ competitor: 'Competitor A', plan: 'Starter', price_usd: 99 }, { competitor: 'Competitor B', plan: 'Starter', price_usd: 89 }];
    return {
    return { agent_id, active_contexts: 12, total_memories: 1_847, last_consolidated: new Date().toISOString() };
    return { api_latency_p99_ms: 145, error_rate: 0.0012, uptime_30d: 0.9998, cpu_avg: 0.42, memory_avg: 0.61 };
    return { avg_health: 72, red: 14, yellow: 48, green: 280 };
    return { avg_trust_score: 0.81, below_threshold: 12, high_trust: 289, disputes_open: 4, fraud_flags_24h: 7 };
    return { fraud_checks_24h: 1_203, flagged: 7, confirmed_fraud: 3, false_positives: 1, fraud_prevented_usd: 12_400 };
    return { issues_found: 3, critical: 0, high: 1, medium: 2, auto_fixed: 2, requires_review: 1 };
    return { listing_id, tags_added: 5, description_enhanced: true, embedding_generated: true, quality_score: 0.82, auto_published: true };
    return { model_updates_7d: 3, accuracy_delta: +0.023, new_patterns_detected: 14, knowledge_nodes_added: 89 };
    return { open: 23, auto_resolved_today: 41, avg_resolution_minutes: 8.4, escalated_to_human: 7, csat_score: 4.3 };
    return { open_incidents: 0, p0: 0, p1: 0, p2: 1, mttr_minutes: 8.2, auto_resolved_rate: 0.67 };
    return { organic_traffic_growth_mom: 0.12, trial_start_rate: 0.031, trial_to_paid: 0.22, viral_coefficient: 0.28, cac_blended: 820 };
    return { query, results: [{ node_id: 'kn_001', content: `Best practice for ${query}`, confidence: 0.87, source: 'institutional_memory' }] };
    return { segment, optimal_price_delta_pct: 4.5, elasticity: -1.2, confidence: 0.65, recommendation: `Increase ${segment} plan by 4.5% — below auto-approve threshold.` };
    return { tenant_id, nudge_sent: true, channel: 'in_app + email', autonomy_level: 'AGENT_APPROVED', sent_at: new Date().toISOString() };
    return { tenant_id, sequence: 'enterprise_expansion_v2', triggered_at: new Date().toISOString(), autonomy_level: 'AGENT_APPROVED', touchpoints: 4, timeline_days: 14 };
    return { tier, current_price: 79, recommended_price: 83, change_pct: 5.06, autonomy_level: 'AI_RECOMMENDED', justification: 'Competitive gap analysis + willingness-to-pay data indicates pricing power.' };
    return { topic, target_keyword: `${topic} automation`, word_count: 1800, cta: 'Start free trial', autonomy_level: 'AUTONOMOUS_EXECUTION' };
    return { total: 8_420, published: 7_102, quarantined: 89, pending_review: 341, auto_published_today: 234, quality_score_avg: 0.78 };
    return { total_tenants: 342, upgrade_candidates: 23, downgrade_risks: 8, annual_conversion_ready: 15, health_score: 0.74 };
    };
  async analyzeFunnelBottlenecks() {
  async analyzePricingSensitivity(segment: string) {
  async analyzeSubscriptionHealth() {
  async enrichListing(listing_id: string) {
  async generateContentBrief(topic: string) {
  async getActiveCampaigns() {
  async getChannelMix() {
  async getCompetitivePricing() {
  async getContextSummary(agent_id: string) {
  async getDetectionStats() {
  async getGrowthMetrics() {
  async getHealthScores() {
  async getIncidentStatus() {
  async getKeywordOpportunities() {
  async getLearningMetrics() {
  async getListingHealth() {
  async getOnboardingFunnel() {
  async getPlatformTrustHealth() {
  async getSystemHealth() {
  async getTicketStats() {
  async getUpgradeOpportunities() {
  async recommendPriceChange(tier: string) {
  async runTechnicalAudit() {
  async scoreExpansionOpportunities() {
  async searchKnowledge(query: string) {
  async triggerExpansionSequence(tenant_id: string) {
  async triggerUpgradeNudge(tenant_id: string) {
  },
 * Autonomous Agent Services — AU.3, AU.4, AU.5, AU.6, AU.7
 * Barrel export for all autonomous agent services.
 */
/**
// Expansion Agent
// Pricing Agent
// Subscription Optimization Agent
// ── AU.2 Revenue Agents ────────────────────────────────────────────────────
// ── AU.3 Growth Agents ─────────────────────────────────────────────────────
// ── AU.4 Marketplace Agents ────────────────────────────────────────────────
// ── AU.5 Customer Success Agents ───────────────────────────────────────────
// ── AU.6 Operations Agents ─────────────────────────────────────────────────
// ── AU.7 Knowledge Agents ──────────────────────────────────────────────────
export * from "./executive/executive-copilot.service";
export * from "./executive/risk-forecast.service";
export * from "./metrics/autonomy-metrics.service";
export * from "./revenue/retention-agent.service";
export * from "./revenue/revenue-agent.service";
export const CampaignAgentService = {
export const CustomerSuccessAgentService = {
export const ExpansionAgentService = {
export const FraudAgentService = {
export const GrowthAgentService = {
export const IncidentAgentService = {
export const KnowledgeAgentService = {
export const LearningAgentService = {
export const ListingAgentService = {
export const MarketingAgentService = {
export const MemoryAgentService = {
export const OnboardingAgentService = {
export const PricingAgentService = {
export const SEOAgentService = {
export const SREAgentService = {
export const SubscriptionOptimizationAgentService = {
export const SupportAgentService = {
export const TrustAgentService = {
export { RetentionAgentService } from './revenue/retention-agent.service';
export { RevenueAgentService } from './revenue/revenue-agent.service';
};
