-- Phase AA.1: Foundation Consolidation - Schemas
-- Creating the domain schemas as defined in the master architecture

-- 1. Tenant & Organization Domain
CREATE SCHEMA IF NOT EXISTS tenant_config;

-- 2. Marketplace & Core Domain
CREATE SCHEMA IF NOT EXISTS marketplace;

-- 3. AI & Cognitive Domain
CREATE SCHEMA IF NOT EXISTS ai_ops;

-- 4. Trust & Security Domain
CREATE SCHEMA IF NOT EXISTS governance;

-- 5. Notifications & Realtime Domain
CREATE SCHEMA IF NOT EXISTS notifications;

-- (The 'auth' schema is managed by Supabase, and 'public' is the default but we will avoid it for domain models)
