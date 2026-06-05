# 👑 PLATFORM ROLES & ACCESS CONTROL CONSTITUTION (ROLES)

> **Document Status**: Canonical Reference / Core Security Architecture  
> **Applicability**: Next.js App Router, Kotlin Backend Core, Supabase Postgres, RLS & JWT Claims  
> **Version**: v1.0.0-Enterprise  

---

## 🏛️ 1. ARCHITECTURAL OVERVIEW

Access control in the **AI-Native Multi-Tenant Marketplace Operating System** is governed by a **Three-Tier Security Architecture** which integrates:
1. **RBAC (Role-Based Access Control)**: Coarse-grained access mapping users to roles (e.g. `Super Admin`, `Tenant Admin`) for routine UI and API navigation.
2. **ABAC (Attribute-Based Access Control)**: Fine-grained constraints utilizing runtime session variables, IP addresses, geographical attributes, or time ranges to govern access dynamically.
3. **PBAC (Policy-Based Access Control)**: Enterprise-grade rules defined as code (Open Policy Agent) to audit compliance and enforce "Break-Glass" configurations.

```
       ┌────────────────────────────────────────────────────────┐
       │                 JWT EDGE CLAIMS RESOLVER               │
       │   Decrypts custom claims: tenant_id, role, scopes      │
       └───────────────────────────┬────────────────────────────┘
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                DATABASE RLS KERNEL GUARD               │
       │   Enforces tenant isolation and role permission limits  │
       └────────────────────────────────────────────────────────┘
```

---

## 🛡️ 2. PRIMARY PLATFORM ROLES MATRIX

The platform partitions users into three distinct planes: **Super Admin Plane**, **Tenant SaaS Plane**, and **Marketplace/AI Cognitive Plane**.

| Role Key | Plane | Scope | Target MFA | Max Session | Session Key Setting |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `platform.superadmin` | Super Admin | Global (All Tenants) | Hardware (FIDO2) | 2 hours | `x-reverso-admin-role` |
| `platform.operator` | Super Admin | Read-only Operations | TOTP | 4 hours | `x-reverso-admin-role` |
| `tenant.owner` | Tenant SaaS | Tenant-wide (Full control) | TOTP | 8 hours | `app.tenant_id` + JWT Claim |
| `tenant.admin` | Tenant SaaS | Tenant-wide operations | TOTP | 8 hours | `app.tenant_id` + JWT Claim |
| `tenant.manager` | Tenant SaaS | Team-wide operations | Optional | 12 hours | `app.tenant_id` + JWT Claim |
| `tenant.member` | Tenant SaaS | Workspace features | Optional | 24 hours | `app.tenant_id` + JWT Claim |
| `tenant.contractor` | Tenant SaaS | Scoped / Time-bound | Optional | Variable | `app.tenant_id` + Expiry Claim |
| `tenant.viewer` | Tenant SaaS | Read-only workspace | Optional | 24 hours | `app.tenant_id` + JWT Claim |
| `marketplace.agent` | AI Cognitive | Vector Operations / Actions | None | Infinite | System Session token |
| `marketplace.guest` | Public | Unauthenticated read | None | N/A | Public access |

---

## 📂 3. DETAILED ROLE DEFINITIONS

### 3.1 Global / Super Administrator (`platform.superadmin`)
* **Scope**: Complete read/write access to global databases, infrastructure configurations, and tenant catalogs.
* **MFA Requirement**: Hardware security keys (YubiKey / WebAuthn FIDO2) are strictly mandatory.
* **Destructive Escalation**: Destructive operations (such as manual tenant deletion) require double-signature approval from both CISO and CTO.
* **Audit Target**: Absolute full audit capture. No action can bypass logging.

### 3.2 Tenant Owner (`tenant.owner`)
* **Scope**: Bounded strictly to a single `tenant_id`. Full capability to manage billing subscriptions, configure custom domains, invite/revoke admins, and delete workspace resources.
* **Ownership mapping**: Defined in `tenant_config.tenant_members` table with `role = 'owner'`.
* **Billing Control**: The only role authorized to change credit card profiles or execute Stripe account handoffs.

### 3.3 Tenant Administrator (`tenant.admin`)
* **Scope**: Dynamic operational control over the tenant workspace. Can invite team members, adjust AI parameters, edit/moderate marketplace listings, and review performance metrics.
* **Restrictions**: Cannot perform domain mapping edits, update payment credentials, or view core billing ledger entries.

