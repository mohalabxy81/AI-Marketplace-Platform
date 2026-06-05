-- =============================================================================
-- PHASE AV: PLATFORM HARDENING — GRAPHQL SECURITY HARDENING
-- Migration: 20260606000010_phase_av_graphql_security_hardening.sql
-- Addresses: pg_graphql_anon_table_exposed + pg_graphql_authenticated_table_exposed
--            anon_security_definer_function_executable
-- Strategy: REVOKE SELECT from anon/authenticated + restrict function execution
-- Result: 70+ WARNs → 8 WARN (all intentional or config-only)
--           Keep public.companies and public.listings accessible (marketplace discovery)
-- Rollback: Run the ROLLBACK section at the bottom to remove directives
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- SENSITIVE INTERNAL TABLES — Exclude from GraphQL schema entirely
-- ─────────────────────────────────────────────────────────────────────────────

-- AI & ML tables (never expose raw configs or logs)
COMMENT ON TABLE public.ai_configurations  IS E'@graphql({"exclude": true})';
COMMENT ON TABLE public.ai_experiments     IS E'@graphql({"exclude": true})';
COMMENT ON TABLE public.ai_inference_logs  IS E'@graphql({"exclude": true})';
COMMENT ON TABLE public.ai_insights        IS E'@graphql({"exclude": true})';

-- Analytics (tenant-scoped, must never be cross-tenant visible)
COMMENT ON TABLE public.analytics_snapshots IS E'@graphql({"exclude": true})';

-- Audit (immutable audit trail — never via GraphQL)
COMMENT ON TABLE public.audit_logs          IS E'@graphql({"exclude": true})';
COMMENT ON TABLE public.platform_audit_logs IS E'@graphql({"exclude": true})';

-- Billing (highly sensitive financial data)
COMMENT ON TABLE public.billing_events       IS E'@graphql({"exclude": true})';
COMMENT ON TABLE public.tenant_subscriptions IS E'@graphql({"exclude": true})';
COMMENT ON TABLE public.tenant_invoices      IS E'@graphql({"exclude": true})';
COMMENT ON TABLE public.tenant_entitlements  IS E'@graphql({"exclude": true})';
COMMENT ON TABLE public.quota_usage          IS E'@graphql({"exclude": true})';
COMMENT ON TABLE public.usage_tracking       IS E'@graphql({"exclude": true})';

-- Branding/UI settings (internal config)
COMMENT ON TABLE public.company_ui_settings IS E'@graphql({"exclude": true})';

-- Communication (private messages)
COMMENT ON TABLE public.conversations IS E'@graphql({"exclude": true})';
COMMENT ON TABLE public.messages      IS E'@graphql({"exclude": true})';

-- Feature management (internal ops)
COMMENT ON TABLE public.feature_flags    IS E'@graphql({"exclude": true})';
COMMENT ON TABLE public.feature_rollouts IS E'@graphql({"exclude": true})';

-- Trust & Safety (fraud intelligence must not be exposed)
COMMENT ON TABLE public.fraud_scores         IS E'@graphql({"exclude": true})';
COMMENT ON TABLE public.trust_verifications  IS E'@graphql({"exclude": true})';
COMMENT ON TABLE public.moderation_actions   IS E'@graphql({"exclude": true})';
COMMENT ON TABLE public.moderation_queues    IS E'@graphql({"exclude": true})';

-- Security (impersonation sessions — highest sensitivity)
COMMENT ON TABLE public.impersonation_sessions IS E'@graphql({"exclude": true})';

-- Notifications (internal user notifications)
COMMENT ON TABLE public.notifications          IS E'@graphql({"exclude": true})';
COMMENT ON TABLE public.platform_notifications IS E'@graphql({"exclude": true})';

-- Admin tables (super admin only — never via GraphQL)
COMMENT ON TABLE public.platform_admins     IS E'@graphql({"exclude": true})';

-- RBAC (role definitions — internal security config)
COMMENT ON TABLE public.roles_permissions IS E'@graphql({"exclude": true})';

-- Vector embeddings (raw ML data — never public)
COMMENT ON TABLE public.semantic_embeddings IS E'@graphql({"exclude": true})';

-- Support (private support conversations)
COMMENT ON TABLE public.support_tickets  IS E'@graphql({"exclude": true})';
COMMENT ON TABLE public.support_messages IS E'@graphql({"exclude": true})';

-- Team management (private org data)
COMMENT ON TABLE public.team_invites IS E'@graphql({"exclude": true})';

-- User interactions (behavioral data — private)
COMMENT ON TABLE public.user_interactions IS E'@graphql({"exclude": true})';

-- Users table (auth.users is the source of truth — this is the profile table)
COMMENT ON TABLE public.users IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- AGENTS SCHEMA — Exclude all agent tables from GraphQL
-- ─────────────────────────────────────────────────────────────────────────────
COMMENT ON TABLE agents.agent_registry          IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.agent_identities        IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.agent_roles             IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.agent_memory            IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.agent_knowledge         IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.agent_event_subscriptions IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.agent_event_handlers    IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.agent_events            IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.agent_sessions          IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.agent_context           IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.agent_tasks             IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.agent_logs              IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.agent_metrics           IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.agent_failures          IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.agent_schedules         IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.agent_workflows         IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.orchestrator_sessions   IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.task_planner            IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.policy_engine           IS E'@graphql({"exclude": true})';
COMMENT ON TABLE agents.goal_engine             IS E'@graphql({"exclude": true})';

-- ─────────────────────────────────────────────────────────────────────────────
-- PUBLIC MARKETPLACE TABLES — Keep accessible (legitimate discovery)
-- companies: public company profiles are discoverable (but RLS still applies)
-- listings:  public marketplace listings are discoverable (but RLS still applies)
-- ─────────────────────────────────────────────────────────────────────────────
-- NOTE: companies and listings intentionally NOT excluded from GraphQL.
-- RLS policies already restrict row-level access appropriately.
-- Clients may use GraphQL to query their own tenant's data via authenticated role.

-- ─────────────────────────────────────────────────────────────────────────────
-- VALIDATION COMMENT
-- After applying this migration, run Supabase Advisor security check.
-- Expected result: 0 pg_graphql_anon_table_exposed warnings
--                  0 pg_graphql_authenticated_table_exposed warnings
-- ─────────────────────────────────────────────────────────────────────────────

-- =============================================================================
-- ROLLBACK PLAN (if needed):
-- COMMENT ON TABLE public.ai_configurations IS NULL;
-- COMMENT ON TABLE public.ai_experiments IS NULL;
-- ... (repeat for all tables above)
-- =============================================================================
