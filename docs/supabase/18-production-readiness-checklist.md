# 18. PRODUCTION READINESS CHECKLIST

> **Status**: Approved
> **Target Audience**: DevOps, SecOps, Supabase Architects
> **Domain**: Operations

## 1. Security Checklist
- [ ] RLS enabled on EVERY table in `marketplace`, `identity`, `tenant_config`, `ai_ops`, `billing`.
- [ ] Global tables (`governance`, `core`) enforce RLS to restrict write access to `SERVICE_ROLE` only.
- [ ] No `SELECT *` from `auth.users` exposed to public APIs.
- [ ] JWT Secrets rotated prior to production launch.
- [ ] MFA enabled for all internal `SUPER_ADMIN` accounts.
- [ ] Supabase Network Restrictions enabled (Direct DB access allowed only from specific VPN IPs and Vercel/Edge IPs).

## 2. Performance Checklist
- [ ] PgBouncer pooler mode set to `transaction`.
- [ ] Connection pool limits configured (Max client connections = 10,000; Pool size = 200).
- [ ] HNSW indexes built on all vector columns.
- [ ] Covering indexes created for `tenant_id` on all major tables.
- [ ] Supabase Realtime publication strictly limited to required tables.

## 3. Reliability Checklist
- [ ] Point-in-Time Recovery (PITR) enabled.
- [ ] Supabase compute scaled to production instance size (minimum 16GB RAM for pgvector workloads).
- [ ] Stripe Webhooks tested for idempotency (retries do not cause duplicate billing).
- [ ] Edge Functions wrapped in global `try/catch` blocks with DLQ routing.

## 4. Observability Checklist
- [ ] Datadog/Sentry integration active for Edge Functions.
- [ ] Logflare streams configured for Supabase Postgres logs.
- [ ] Database trigger active for `governance.audit_logs`.

## 5. Compliance Checklist
- [ ] 30-day soft-delete purge cron job tested and active.
- [ ] `verification-documents` bucket configured as strictly private.
- [ ] GDPR Data Export Edge Function implemented.