### 3.4 Team Manager (`tenant.manager`)
* **Scope**: Scope is restricted to delegated projects, branches, or team workspaces.
* **Permissions**: Add members to specific teams, update listing attributes, read usage analytics.
* **Restrictions**: Cannot adjust organization settings or change member roles above `member`.

### 3.5 Employee / Member (`tenant.member`)
* **Scope**: Standard operational role. Can execute models, upload listings to the draft queue, and interact with leads.
* **Restrictions**: Cannot perform team administration or modify security constraints.

### 3.6 Scoped Contractor (`tenant.contractor`)
* **Scope**: Restricted to specific listings or projects.
* **Lifespan**: Strictly limited by a programmatic `access_expires_at` timestamp.
* **Audit**: Full keystroke-level action tracking.

### 3.7 Scoped Guest (`tenant.guest`)
* **Scope**: Read-only, comment-only privileges scoped to shared directories or client-facing listings.

---

## 🔒 4. DATABASE SEGREGATION & ROLE SECURITY (RLS)

All database operations enforce **Row-Level Security (RLS)** in PostgreSQL. System-level schemas (`tenant_config`, `marketplace`, `ai_ops`, `governance`) must deny direct cross-tenant access.

### 4.1 Schema Organization & Ownership
* `tenant_config`: Meta-data configurations, tenant lists, and subscription mappings.
* `marketplace`: Business core databases (listings, companies, leads).
* `ai_ops`: Cognitive models, vector caches, and token utilization logs.
* `governance`: Security state, immutable audit trails, and policy constraints.

### 4.2 Core Tenant Scoping Function
Every SQL connection session initializes the active tenant context using:
```sql
CREATE OR REPLACE FUNCTION public.tenant_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::UUID;
$$ LANGUAGE SQL STABLE;
```

### 4.3 Database RLS Policies Mapping

#### listings Table Policies
```sql
-- Enable RLS
ALTER TABLE marketplace.listings ENABLE ROW LEVEL SECURITY;

-- Select Policy (Tenants see own, public sees PUBLISHED)
CREATE POLICY "listings_tenant_isolation_select" ON marketplace.listings
    FOR SELECT USING (tenant_id = public.tenant_id() OR status = 'PUBLISHED');

-- Mutation Policy (Only same-tenant admins/owners/members)
CREATE POLICY "listings_tenant_isolation_all" ON marketplace.listings
    FOR ALL USING (tenant_id = public.tenant_id());
```

#### tenant_members Table Policies
```sql
ALTER TABLE tenant_config.tenant_members ENABLE ROW LEVEL SECURITY;

-- Read member records
CREATE POLICY "tenant_members_read" ON tenant_config.tenant_members
    FOR SELECT USING (auth.uid() = user_id OR tenant_id = public.tenant_id());
```

#### audit_logs Table Policies
```sql
ALTER TABLE governance.audit_logs ENABLE ROW LEVEL SECURITY;

-- Append-only. No UPDATE/DELETE permitted for any role.
CREATE POLICY "audit_logs_tenant_isolation" ON governance.audit_logs
    FOR SELECT USING (tenant_id = public.tenant_id());
```

---

## 🔑 5. JWT CLAIMS & EDGE COMPLIANCE

Edge gateways inspect incoming authorizations and inject custom cryptographic claims into headers:

```json
{
  "iss": "supabase-auth",
  "sub": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "role": "authenticated",
  "user_metadata": {
    "tenant_claims": {
      "tenant_id": "7b9dcb3d-4bad-3b7d-9bdd-2b0d7b3dcb6d",
      "role": "tenant.admin",
      "scopes": ["listings:write", "analytics:read", "team:invite"]
    }
  }
}
```

---

## 📈 6. BREAK-GLASS EMERGENCY ACCESS PROTOCOL

For operational failures or compliance breaches, the platform provides a **Break-Glass Emergency Protocol**:
1. **Request Execution**: Authorized engineers trigger `POST /api/v1/admin/emergency-access` providing a clear justification.
2. **Dual-Approval Logic**: Access remains locked until verified by two designated operators (e.g. CISO and CEO).
3. **Session Hard Limit**: Emergency tokens are issued with a hard 8-hour expiration.
4. **Audit Enforcement**: The session triggers absolute full-trace captures, auto-generated reports, and broadcasts real-time security alerts directly to the operations Slack channel.
