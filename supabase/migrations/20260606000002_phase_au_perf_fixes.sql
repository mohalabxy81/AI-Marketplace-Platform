-- ============================================================
-- Phase AU.0 — Performance & Security Advisor Fixes
-- ============================================================
-- Migration ID: 20260606000002_phase_au_perf_fixes
-- Fixes: 25 unindexed FK warnings (INFO) + 40+ RLS initplan warnings (WARN)
-- ============================================================

-- ── Covering Indexes for Unindexed Foreign Keys ────────────────────────────

-- ai_configurations.updated_by
CREATE INDEX IF NOT EXISTS idx_ai_configurations_updated_by
  ON public.ai_configurations(updated_by);

-- ai_insights.listing_id
CREATE INDEX IF NOT EXISTS idx_ai_insights_listing_id
  ON public.ai_insights(listing_id);

-- audit_logs.actor_id
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id
  ON public.audit_logs(actor_id);

-- audit_logs.company_id
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id
  ON public.audit_logs(company_id);

-- billing_events.company_id
CREATE INDEX IF NOT EXISTS idx_billing_events_company_id
  ON public.billing_events(company_id);

-- companies.owner_id (fk_company_owner)
CREATE INDEX IF NOT EXISTS idx_companies_owner_id
  ON public.companies(owner_id);

-- conversations.company_id
CREATE INDEX IF NOT EXISTS idx_conversations_company_id
  ON public.conversations(company_id);

-- feature_flags.updated_by
CREATE INDEX IF NOT EXISTS idx_feature_flags_updated_by
  ON public.feature_flags(updated_by);

-- fraud_scores.company_id
CREATE INDEX IF NOT EXISTS idx_fraud_scores_company_id
  ON public.fraud_scores(company_id);

-- fraud_scores.user_id
CREATE INDEX IF NOT EXISTS idx_fraud_scores_user_id
  ON public.fraud_scores(user_id);

-- impersonation_sessions.target_company_id
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_target_company_id
  ON public.impersonation_sessions(target_company_id);

-- listings.created_by
CREATE INDEX IF NOT EXISTS idx_listings_created_by
  ON public.listings(created_by);

-- messages.conversation_id
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id
  ON public.messages(conversation_id);

-- messages.sender_id
CREATE INDEX IF NOT EXISTS idx_messages_sender_id
  ON public.messages(sender_id);

-- moderation_actions.actor_id
CREATE INDEX IF NOT EXISTS idx_moderation_actions_actor_id
  ON public.moderation_actions(actor_id);

-- moderation_actions.queue_item_id
CREATE INDEX IF NOT EXISTS idx_moderation_actions_queue_item_id
  ON public.moderation_actions(queue_item_id);

-- moderation_queues.assigned_to
CREATE INDEX IF NOT EXISTS idx_moderation_queues_assigned_to
  ON public.moderation_queues(assigned_to);

-- moderation_queues.company_id
CREATE INDEX IF NOT EXISTS idx_moderation_queues_company_id
  ON public.moderation_queues(company_id);

-- notifications.company_id
CREATE INDEX IF NOT EXISTS idx_notifications_company_id
  ON public.notifications(company_id);

-- notifications.user_id
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications(user_id);

-- platform_admins.created_by
CREATE INDEX IF NOT EXISTS idx_platform_admins_created_by
  ON public.platform_admins(created_by);

-- platform_notifications.company_id
CREATE INDEX IF NOT EXISTS idx_platform_notifications_company_id
  ON public.platform_notifications(company_id);

-- support_tickets.assigned_to
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to
  ON public.support_tickets(assigned_to);

-- tenant_invoices.subscription_id
CREATE INDEX IF NOT EXISTS idx_tenant_invoices_subscription_id
  ON public.tenant_invoices(subscription_id);

-- trust_verifications.company_id
CREATE INDEX IF NOT EXISTS idx_trust_verifications_company_id
  ON public.trust_verifications(company_id);

-- trust_verifications.verified_by
CREATE INDEX IF NOT EXISTS idx_trust_verifications_verified_by
  ON public.trust_verifications(verified_by);

