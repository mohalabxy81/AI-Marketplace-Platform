# SPEC 34 — PRODUCTION DEVOPS PLATFORM BLUEPRINT
## AI-Adaptive Marketplace Operating System

> **Status**: Sealed — Engineering-Ready
> **Version**: 1.0.0
> **Date**: 2026-05-31
> **Applies To**: DevOps engineers, SREs, platform engineers, and security specialists
> **Basis**: Specs 01–33, Complete Engineering Constitution (Spec 30), Backend Blueprint (Spec 31), AI Blueprint (Spec 33)
> **Stack**: GitHub Actions · Supabase CLI · AWS · Vercel · Terraform · Docker · Datadog · PagerDuty

---

## SECTION 1 — DEVOPS ARCHITECTURE OVERVIEW

The production deployment platform is built around **GitOps-driven Immutable Infrastructure** and **Continuous Verification**.

```
  ┌────────────────────────────────────────────────────────┐
  │                    GITHUB REPOSITORY                   │
  │     Code Commit ──► PR Validation ──► Main Branch      │
  └───────────────────────────┬────────────────────────────┘
                              │
            ┌─────────────────┴─────────────────┐
            ▼ (GitHub Actions CI/CD)            ▼ (Terraform IaC)
  ┌─────────────────────────────────┐ ┌─────────────────────────────────┐
  │        APPLICATION HOSTING      │ │        CLOUD SERVICES LAYER     │
  │  - Vercel (Next.js Frontend)    │ │  - Supabase Database & Auth     │
  │  - Deno Deploy (Edge Functions) │ │  - AWS S3 (Storage & Media)     │
  │  - Cloudflare CDN (Global Edge) │ │  - Upstash Redis Cache / Queue  │
  └─────────────────────────────────┘ └─────────────────────────────────┘
```

---

## SECTION 2 — REPOSITORY STRATEGY

The project uses a **Turborepo Bounded Monorepo** architecture to enforce code validation while enabling simple dependency management.

```
pr1/
├── app/                  # Next.js 15 Web Application
├── company-dashboard/    # Next.js 15 SaaS Management App
├── supabase/             # Migrations, seeds, RLS policies, and Edge Functions
├── packages/             # Shared TypeScript packages (types, validations, configurations)
├── .github/              # Actions pipelines and workflows
└── terraform/            # Infrastructure as Code declarations
```

---

## SECTION 3 — BRANCHING STRATEGY

Enforces a clean **GitHub Flow** with gated trunk-based developments:

* **Trunk (`main`)**: The single source of truth. Always deployable. Direct pushes are blocked.
* **Feature Branches (`feat/*`, `fix/*`, `refactor/*`)**: Decoupled branches created for isolated tasks.
* **Release Flow**: Merging a PR into `main` automatically triggers staging deployments. Weekly tags (`v*.*.*`) trigger production deployments.

---

## SECTION 4 — CI PIPELINE BLUEPRINT

Every Pull Request undergoes automated gates using GitHub Actions:

```
[PR Commit] ──► [Lint & Formatting] ──► [TypeScript Type Check] ──► [Vitest Tests]
                                                                          │
                                       ┌──────────────────────────────────┴──────────────────────────────────┐
                                       ▼                                                                     ▼
                             [Supabase Schema Lint]                                                [Security Scan (Trivy)]
```

* **Pipeline Verification Script**:
  ```yaml
  name: CI Pipeline Validation
  on:
    pull_request:
      branches: [ main ]
  jobs:
    validate:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 20
        - run: npm ci
        - run: npm run lint
        - run: npm run typecheck
        - run: npm run test:unit
        - name: Supabase CLI Verify
          run: npx supabase db lint
  ```

---

## SECTION 5 — CD PIPELINE BLUEPRINT

Handles automated delivery to target hosting zones on approval.

```
  [Release Tag Created]
            │
            ├─► Apply Database Migrations ──► Supabase Migration CLI
            │
            ├─► Deploy Next.js Web App  ──► Vercel CLI Deployment
            │
            ├─► Deploy Edge Functions   ──► Supabase Functions Deploy
            │
            └─► Invalidate Edge Cache   ──► Cloudflare Cache Purge
```

