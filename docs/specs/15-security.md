# SPEC 15 — SECURITY & COMPLIANCE SPECIFICATION

> **Basis**: [PLANNER.md](file:///home/mohal665544/pr1/PLANNER.md) — Platform Master Architecture  
> **Status**: Execution-Ready v3 (Maximum Depth)  
> **Version**: 3.0.0  
> **Last Updated**: 2026-05-30  
> **Owned By**: Security, SRE & Platform Core Teams

---

## 1. Security Architecture Philosophy

The platform is designed around a **Zero-Trust, Defense-in-Depth** security model. Because the platform is AI-native and multi-tenant, the security threat surface includes classical web attack vectors PLUS AI-specific attack categories including prompt injection, model inversion, embedding extraction, and cross-tenant vector space leakage.

### 1.1 Zero-Trust Axioms

1. **No Implicit Trust**: No network position, service identity, or user session is trusted without explicit, cryptographic verification on every request.
2. **Least Privilege**: Every identity (human user, service account, CI/CD pipeline) holds only the minimum permissions required for its function, issued just-in-time.
3. **Assume Breach**: Architecture is designed so that a compromised component (e.g., a single microservice) cannot laterally access data outside its authorized domain.
4. **Always Verify**: Authentication and authorization checks happen at the edge gateway AND are enforced again at the data layer (RLS), creating two independent enforcement points.

### 1.2 Defense-in-Depth Layers

```
Layer 1: Network Edge
  - WAF (OWASP Core Ruleset)
  - DDoS Protection (Cloudflare/AWS Shield)
  - IP Reputation Filtering

Layer 2: API Gateway
  - JWT Signature Verification (JWKS)
  - Tenant Context Injection
  - Rate Limiting (per IP, per tenant, per API key)
  - TLS 1.3 Termination

Layer 3: Application
  - Input Validation (Zod/Pydantic schemas)
  - Authorization Middleware (Role + Scope checks)
  - CORS Policy Enforcement
  - CSRF Token Validation (state-mutating endpoints)

Layer 4: Data Layer
  - PostgreSQL Row-Level Security (RLS)
  - pgvector Tenant Filter Enforcement
  - Redis Namespace Isolation
  - Encrypted at Rest (AES-256)

Layer 5: AI Layer
  - Input Sanitization before LLM interpolation
  - PII Redaction Proxy
  - Output DLP Scanner
  - Prompt Injection Classifier

Layer 6: Audit & Detection
  - Immutable Audit Log (governance.audit_logs)
  - Behavioral Anomaly Detection
  - SIEM Integration (Splunk/Elastic)
  - Automated Threat Intelligence Feeds
```

---

## 2. Threat Model

### 2.1 Primary Threat Vectors

| Threat Category | Threat | Attacker Profile | Impact | Primary Controls |
|:----------------|:-------|:----------------|:-------|:-----------------|
| **Multi-Tenant Isolation** | Cross-tenant data leakage via API | External attacker with valid tenant JWT | Critical — competitor reads another org's listings, users | RLS + JWT tenant claim |
| **Authentication** | Account takeover via credential stuffing | Automated botnet | High — impersonation, data theft | Rate limiting + MFA + CAPTCHA |
| **AI Safety** | Prompt injection to override system instructions | Malicious tenant | High — bypass moderation, extract system prompts | Input sanitization + structural delimiters + pre-flight classifier |
| **AI Safety** | Model inversion / membership inference | Research adversary | Medium — intellectual property exposure | Output throttling + DLP |
| **Vector Space** | Embedding extraction via systematic API queries | Sophisticated attacker | Medium — reconstruct training data, reverse-engineer ranking | Rate limiting + embedding output obfuscation |
| **API Abuse** | Automated scraping / competitive intelligence | Competitor | Medium — bulk data extraction | Rate limiting + WAF + fingerprinting |
| **Injection** | SQL injection via unvalidated parameters | External attacker | Critical — data exfiltration | Parameterized queries (ORM enforced) |
| **Infrastructure** | Supply chain compromise (malicious dependency) | Nation-state / APT | Critical | SCA scanning + dependency pinning + SBOM |
| **Insider Threat** | Privileged data access abuse by admin | Malicious employee | High — PII exposure, data sale | MPA for privileged ops + audit logs + least privilege |
| **Billing Fraud** | Token abuse to drain AI quota | Malicious tenant | Medium — financial loss | Token Guard + usage anomaly detection |

### 2.2 AI-Specific Attack Surface

| Attack Vector | Description | Mitigation |
|:--------------|:------------|:-----------|
| **Direct Prompt Injection** | User input contains instructions designed to override system prompt | Structural delimiters + pre-flight classifier + sandboxed model contexts |
| **Indirect Prompt Injection** | Malicious content in a listing description that gets fed to an LLM | Content is sanitized before LLM ingestion; output is validated |
| **Jailbreaking** | Sequences designed to bypass model safety guidelines | Platform uses moderated API endpoints; raw completions are validated |
| **Membership Inference** | Querying embeddings to determine if a specific item exists in training data | Embedding outputs have controlled noise injection (ε-differential privacy for sensitive collections) |
| **Semantic Cache Poisoning** | Injecting a cached response by crafting a semantically similar malicious query | Cache keys validated against allowlist; cached responses re-validated on high-risk operations |
| **Token Draining** | Crafting maximally expensive prompts to exhaust another tenant's quota | Token Guard pre-validation + per-request max-token limits |

---

## 3. Authentication & Authorization Architecture

### 3.1 Identity Provider (IdP) Configuration

The platform uses a centralized, standards-based IdP. In the initial deployment, Supabase Auth is used; the architecture is designed for extraction to Auth0 or a custom OAuth2 server (Go-based) as scale demands.

**IdP Requirements:**
- OAuth 2.0 / OIDC compliant
- PKCE enforced for all SPA clients
- Refresh token rotation enabled (every 24 hours)
- Refresh token reuse detection (detect token theft)
- JWKS public key endpoint (`/.well-known/jwks.json`)
- MFA: TOTP (authenticator apps) + optional WebAuthn (passkeys)

**MFA Enforcement Policy:**
| Role | MFA Requirement |
|:-----|:----------------|
| End User | Optional (encouraged) |
| Tenant Member | Optional |
| Tenant Admin / Owner | Mandatory |
| Super Admin | Mandatory + Hardware Key (YubiKey) |
| Service Account | Certificate-based mTLS (no MFA) |

### 3.2 JWT Specification

**Standard JWT Payload Structure:**
```json
{
  "iss": "https://auth.platform.io",
  "sub": "user_uuid",
  "aud": "platform-api",
  "exp": 1717027200,
  "iat": 1717023600,
  "jti": "unique_token_id",
  "email": "user@example.com",
  "app_metadata": {
    "tenant_id":  "tenant_uuid",
    "org_id":     "org_uuid",
    "role":       "admin",
    "scopes":     ["listings:read", "listings:write", "analytics:read"],
    "plan_tier":  "growth",
    "mfa_verified": true
  }
}
```

**JWT Validation Rules (Enforced at API Gateway):**

| Rule | Implementation |
|:-----|:---------------|
| Signature verification | Verify RS256/ES256 signature against IdP JWKS |
| Expiry enforcement | `exp` MUST be in the future; max TTL: 15 minutes for access tokens |
| Issuer check | `iss` MUST match configured IdP URL exactly |
| Audience check | `aud` MUST match `"platform-api"` |
| Tenant claim injection | Extract `tenant_id` → set `SET app.current_tenant_id = :tenant_id` on DB session |
| `jti` revocation | Check token ID against Redis revocation set (TTL = original exp) |
| Role scope enforcement | Downstream services validate `scopes` array before executing operations |

### 3.3 Authorization Model

**RBAC + ABAC Hybrid:**

The platform uses Role-Based Access Control (RBAC) for coarse-grained permissions and Attribute-Based Access Control (ABAC) for fine-grained resource-level decisions.

| Layer | Model | Implementation |
|:------|:------|:---------------|
| API Route | RBAC | Middleware checks `role` claim: `super_admin > tenant_owner > tenant_admin > member > viewer` |
| Operation | Scope-based | Middleware checks `scopes` array against required scope for operation |
| Data Row | ABAC (via RLS) | PostgreSQL RLS policies enforce `tenant_id` + optionally `owner_user_id` |
| AI Operation | Quota-based | Token Guard validates remaining quota before allowing inference |

**Role Hierarchy:**
```
super_admin (platform_operator)
    └── tenant_owner
            └── tenant_admin
                    └── member
                            └── viewer
```

---

## 4. Database Security Specification

### 4.1 Row-Level Security (RLS) — Master Policy

All tables containing tenant-owned data MUST implement RLS. The following is the canonical pattern:

```sql
-- Step 1: Enable RLS on the table
ALTER TABLE marketplace.listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace.listings FORCE ROW LEVEL SECURITY;  -- Also applies to table owners

-- Step 2: Deny-by-default (no policy = no access)
CREATE POLICY "deny_all_default" ON marketplace.listings
    AS RESTRICTIVE FOR ALL USING (false);

-- Step 3: Tenant isolation policy (applied to tenant API role)
CREATE POLICY "tenant_isolation" ON marketplace.listings
    AS PERMISSIVE FOR ALL
    TO platform_api_role
    USING (
        tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    );

-- Step 4: Super admin bypass policy (only for explicitly marked admin operations)
CREATE POLICY "superadmin_access" ON marketplace.listings
    AS PERMISSIVE FOR SELECT
    TO platform_admin_role
    USING (true);  -- Super admin can read all; writes still require tenant context
```

**RLS Verification Contract**: An automated test suite MUST run on every pull request that:
1. Creates two tenants (Tenant A, Tenant B).
2. Creates listings for each.
3. Authenticates as Tenant A and verifies Tenant B's listings are NOT returned.
4. Attempts to directly SET `app.current_tenant_id` to Tenant B's ID using Tenant A's role and verifies the operation is rejected.

### 4.2 Database Role Separation

| Role | Permissions | Used By |
|:-----|:------------|:--------|
| `platform_api_role` | DML (SELECT, INSERT, UPDATE, DELETE) on owned schemas; subject to all RLS policies | Application services |
| `platform_migrations_role` | DDL (CREATE, ALTER, DROP); bypasses RLS | Flyway/Liquibase migration runner (CI/CD only) |
| `platform_read_role` | SELECT only; subject to RLS | Analytics read-replicas, BI connectors |
| `platform_admin_role` | DML with RLS bypass for SELECT; requires MPA approval | Super Admin operations |
| `platform_replication_role` | Streaming replication slot; no data access | Kafka Debezium CDC connector |

### 4.3 pgvector Tenant Isolation

Vector search queries MUST include the tenant filter to prevent embedding leakage across tenants. The filter is enforced both at the application level AND via RLS:

```sql
-- Correct: tenant_id filter is part of the vector search
SELECT listing_id, title, (embedding <=> :query_vector) AS distance
FROM marketplace.listings
WHERE tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
  AND status = 'ACTIVE'
ORDER BY embedding <=> :query_vector
LIMIT 25;

-- This query automatically enforces RLS AND the application-level filter
-- as a double-isolation guarantee
```

---

## 5. Network & Transport Security

### 5.1 TLS Configuration

| Connection Type | Minimum TLS | Cipher Suites | Certificate Authority |
|:----------------|:------------|:--------------|:----------------------|
| External clients → API Gateway | TLS 1.3 | TLS_AES_256_GCM_SHA384, TLS_CHACHA20_POLY1305_SHA256 | Public CA (Let's Encrypt / DigiCert) |
| API Gateway → Microservices | TLS 1.2+ | Strong ciphers only | Internal CA (private PKI) |
| Service → PostgreSQL | TLS 1.2+ (verified) | Strong ciphers | Internal CA |
| Service → Redis | TLS 1.2+ | Strong ciphers | Internal CA |
| Service → Kafka | TLS 1.2+ | SASL/SSL | Internal CA |
| Supabase Realtime → Clients | TLS 1.3 | Same as external | Public CA |

**HTTP Strict Transport Security (HSTS):**
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

### 5.2 Web Application Firewall (WAF) Rules

| Rule Category | Action | Notes |
|:--------------|:-------|:-------|
| OWASP Core Rule Set 3.3 | Block | SQL injection, XSS, path traversal, command injection |
| Rate limiting (general) | Challenge | > 300 req/min per IP |
| Rate limiting (auth endpoints) | Block | > 10 req/min per IP to `/auth/*` |
| Bot detection | Challenge (CAPTCHA) | Headless browser signatures, unusual User-Agents |
| Geo-blocking | Block (configurable) | Block IPs from OFAC-sanctioned countries |
| IP reputation | Block | Known malicious ASNs, Tor exit nodes (configurable) |
| Large payload | Block | Request body > 10MB (except media upload endpoints) |
| Encoding anomalies | Block | Double URL encoding, null bytes, Unicode normalisation attacks |

### 5.3 API Security Headers

All API responses MUST include:

```
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cache-Control: no-store  (for authenticated endpoints)
X-Request-ID: {correlation_id}
```

---

## 6. API Security Specification

### 6.1 API Rate Limiting Tiers

| Client Type | Limit | Window | Burst | Enforcement |
|:------------|:------|:-------|:------|:------------|
| Anonymous (IP) | 60 req | 1 minute | 10 | Redis sliding window |
| Authenticated User | 600 req | 1 minute | 60 | Redis sliding window, keyed by `user_id` |
| Tenant API Key (Starter) | 1,000 req | 1 minute | 100 | Redis, keyed by `api_key_id` |
| Tenant API Key (Growth) | 5,000 req | 1 minute | 500 | Redis, keyed by `api_key_id` |
| Tenant API Key (Enterprise) | 20,000 req | 1 minute | 2,000 | Redis, keyed by `api_key_id` |
| Internal Service (mTLS) | Unlimited (monitored) | — | — | No rate limit; anomaly detection only |

**Rate Limit Response:**
```
HTTP 429 Too Many Requests
Headers:
  X-RateLimit-Limit: 600
  X-RateLimit-Remaining: 0
  X-RateLimit-Reset: 1717024000  (Unix epoch of reset)
  Retry-After: 45
Body: { "error": "RATE_LIMIT_EXCEEDED", "retry_after_seconds": 45 }
```

### 6.2 Input Validation Rules

All API inputs MUST be validated against strict schemas before processing:

| Validation Type | Implementation | Example |
|:----------------|:---------------|:--------|
| Type coercion | Zod (TypeScript) / Pydantic (Python) | String where integer expected → 422 |
| Maximum lengths | Schema constraints | Title: max 255 chars; Description: max 10,000 chars |
| UUID format | Regex validation | `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$` |
| URL format | URL parser + allowlist | Only `https://` scheme allowed in external URLs |
| Injection characters | Context-aware escaping | SQL: parameterized queries; HTML: sanitize-html; Shell: forbidden |
| File type validation | MIME type + magic bytes check | Image uploads: only PNG/JPEG/WebP; max 10MB |
| Numeric ranges | Min/max constraints | Price: 0.01 to 1,000,000,000 |

### 6.3 CORS Configuration

| Request Origin | Allowed | Allowed Methods | Credentials |
|:---------------|:--------|:----------------|:------------|
| `https://*.platform.io` | Yes | GET, POST, PUT, PATCH, DELETE | Yes |
| `https://localhost:*` | Yes (dev/staging only) | All | Yes |
| Tenant custom domains (allowlisted) | Yes | GET, POST | Yes |
| All others | No | — | — |

Preflight OPTIONS requests are cached for 600 seconds.

---

## 7. AI-Specific Security Controls

### 7.1 Prompt Injection Defense Pipeline

Every user-supplied input that will be interpolated into an LLM prompt MUST pass through this pipeline:

```
USER INPUT
    │
    ▼
[1] STRIP CONTROL CHARACTERS
    - Remove null bytes, zero-width characters, RTL override characters
    - Normalize Unicode to NFC form
    │
    ▼
[2] LENGTH ENFORCEMENT
    - Enforce max token limit BEFORE interpolation
    - Reject inputs exceeding 4,000 tokens for standard operations
    │
    ▼
[3] STRUCTURAL DELIMITER WRAPPING
    - Wrap input in XML-style structural delimiters:
      <user_content>
        {sanitized_user_input}
      </user_content>
    - System instructions use a DIFFERENT delimiter set: <system_instructions>
    │
    ▼
[4] PRE-FLIGHT INJECTION CLASSIFIER
    - Fast, locally-hosted classifier (ONNX model)
    - Runs in < 50ms; checks for injection signatures:
      "ignore previous instructions", "you are now", "DAN mode",
      "pretend you are", prompt-end sequence injection attempts
    - Risk score > 0.7 → REJECT immediately (log + alert)
    │
    ▼
[5] LLM INFERENCE
    │
    ▼
[6] OUTPUT VALIDATION
    - DLP scanner checks output for PII patterns
    - Length validation (unexpected token explosions)
    - JSON schema validation for structured outputs
    - Inject refusal if output contains platform-internal keywords
```

### 7.2 PII Redaction Proxy

Before any user-submitted text is sent to external LLM providers, a PII redaction proxy processes the content:

| PII Type | Detection Method | Action |
|:---------|:-----------------|:-------|
| Email addresses | Regex | Replace with `[EMAIL_REDACTED]` |
| Phone numbers | NLP entity detection + Regex | Replace with `[PHONE_REDACTED]` |
| Social Security Numbers | Pattern regex | Replace with `[SSN_REDACTED]` |
| Credit card numbers | Luhn algorithm + regex | Replace with `[CC_REDACTED]` |
| Physical addresses | NLP entity detection | Replace with `[ADDRESS_REDACTED]` |
| Names (in high-risk contexts) | NLP NER (Person entity) | Conditional replacement in high-risk operations |

Redacted tokens are stored in a session-local map; if the LLM output contains a redacted token placeholder, it is NOT de-anonymized in the response.

### 7.3 Output Data Loss Prevention (DLP)

LLM output completions are scanned before delivery to clients:

| Pattern Category | Detection | Action |
|:-----------------|:----------|:-------|
| SSN / Tax IDs | Regex | Block response; log DLP violation |
| Credit card numbers | Luhn + regex | Block response |
| Internal service URLs | Allowlist check | Replace with `[REDACTED_URL]` |
| Database connection strings | Regex (`postgres://`, `redis://`) | Block response |
| JWT tokens | `eyJ` prefix detection | Block response |
| Internal IP ranges | RFC 1918 regex | Replace with `[REDACTED_IP]` |

---

## 8. Secrets Management Architecture

### 8.1 Secret Storage Hierarchy

```
Level 1: Runtime Secret Injection (HIGHEST SECURITY)
  - HashiCorp Vault (enterprise) / AWS Secrets Manager
  - Secrets are NEVER in code, environment files, or container images
  - Secrets are fetched at application startup via Vault Agent Sidecar
  - Access controlled by Kubernetes ServiceAccount + Vault policies

Level 2: Kubernetes Secrets (for non-sensitive config)
  - Base64-encoded (NOT encrypted by default — encrypt etcd at rest)
  - Used only for non-sensitive configuration values

Level 3: Build-time injection (FORBIDDEN for secrets)
  - Build arguments, Dockerfile ENV, .env files
  - STRICTLY FORBIDDEN for any credentials
```

### 8.2 Secret Rotation Policy

| Secret Type | Rotation Frequency | Automation |
|:------------|:------------------|:-----------|
| Database passwords | Every 30 days | Automated (Vault dynamic secrets) |
| Redis auth tokens | Every 30 days | Automated |
| LLM API keys | Every 90 days | Manual (with automated reminder) |
| Stripe API keys | Every 90 days | Manual |
| JWT signing keys (JWKS) | Every 365 days (with 30-day overlap) | Semi-automated (canary rollout) |
| Internal service certificates | 90-day cert TTL | Automated (cert-manager) |
| CI/CD tokens | Every 90 days | Automated |

---

## 9. Compliance & Audit Architecture

### 9.1 Immutable Audit Log Specification

All sensitive platform operations are recorded in `governance.audit_logs`. This table is append-only — no UPDATE or DELETE is permitted by any role.

**Table Definition:**
```sql
CREATE TABLE governance.audit_logs (
    id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id        UUID NOT NULL,          -- User or Service performing action
    actor_type      TEXT NOT NULL,          -- 'USER' | 'SERVICE' | 'SYSTEM'
    tenant_id       UUID,                   -- NULL for platform-level actions
    action_category TEXT NOT NULL,          -- 'AUTH' | 'TENANT' | 'BILLING' | 'TRUST' | 'DATA'
    action_type     TEXT NOT NULL,          -- Specific action (e.g. 'listing.quarantined')
    target_entity   TEXT,                   -- Entity type affected
    target_id       UUID,                   -- Entity ID affected
    before_state    JSONB,                  -- State before change (sensitive fields masked)
    after_state     JSONB,                  -- State after change (sensitive fields masked)
    ip_hash         TEXT,                   -- Hashed IP address
    user_agent      TEXT,                   -- Browser/client identifier
    trace_id        TEXT,                   -- OTel trace ID for correlation
    metadata        JSONB                   -- Additional context
);

-- Enforce append-only via trigger
CREATE RULE no_update_audit AS ON UPDATE TO governance.audit_logs DO INSTEAD NOTHING;
CREATE RULE no_delete_audit AS ON DELETE TO governance.audit_logs DO INSTEAD NOTHING;

-- Partition for performance at scale
-- Monthly partitioning recommended when volume exceeds 100M rows
```

### 9.2 Compliance Framework Readiness

| Framework | Status | Key Controls |
|:----------|:-------|:-------------|
| **GDPR** (EU) | Design-ready | Data minimization, consent gates, right to deletion pipeline, DPA documentation |
| **CCPA** (California) | Design-ready | Data disclosure endpoint, opt-out mechanisms, data sale prohibition |
| **SOC 2 Type II** | Architecture-ready | Audit logs, access controls, availability SLOs, change management |
| **PCI DSS** (if payments direct) | Scoped out | Stripe-hosted payment flow (no card data touches platform) |
| **ISO 27001** | Architecture-aligned | Risk register, access control policy, incident response procedures |

### 9.3 Data Classification Matrix

| Classification | Examples | Storage | Access | Encryption |
|:---------------|:---------|:--------|:-------|:-----------|
| **TOP SECRET** | JWT signing keys, root CA private keys | Vault only | 2-person rule | AES-256 + HSM |
| **SECRET** | API keys, DB passwords, service certs | Vault | Service identity only | AES-256 |
| **CONFIDENTIAL** | PII, billing data, user content | Encrypted DB | RLS + role-based | AES-256 at rest |
| **INTERNAL** | Business logic, config values | DB / S3 | Role-based | AES-256 at rest |
| **PUBLIC** | Listing titles, public categories | DB / CDN | No restriction | TLS in transit |

---

## 10. CI/CD & Infrastructure Security

### 10.1 Vulnerability Scanning Pipeline

Every pull request triggers:

```
PR OPENED
    │
    ▼
[1] SAST (Static Application Security Testing)
    Tool: Semgrep with OWASP rulesets
    Blocks PR if: HIGH or CRITICAL severity finding
    │
    ▼
[2] SCA (Software Composition Analysis)
    Tool: Dependabot + Snyk
    Blocks PR if: Known CVE with CVSS >= 7.0 in any dependency
    │
    ▼
[3] SECRET SCANNING
    Tool: GitGuardian / GitHub Secret Scanning
    Blocks PR if: Any credential pattern detected
    │
    ▼
[4] CONTAINER SCANNING
    Tool: Trivy
    Blocks PR if: CRITICAL CVE in base image or installed packages
    │
    ▼
[5] IaC SCANNING (Terraform/Pulumi)
    Tool: Checkov / tfsec
    Blocks PR if: Security misconfiguration (e.g., public S3 bucket, unrestricted security group)
    │
    ▼
[6] RLS REGRESSION TEST
    Tool: Custom test suite (pg_tap)
    Blocks PR if: Any cross-tenant leakage detected
```

### 10.2 Penetration Testing Schedule

| Scope | Frequency | Provider | Methodology |
|:------|:----------|:---------|:------------|
| Full platform external pentest | Annual | Third-party (Big 4 / specialist) | PTES + OWASP WSTG |
| API security assessment | Semi-annual | Internal Red Team | OWASP API Security Top 10 |
| AI/LLM security assessment | Semi-annual | AI security specialist | OWASP LLM Top 10 |
| Multi-tenant isolation verification | Quarterly | Internal Security | Custom cross-tenant test suite |
| Infrastructure pentest | Annual | Third-party | NIST SP 800-115 |

### 10.3 Least Privilege Access Model

| Access Type | Approval Required | Duration | Review Frequency |
|:------------|:-----------------|:---------|:-----------------|
| Production DB (read) | Manager approval | 8 hours (JIT) | Per request |
| Production DB (write) | Director + Security approval | 2 hours (JIT) | Per request |
| Super Admin panel | Director approval | Session-bound | Per session |
| Vault secret reveal | 2-person approval (MPA) | One-time | Per request |
| Cloud console access | Manager approval | 8 hours | Per request |
| CI/CD secret modification | Director approval | — | Per change |