-- user_interactions.user_id
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_id
  ON public.user_interactions(user_id);

-- ── RLS auth_rls_initplan Fixes ────────────────────────────────────────────
-- Replace auth.uid() with (select auth.uid()) to prevent per-row re-evaluation
-- This is a WARN-level performance issue that degrades at scale

-- companies: "Owners can update their company"
DROP POLICY IF EXISTS "Owners can update their company" ON public.companies;
CREATE POLICY "Owners can update their company" ON public.companies
  FOR UPDATE USING ((select auth.uid()) = owner_id);

-- users: "Users can view members of their company"
DROP POLICY IF EXISTS "Users can view members of their company" ON public.users;
CREATE POLICY "Users can view members of their company" ON public.users
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid())
    )
  );

-- users: "Users can update their own profile"
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (id = (select auth.uid()));

-- listings: "Users with permission can insert listings"
DROP POLICY IF EXISTS "Users with permission can insert listings" ON public.listings;
CREATE POLICY "Users with permission can insert listings" ON public.listings
  FOR INSERT WITH CHECK (
    (select auth.uid()) IN (
      SELECT u.id FROM public.users u WHERE u.company_id = listings.company_id
    )
  );

-- listings: "Users with permission can update listings"
DROP POLICY IF EXISTS "Users with permission can update listings" ON public.listings;
CREATE POLICY "Users with permission can update listings" ON public.listings
  FOR UPDATE USING (
    (select auth.uid()) IN (
      SELECT u.id FROM public.users u WHERE u.company_id = listings.company_id
    )
  );

-- listings: "Users with permission can delete listings"
DROP POLICY IF EXISTS "Users with permission can delete listings" ON public.listings;
CREATE POLICY "Users with permission can delete listings" ON public.listings
  FOR DELETE USING (
    (select auth.uid()) IN (
      SELECT u.id FROM public.users u WHERE u.company_id = listings.company_id
    )
  );

-- user_interactions: "Users can insert interactions"
DROP POLICY IF EXISTS "Users can insert interactions" ON public.user_interactions;
CREATE POLICY "Users can insert interactions" ON public.user_interactions
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- user_interactions: "Users with permission can view analytics"
DROP POLICY IF EXISTS "Users with permission can view analytics" ON public.user_interactions;
CREATE POLICY "Users with permission can view analytics" ON public.user_interactions
  FOR SELECT USING (
    (select auth.jwt()) ->> 'role' IN ('super_admin', 'admin', 'analyst') OR
    user_id = (select auth.uid())
  );

-- roles_permissions: "Users with permission can manage roles"
DROP POLICY IF EXISTS "Users with permission can manage roles" ON public.roles_permissions;
CREATE POLICY "Users with permission can manage roles" ON public.roles_permissions
  FOR ALL USING ((select auth.jwt()) ->> 'role' IN ('super_admin', 'admin'));

-- team_invites: "Users with permission can manage invites"
DROP POLICY IF EXISTS "Users with permission can manage invites" ON public.team_invites;
CREATE POLICY "Users with permission can manage invites" ON public.team_invites
  FOR ALL USING (
    (select auth.jwt()) ->> 'role' IN ('super_admin', 'admin', 'owner') OR
    invited_by = (select auth.uid())
  );

-- analytics_snapshots: "snapshots_company_isolation"
DROP POLICY IF EXISTS "snapshots_company_isolation" ON public.analytics_snapshots;
CREATE POLICY "snapshots_company_isolation" ON public.analytics_snapshots
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = (select auth.uid())
    ) OR
    (select auth.jwt()) ->> 'role' = 'super_admin'
  );

-- ai_insights: "insights_company_isolation"
DROP POLICY IF EXISTS "insights_company_isolation" ON public.ai_insights;
CREATE POLICY "insights_company_isolation" ON public.ai_insights
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = (select auth.uid())
    ) OR
    (select auth.jwt()) ->> 'role' = 'super_admin'
  );

-- notifications: "Users can view their own notifications"
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = (select auth.uid()));

-- notifications: "System can insert notifications"
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    (select auth.jwt()) ->> 'role' IN ('super_admin', 'service_role')
  );

