# 16. OBSERVABILITY

> **Status**: Approved
> **Target Audience**: SRE, Platform Engineers
> **Domain**: Core Operations

## 1. Executive Summary
Observability ensures that when the platform fails, engineers can pinpoint the root cause in minutes. It relies on logs, metrics, traces, and an immutable audit trail.

## 2. Telemetry Architecture

### 2.1 Postgres Logging
- Supabase provides `pg_stat_statements` to track slow queries.
- Any query taking > 100ms triggers a Datadog/Sentry alert.

### 2.2 Edge Function Logging
- Deno Edge Functions dump `console.log` and `console.error` to Supabase Logs (powered by Logflare/BigQuery).
- Critical failures (e.g., Stripe Webhook parsing error) emit an alert payload to PagerDuty.

### 2.3 Distributed Tracing
- Next.js and Edge Functions inject a `x-correlation-id` header into all requests.
- This ID is passed down to Postgres via `set_config('request.correlation_id', '...', true)`.
- If an API request fails, the entire lifecycle (Frontend -> Edge -> DB) can be traced using this single ID.

## 3. Auditability (`governance.audit_logs`)
- Every destructive action (`DELETE`, `UPDATE` to critical tables like billing/users) fires a Postgres trigger.
- The trigger writes the `actor_id`, `old_values`, `new_values`, and `timestamp` to the `audit_logs` table.
- This is a strict SOC2 compliance requirement.

## 4. Security Monitoring
- Supabase provides native alerting for excessive failed login attempts (brute force detection).
- RLS Violation attempts are logged. Repeated violations from a specific IP trigger a temporary WAF (Web Application Firewall) ban.