* **Rollback Pipeline**: Automatic rollbacks trigger if health check endpoints report $>1\%$ HTTP $5xx$ errors over a 2-minute deployment window. Database migrations utilize backward-compatible fields to prevent structural locking on rollbacks.

---

## SECTION 6 — ENVIRONMENT BLUEPRINT

Environments are partitioned across accounts to prevent operational leaks:

| Environment | Purpose | Hosting & Orchestration | Data Strategy | Access Policy |
|:---|:---|:---|:---|:---|
| **Local** | Feature development | Docker Compose, Local Supabase | Mock seeds, anonymous data | Developer local machine |
| **Staging** | Pre-release validation | Vercel preview, staging Supabase | Masked DB snapshots | Restricted to Devs / QA |
| **Production**| Enterprise systems | Vercel Production, Supabase Pro | Real transactions, isolated RLS | IAM locked, break-glass MFA |

---

## SECTION 7 — INFRASTRUCTURE BLUEPRINT

The system runs on managed serverless resources, eliminating heavy VM maintenance:

* **Frontend**: Vercel Serverless Hosting with Global Edge Network optimization.
* **Edge Functions**: Deno Deploy natively integrated inside Supabase Edge Networks.
* **Data Plane**: Supabase Managed PostgreSQL instance paired with High Availability replica read tiers.
* **Object Store**: AWS S3 bucket integrations fronted by Cloudflare CDN caching networks.

---

## SECTION 8 — SECRETS MANAGEMENT BLUEPRINT

Secrets utilize a unified storage architecture with explicit access policies:

```
┌────────────────────────────────────────────────────────┐
│                   SECRETS MANAGEMENT                   │
├───────────────────┬───────────────────┬────────────────┤
│    GitHub CI      │   Vercel Engine   │ Supabase Vault │
│  - DB Admin Pass  │  - API Keys       │  - JWT Keys    │
│  - Deployment keys│  - Public Tokens  │  - AI Secrets  │
└───────────────────┴───────────────────┴────────────────┘
```

* **Rotation Policy**: Database credentials and API keys are programmatically rotated every 90 days.
* **Access Auditing**: Vault logs are piped to Datadog to audit key accesses.

---

## SECTION 9 — OBSERVABILITY BLUEPRINT

Built on OpenTelemetry standards to capture continuous diagnostic context:

* **Distributed Tracing**: Spans capture operations from frontend Next.js requests $\rightarrow$ Edge Functions $\rightarrow$ Supabase Database queries.
* **Aggregated Dashboards**: Datadog hosts combined graphs tracking LCP metrics, Edge Function run times, and database transaction lock statistics.

---

## SECTION 10 — MONITORING BLUEPRINT

Identifies performance issues across the stack:

* **Frontend**: Tracks Core Web Vitals (LCP, FID, CLS, INP) using Real User Monitoring (RUM).
* **Supabase / Postgres**: Monitors CPU saturation, active connections pools, and index scan ratios.
* **AI API Tiers**: Tracks token consumption rates, provider latencies, and request failure metrics.

---

## SECTION 11 — ALERTING BLUEPRINT

Alert priorities determine operational escalation pipelines:

* **P0 Critical (PagerDuty Trigger)**: Database connections exhausted, $>5\%$ API errors, search latency exceeding 500ms.
* **P1 Warning (Slack Alert)**: CPU usage $>80\%$ for more than 10 minutes, SSL certs expiring in $<30$ days.
* **Escalation Rules**: If P0 alerts are not acknowledged within 15 minutes, secondary on-call SRE resources are auto-paged.

---

## SECTION 12 — DISASTER RECOVERY BLUEPRINT

Provides recovery in the event of region-wide outages:

* **Point-In-Time Recovery (PITR)**: Supabase PITR backups run continuously with a 7-day lookback window.
* **Recovery Targets**:
  $$\text{RTO (Recovery Time Objective)} = 1 \text{ Hour}$$
  $$\text{RPO (Recovery Point Objective)} = 5 \text{ Minutes}$$
* **Multi-Region Failover Strategy**: If a regional AWS outage occurs, Cloudflare DNS automatically reroutes traffic to backup replica stacks in secondary regions.

---

## SECTION 13 — SCALABILITY PLAN

Ensures system reliability as usage grows:

| Tier | Monthly Users | Target Vector Search Size | Vector Index Structure | Compute Strategy |
|:---|:---|:---|:---|:---|
| **Tier 1** | 10K | 1M listings | PostgreSQL pgvector HNSW | Single instance RDS |
| **Tier 2** | 100K | 10M listings | Isolated pgvector replica | Read replicas clustering |
| **Tier 3** | 1M | 100M listings | Segmented clusters | Distributed Vector DB (Qdrant) |
| **Tier 4** | 10M | 1B listings | Multi-region index sharding | Partitioned search nodes |

---

## SECTION 14 — SECURITY OPERATIONS BLUEPRINT

Maintains high security standards across development and operations:

* **Vulnerability Scans**: GitHub Actions runs nightly Trivy dependency audits to detect outdated packages.
* **Threat Detection**: Cloudflare WAF filters SQL injection patterns, cross-site scripting (XSS), and DDoS attacks at the Edge.
* **Audit Trails**: Sensitive actions write immutable rows to `governance.audit_logs`.

---

## SECTION 15 — COST OPTIMIZATION BLUEPRINT

Proactively controls infrastructure spending:

```
┌────────────────────────────────────────────────────────┐
│                     COST CONTROLS                      │
├───────────────────┬───────────────────┬────────────────┤
│     Compute       │     Database      │    AI Cache    │
│  - Serverless     │  - Read Replicas  │  - Upstash     │
│  - Edge workers   │  - Compression    │  - pgvector    │
└───────────────────┴───────────────────┴────────────────┘
```

* **Edge Caching**: static API payloads are cached at the CDN level to minimize database read charges.
* **AI Cost Monitoring**: Budget alerts trigger notifications if LLM token costs exceed monthly thresholds.

---

## SECTION 16 — PRODUCTION READINESS CHECKLIST

* [ ] Point-in-Time Recovery (PITR) enabled and verified on primary database.
* [ ] Database migration rollback dry-runs verified on staging.
* [ ] Cloudflare WAF security rules deployed and active.
* [ ] PagerDuty escalation policies configured with active on-call rosters.

---

## SECTION 17 — GO-LIVE PLAN

1. **T-24 Hours**: Run full schema verification checks.
2. **T-12 Hours**: Sync production environment variables and deploy code to production Vercel servers under `maintenance` flags.
3. **T-2 Hours**: Warm CDN edge caches and run final system sanity checks.
4. **T-0**: Route DNS records to the production CDN and monitor errors in Datadog.

---

## SECTION 18 — OPERATIONS RUNBOOK

* **Diagnosing Database Lock Bottlenecks**:
  ```sql
  -- Identify long-running queries blocking operations
  SELECT pid, age(clock_timestamp(), query_start), usename, query
  FROM pg_stat_activity
  WHERE state != 'idle' AND query_start IS NOT NULL
  ORDER BY age DESC LIMIT 5;
  ```
* **Terminating Blocking Queries**:
  ```sql
  SELECT pg_terminate_backend(pid);
  ```

---

## SECTION 19 — INCIDENT PLAYBOOK

When a P0 system alert fires:

```
 [Alert Received] ──► [Acknowledge in PagerDuty] ──► [Verify Health Check Status]
                                                            │
                                  ┌─────────────────────────┴─────────────────────────┐
                                  ▼ (DB Out of Memory?)                               ▼ (API Failure?)
                       [Restart Read-Replica nodes]                        [Rollback to Last Stable Tag]
```

---

## SECTION 20 — DEVOPS ROADMAP

```
  Phase 1: CI Foundations ──►  Phase 2: IaC Deployments ──►  Phase 3: Observability  ──►  Phase 4: Scaling
  (Lint, test pipelines)       (Terraform setups)           (Traces & Metrics)          (Multi-region replication)
```

* **Phase 1 (CI Foundations)**: Build core CI validation workflows and establish local Docker development clusters.
* **Phase 2 (IaC & CD Deployments)**: Deploy Terraform configurations, secure Supabase CLI pipelines, and establish multi-tenant testing branches.
* **Phase 3 (Observability & Alerting)**: Deploy Datadog agents, configure custom SLI/SLO dashboards, and establish active PagerDuty escalation workflows.
* **Phase 4 (Scaling & Disaster Recovery)**: Implement multi-region replication architectures, run automated database failover drills, and fine-tune edge network caching rules.