-- notifications: "Users can update their own notifications"
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = (select auth.uid()));

-- audit_logs: "Company members can view audit logs"
DROP POLICY IF EXISTS "Company members can view audit logs" ON public.audit_logs;
CREATE POLICY "Company members can view audit logs" ON public.audit_logs
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = (select auth.uid())
    ) OR
    (select auth.jwt()) ->> 'role' = 'super_admin'
  );

-- audit_logs: "System can insert audit logs"
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs" ON public.audit_logs
  FOR INSERT WITH CHECK (
    (select auth.jwt()) ->> 'role' IN ('super_admin', 'service_role')
  );

-- platform_admins: "manage_all_admins"
DROP POLICY IF EXISTS "manage_all_admins" ON public.platform_admins;
CREATE POLICY "manage_all_admins" ON public.platform_admins
  FOR ALL USING ((select auth.jwt()) ->> 'role' = 'super_admin');

-- platform_admins: "select_own_admin_profile"
DROP POLICY IF EXISTS "select_own_admin_profile" ON public.platform_admins;
CREATE POLICY "select_own_admin_profile" ON public.platform_admins
  FOR SELECT USING (
    user_id = (select auth.uid()) OR
    (select auth.jwt()) ->> 'role' = 'super_admin'
  );

-- conversations: "Company members can view conversations"
DROP POLICY IF EXISTS "Company members can view conversations" ON public.conversations;
CREATE POLICY "Company members can view conversations" ON public.conversations
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = (select auth.uid())
    )
  );

-- conversations: "Company members can create conversations"
DROP POLICY IF EXISTS "Company members can create conversations" ON public.conversations;
CREATE POLICY "Company members can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = (select auth.uid())
    )
  );

-- messages: "Company members can view messages"
DROP POLICY IF EXISTS "Company members can view messages" ON public.messages;
CREATE POLICY "Company members can view messages" ON public.messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT c.id FROM public.conversations c
      JOIN public.users u ON u.company_id = c.company_id
      WHERE u.id = (select auth.uid())
    )
  );

-- messages: "Company members can insert messages"
DROP POLICY IF EXISTS "Company members can insert messages" ON public.messages;
CREATE POLICY "Company members can insert messages" ON public.messages
  FOR INSERT WITH CHECK (
    sender_id = (select auth.uid())
  );

-- company_ui_settings: "Users can view their company UI settings"
DROP POLICY IF EXISTS "Users can view their company UI settings" ON public.company_ui_settings;
CREATE POLICY "Users can view their company UI settings" ON public.company_ui_settings
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = (select auth.uid())
    )
  );

-- company_ui_settings: "Owners and managers can update company UI settings"
DROP POLICY IF EXISTS "Owners and managers can update company UI settings" ON public.company_ui_settings;
CREATE POLICY "Owners and managers can update company UI settings" ON public.company_ui_settings
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid()) AND role IN ('owner', 'admin', 'manager')
    )
  );

-- company_ui_settings: "Owners and managers can insert company UI settings"
DROP POLICY IF EXISTS "Owners and managers can insert company UI settings" ON public.company_ui_settings;
CREATE POLICY "Owners and managers can insert company UI settings" ON public.company_ui_settings
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users
      WHERE id = (select auth.uid()) AND role IN ('owner', 'admin', 'manager')
    )
  );

-- platform_audit_logs: "select_audit_logs"
DROP POLICY IF EXISTS "select_audit_logs" ON public.platform_audit_logs;
CREATE POLICY "select_audit_logs" ON public.platform_audit_logs
  FOR SELECT USING ((select auth.jwt()) ->> 'role' = 'super_admin');

-- moderation_queues: "admin_select_mod"
DROP POLICY IF EXISTS "admin_select_mod" ON public.moderation_queues;
CREATE POLICY "admin_select_mod" ON public.moderation_queues
  FOR SELECT USING ((select auth.jwt()) ->> 'role' IN ('super_admin', 'moderator'));

COMMENT ON MIGRATION IS 'Phase AU.0: Fix all Supabase advisor warnings — 27 FK indexes + 25+ RLS initplan optimizations';
