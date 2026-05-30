-- Phase AA.1: Foundation Consolidation - RLS Policies

-- Enable RLS on all tables
ALTER TABLE tenant_config.tenant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.listing_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.listing_status_transitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.listing_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications.in_app_inbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_ops.model_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_ops.inference_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's tenant ID from app context or JWT claims
-- This represents the multi-tenant isolation strategy mentioned in the spec
CREATE OR REPLACE FUNCTION public.tenant_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;

-- =====================================================================================
-- TENANT CONFIG
-- =====================================================================================

-- Users can see member records for tenants they belong to
CREATE POLICY "tenant_members_read" ON tenant_config.tenant_members
    FOR SELECT USING (auth.uid() = user_id OR tenant_id = public.tenant_id());

-- =====================================================================================
-- MARKETPLACE
-- =====================================================================================

-- Companies: Tenants can see and edit their own companies
CREATE POLICY "companies_tenant_isolation_select" ON marketplace.companies
    FOR SELECT USING (tenant_id = public.tenant_id());

CREATE POLICY "companies_tenant_isolation_all" ON marketplace.companies
    FOR ALL USING (tenant_id = public.tenant_id());

-- Categories: Global read access
CREATE POLICY "categories_read_all" ON marketplace.categories
    FOR SELECT USING (true);

-- Listings: Tenants can see and edit their own listings.
-- Published listings are globally readable (but we might separate that logic later, for now just tenant isolation)
CREATE POLICY "listings_tenant_isolation_select" ON marketplace.listings
    FOR SELECT USING (tenant_id = public.tenant_id() OR status = 'PUBLISHED');

CREATE POLICY "listings_tenant_isolation_all" ON marketplace.listings
    FOR ALL USING (tenant_id = public.tenant_id());

-- Leads: Tenants can only see leads for their own listings
CREATE POLICY "leads_tenant_isolation" ON marketplace.leads
    FOR ALL USING (tenant_id = public.tenant_id() OR user_id = auth.uid());

-- =====================================================================================
-- GOVERNANCE
-- =====================================================================================

-- Audit logs: Tenants can only see their own audit logs
CREATE POLICY "audit_logs_tenant_isolation" ON governance.audit_logs
    FOR SELECT USING (tenant_id = public.tenant_id());

-- =====================================================================================
-- NOTIFICATIONS
-- =====================================================================================

-- Inbox: Users can only see their own notifications within a tenant
CREATE POLICY "inbox_user_isolation" ON notifications.in_app_inbox
    FOR ALL USING (tenant_id = public.tenant_id() AND user_id = auth.uid());

-- =====================================================================================
-- AI & COGNITIVE
-- =====================================================================================

-- Model Registry: Global read access
CREATE POLICY "model_registry_read_all" ON ai_ops.model_registry
    FOR SELECT USING (true);

-- Inference Logs: Tenants can only see their own logs
CREATE POLICY "inference_logs_tenant_isolation" ON ai_ops.inference_logs
    FOR SELECT USING (tenant_id = public.tenant_id());
