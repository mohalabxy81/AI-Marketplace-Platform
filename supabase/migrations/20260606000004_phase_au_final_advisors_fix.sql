-- Final Advisor Fixes for RLS
DROP POLICY IF EXISTS "Users with permission can insert listings" ON public."listings";
CREATE POLICY "Users with permission can insert listings" ON public."listings" FOR INSERT WITH CHECK (((company_id = get_current_company_id()) AND (EXISTS ( SELECT 1
   FROM (roles_permissions p
     JOIN users u ON (((p.company_id = u.company_id) AND (p.role = u.role))))
  WHERE ((u.id = (select auth.uid())) AND (p.permission = 'listings.create'::text) AND (p.allowed = true))))));
DROP POLICY IF EXISTS "Users with permission can update listings" ON public."listings";
CREATE POLICY "Users with permission can update listings" ON public."listings" FOR UPDATE USING (((company_id = get_current_company_id()) AND (EXISTS ( SELECT 1
   FROM (roles_permissions p
     JOIN users u ON (((p.company_id = u.company_id) AND (p.role = u.role))))
  WHERE ((u.id = (select auth.uid())) AND (p.permission = 'listings.edit'::text) AND (p.allowed = true))))));
DROP POLICY IF EXISTS "Users with permission can delete listings" ON public."listings";
CREATE POLICY "Users with permission can delete listings" ON public."listings" FOR DELETE USING (((company_id = get_current_company_id()) AND (EXISTS ( SELECT 1
   FROM (roles_permissions p
     JOIN users u ON (((p.company_id = u.company_id) AND (p.role = u.role))))
  WHERE ((u.id = (select auth.uid())) AND (p.permission = 'listings.delete'::text) AND (p.allowed = true))))));
DROP POLICY IF EXISTS "Users with permission can manage roles" ON public."roles_permissions";
CREATE POLICY "Users with permission can manage roles" ON public."roles_permissions" FOR ALL USING (((company_id = get_current_company_id()) AND (EXISTS ( SELECT 1
   FROM (roles_permissions p
     JOIN users u ON (((p.company_id = u.company_id) AND (p.role = u.role))))
  WHERE ((u.id = (select auth.uid())) AND (p.permission = 'team.manage'::text) AND (p.allowed = true))))));
DROP POLICY IF EXISTS "Users with permission can manage invites" ON public."team_invites";
CREATE POLICY "Users with permission can manage invites" ON public."team_invites" FOR ALL USING (((company_id = get_current_company_id()) AND (EXISTS ( SELECT 1
   FROM (roles_permissions p
     JOIN users u ON (((p.company_id = u.company_id) AND (p.role = u.role))))
  WHERE ((u.id = (select auth.uid())) AND (p.permission = 'team.manage'::text) AND (p.allowed = true))))));
DROP POLICY IF EXISTS "snapshots_company_isolation" ON public."analytics_snapshots";
CREATE POLICY "snapshots_company_isolation" ON public."analytics_snapshots" FOR ALL USING ((company_id = ( SELECT users.company_id
   FROM users
  WHERE (users.id = (select auth.uid())))));
DROP POLICY IF EXISTS "insights_company_isolation" ON public."ai_insights";
CREATE POLICY "insights_company_isolation" ON public."ai_insights" FOR ALL USING ((company_id = ( SELECT users.company_id
   FROM users
  WHERE (users.id = (select auth.uid())))));
DROP POLICY IF EXISTS "System can insert notifications" ON public."notifications";
CREATE POLICY "System can insert notifications" ON public."notifications" FOR INSERT WITH CHECK ((company_id = ( SELECT users.company_id
   FROM users
  WHERE (users.id = (select auth.uid())))));
DROP POLICY IF EXISTS "System can insert audit logs" ON public."audit_logs";
CREATE POLICY "System can insert audit logs" ON public."audit_logs" FOR INSERT WITH CHECK ((company_id = ( SELECT users.company_id
   FROM users
  WHERE (users.id = (select auth.uid())))));
DROP POLICY IF EXISTS "Company members can view messages" ON public."messages";
CREATE POLICY "Company members can view messages" ON public."messages" FOR SELECT USING ((conversation_id IN ( SELECT conversations.id
   FROM conversations
  WHERE (conversations.company_id = ( SELECT users.company_id
           FROM users
          WHERE (users.id = (select auth.uid())))))));
DROP POLICY IF EXISTS "Users can view their company UI settings" ON public."company_ui_settings";
CREATE POLICY "Users can view their company UI settings" ON public."company_ui_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = (select auth.uid())) AND (users.company_id = company_ui_settings.company_id)))));
DROP POLICY IF EXISTS "Owners and managers can update company UI settings" ON public."company_ui_settings";
CREATE POLICY "Owners and managers can update company UI settings" ON public."company_ui_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = (select auth.uid())) AND (users.company_id = company_ui_settings.company_id) AND (users.role = ANY (ARRAY['OWNER'::text, 'MANAGER'::text]))))));
DROP POLICY IF EXISTS "Owners and managers can insert company UI settings" ON public."company_ui_settings";
CREATE POLICY "Owners and managers can insert company UI settings" ON public."company_ui_settings" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = (select auth.uid())) AND (users.company_id = company_ui_settings.company_id) AND (users.role = ANY (ARRAY['OWNER'::text, 'MANAGER'::text]))))));
DROP POLICY IF EXISTS "insert_audit_logs" ON public."platform_audit_logs";
CREATE POLICY "insert_audit_logs" ON public."platform_audit_logs" FOR INSERT WITH CHECK (((select auth.uid()) IN ( SELECT platform_admins.user_id
   FROM platform_admins
  WHERE ((platform_admins.id = platform_audit_logs.admin_id) AND (platform_admins.is_active = true)))));
DROP POLICY IF EXISTS "admin_select_subs" ON public."tenant_subscriptions";
CREATE POLICY "admin_select_subs" ON public."tenant_subscriptions" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_subs" ON public."tenant_subscriptions";
CREATE POLICY "admin_all_subs" ON public."tenant_subscriptions" FOR ALL USING (is_super_admin((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_invoices" ON public."tenant_invoices";
CREATE POLICY "admin_select_invoices" ON public."tenant_invoices" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_invoices" ON public."tenant_invoices";
CREATE POLICY "admin_all_invoices" ON public."tenant_invoices" FOR ALL USING ((is_super_admin((select auth.uid())) OR (EXISTS ( SELECT 1
   FROM platform_admins
  WHERE ((platform_admins.user_id = (select auth.uid())) AND (platform_admins.role = 'BILLING_ADMIN'::text) AND (platform_admins.is_active = true))))));
DROP POLICY IF EXISTS "admin_select_billing_events" ON public."billing_events";
CREATE POLICY "admin_select_billing_events" ON public."billing_events" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_billing_events" ON public."billing_events";
CREATE POLICY "admin_all_billing_events" ON public."billing_events" FOR ALL USING (is_super_admin((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_usage" ON public."usage_tracking";
CREATE POLICY "admin_select_usage" ON public."usage_tracking" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_usage" ON public."usage_tracking";
CREATE POLICY "admin_all_usage" ON public."usage_tracking" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_quota" ON public."quota_usage";
CREATE POLICY "admin_select_quota" ON public."quota_usage" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_quota" ON public."quota_usage";
CREATE POLICY "admin_all_quota" ON public."quota_usage" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_entitlements" ON public."tenant_entitlements";
CREATE POLICY "admin_select_entitlements" ON public."tenant_entitlements" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_entitlements" ON public."tenant_entitlements";
CREATE POLICY "admin_all_entitlements" ON public."tenant_entitlements" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_mod" ON public."moderation_queues";
CREATE POLICY "admin_all_mod" ON public."moderation_queues" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_mod_actions" ON public."moderation_actions";
CREATE POLICY "admin_select_mod_actions" ON public."moderation_actions" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_mod_actions" ON public."moderation_actions";
CREATE POLICY "admin_all_mod_actions" ON public."moderation_actions" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_fraud" ON public."fraud_scores";
CREATE POLICY "admin_select_fraud" ON public."fraud_scores" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_fraud" ON public."fraud_scores";
CREATE POLICY "admin_all_fraud" ON public."fraud_scores" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_trust" ON public."trust_verifications";
CREATE POLICY "admin_select_trust" ON public."trust_verifications" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_trust" ON public."trust_verifications";
CREATE POLICY "admin_all_trust" ON public."trust_verifications" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_ai_config" ON public."ai_configurations";
CREATE POLICY "admin_select_ai_config" ON public."ai_configurations" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_ai_config" ON public."ai_configurations";
CREATE POLICY "admin_all_ai_config" ON public."ai_configurations" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_ai_exp" ON public."ai_experiments";
CREATE POLICY "admin_select_ai_exp" ON public."ai_experiments" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_ai_exp" ON public."ai_experiments";
CREATE POLICY "admin_all_ai_exp" ON public."ai_experiments" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_embeddings" ON public."semantic_embeddings";
CREATE POLICY "admin_select_embeddings" ON public."semantic_embeddings" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_embeddings" ON public."semantic_embeddings";
CREATE POLICY "admin_all_embeddings" ON public."semantic_embeddings" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_inference" ON public."ai_inference_logs";
CREATE POLICY "admin_select_inference" ON public."ai_inference_logs" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_inference" ON public."ai_inference_logs";
CREATE POLICY "admin_all_inference" ON public."ai_inference_logs" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_tickets" ON public."support_tickets";
CREATE POLICY "admin_select_tickets" ON public."support_tickets" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_tickets" ON public."support_tickets";
CREATE POLICY "admin_all_tickets" ON public."support_tickets" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_support_messages" ON public."support_messages";
CREATE POLICY "admin_select_support_messages" ON public."support_messages" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_support_messages" ON public."support_messages";
CREATE POLICY "admin_all_support_messages" ON public."support_messages" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_snapshots" ON public."analytics_snapshots";
CREATE POLICY "admin_select_snapshots" ON public."analytics_snapshots" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_snapshots" ON public."analytics_snapshots";
CREATE POLICY "admin_all_snapshots" ON public."analytics_snapshots" FOR ALL USING (is_super_admin((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_flags" ON public."feature_flags";
CREATE POLICY "admin_select_flags" ON public."feature_flags" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_flags" ON public."feature_flags";
CREATE POLICY "admin_all_flags" ON public."feature_flags" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_rollouts" ON public."feature_rollouts";
CREATE POLICY "admin_select_rollouts" ON public."feature_rollouts" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_rollouts" ON public."feature_rollouts";
CREATE POLICY "admin_all_rollouts" ON public."feature_rollouts" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_select_notifications" ON public."platform_notifications";
CREATE POLICY "admin_select_notifications" ON public."platform_notifications" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "admin_all_notifications" ON public."platform_notifications";
CREATE POLICY "admin_all_notifications" ON public."platform_notifications" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "imp_select" ON public."impersonation_sessions";
CREATE POLICY "imp_select" ON public."impersonation_sessions" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "imp_insert" ON public."impersonation_sessions";
CREATE POLICY "imp_insert" ON public."impersonation_sessions" FOR INSERT WITH CHECK (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "imp_update" ON public."impersonation_sessions";
CREATE POLICY "imp_update" ON public."impersonation_sessions" FOR UPDATE USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "notif_select" ON public."platform_notifications";
CREATE POLICY "notif_select" ON public."platform_notifications" FOR SELECT USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "notif_all" ON public."platform_notifications";
CREATE POLICY "notif_all" ON public."platform_notifications" FOR ALL USING (is_platform_admin_user((select auth.uid())));
DROP POLICY IF EXISTS "Owners can update their company" ON public."companies";
CREATE POLICY "Owners can update their company" ON public."companies" FOR UPDATE USING ((( SELECT (select auth.uid()) AS uid) = owner_id));
DROP POLICY IF EXISTS "Users can view members of their company" ON public."users";
CREATE POLICY "Users can view members of their company" ON public."users" FOR SELECT USING ((company_id IN ( SELECT users_1.company_id
   FROM users users_1
  WHERE (users_1.id = ( SELECT (select auth.uid()) AS uid)))));
DROP POLICY IF EXISTS "Users can update their own profile" ON public."users";
CREATE POLICY "Users can update their own profile" ON public."users" FOR UPDATE USING ((id = ( SELECT (select auth.uid()) AS uid)));
DROP POLICY IF EXISTS "Users can insert interactions" ON public."user_interactions";
CREATE POLICY "Users can insert interactions" ON public."user_interactions" FOR INSERT WITH CHECK ((user_id = ( SELECT (select auth.uid()) AS uid)));
DROP POLICY IF EXISTS "Users with permission can view analytics" ON public."user_interactions";
CREATE POLICY "Users with permission can view analytics" ON public."user_interactions" FOR SELECT USING ((((( SELECT (select auth.jwt()) AS jwt) ->> 'role'::text) = ANY (ARRAY['super_admin'::text, 'admin'::text, 'analyst'::text])) OR (user_id = ( SELECT (select auth.uid()) AS uid))));
DROP POLICY IF EXISTS "Users can view their own notifications" ON public."notifications";
CREATE POLICY "Users can view their own notifications" ON public."notifications" FOR SELECT USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
DROP POLICY IF EXISTS "Users can update their own notifications" ON public."notifications";
CREATE POLICY "Users can update their own notifications" ON public."notifications" FOR UPDATE USING ((user_id = ( SELECT (select auth.uid()) AS uid)));
DROP POLICY IF EXISTS "manage_all_admins" ON public."platform_admins";
CREATE POLICY "manage_all_admins" ON public."platform_admins" FOR ALL USING (((( SELECT (select auth.jwt()) AS jwt) ->> 'role'::text) = 'super_admin'::text));
DROP POLICY IF EXISTS "select_own_admin_profile" ON public."platform_admins";
CREATE POLICY "select_own_admin_profile" ON public."platform_admins" FOR SELECT USING (((user_id = ( SELECT (select auth.uid()) AS uid)) OR ((( SELECT (select auth.jwt()) AS jwt) ->> 'role'::text) = 'super_admin'::text)));
DROP POLICY IF EXISTS "Company members can view conversations" ON public."conversations";
CREATE POLICY "Company members can view conversations" ON public."conversations" FOR SELECT USING ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = ( SELECT (select auth.uid()) AS uid)))));
DROP POLICY IF EXISTS "Company members can create conversations" ON public."conversations";
CREATE POLICY "Company members can create conversations" ON public."conversations" FOR INSERT WITH CHECK ((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = ( SELECT (select auth.uid()) AS uid)))));
DROP POLICY IF EXISTS "Company members can insert messages" ON public."messages";
CREATE POLICY "Company members can insert messages" ON public."messages" FOR INSERT WITH CHECK ((sender_id = ( SELECT (select auth.uid()) AS uid)));
DROP POLICY IF EXISTS "Company members can view audit logs" ON public."audit_logs";
CREATE POLICY "Company members can view audit logs" ON public."audit_logs" FOR SELECT USING (((company_id IN ( SELECT users.company_id
   FROM users
  WHERE (users.id = ( SELECT (select auth.uid()) AS uid)))) OR ((( SELECT (select auth.jwt()) AS jwt) ->> 'role'::text) = 'super_admin'::text)));
DROP POLICY IF EXISTS "select_audit_logs" ON public."platform_audit_logs";
CREATE POLICY "select_audit_logs" ON public."platform_audit_logs" FOR SELECT USING (((( SELECT (select auth.jwt()) AS jwt) ->> 'role'::text) = 'super_admin'::text));
DROP POLICY IF EXISTS "admin_select_mod" ON public."moderation_queues";
CREATE POLICY "admin_select_mod" ON public."moderation_queues" FOR SELECT USING (((( SELECT (select auth.jwt()) AS jwt) ->> 'role'::text) = ANY (ARRAY['super_admin'::text, 'moderator'::text])));



-- Final Advisor Fixes for GraphQL exposed tables
COMMENT ON TABLE public."ai_insights" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."team_invites" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."company_ui_settings" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."impersonation_sessions" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."ai_experiments" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."messages" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."tenant_subscriptions" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."support_tickets" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."audit_logs" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."trust_verifications" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."feature_rollouts" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."support_messages" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."platform_notifications" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."users" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."platform_admins" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."usage_tracking" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."analytics_snapshots" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."conversations" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."roles_permissions" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."moderation_queues" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."moderation_actions" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."notifications" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."user_interactions" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."feature_flags" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."companies" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."ai_configurations" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."platform_audit_logs" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."listings" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."fraud_scores" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."quota_usage" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."billing_events" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."tenant_entitlements" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."semantic_embeddings" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."tenant_invoices" IS '@graphql({"exclude": true})';
COMMENT ON TABLE public."ai_inference_logs" IS '@graphql({"exclude": true})';

-- Final Advisor Fixes for Functions
ALTER FUNCTION public.block_audit_mutation_trigger() SET search_path = '';
ALTER FUNCTION public.get_current_company_id() SET search_path = '';
ALTER FUNCTION public.is_super_admin(uuid) SET search_path = '';
ALTER FUNCTION public.is_platform_admin_user(uuid) SET search_path = '';

-- Final Advisor Fixes for Buckets
DROP POLICY IF EXISTS "Public Access for branding_assets" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
