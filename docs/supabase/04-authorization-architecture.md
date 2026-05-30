# 4. AUTHORIZATION ARCHITECTURE

> **Status**: Approved
> **Target Audience**: Security Engineers, Backend Engineers
> **Domain**: Identity & Access Management

## 1. Authorization Strategy
Authorization is handled via Role-Based Access Control (RBAC) mapped through the active JWT. Roles are hierarchical and strictly scoped either to the Global Platform or to a specific Tenant.

## 2. Core Roles

### Platform Level Roles
- **`SUPER_ADMIN`**: "God Mode". Total access to all tenant data, global configurations, billing overrides, and system destruct switches. Mapped explicitly in a `governance.super_admins` table to prevent accidental escalation.
- **`PLATFORM_ADMIN`**: High-level support and governance. Can view all data, suspend users, and handle moderation appeals. Cannot access billing ledgers or delete tenants.
- **`SUPPORT`**: Read-only impersonation and troubleshooting. Cannot mutate tenant data.

### Tenant Level Roles
- **`TENANT_OWNER`**: Complete control over the tenant workspace. Can delete the workspace, change billing plans, and manage API keys.
- **`TENANT_ADMIN`**: Can invite users, manage integrations, and edit all listings/leads. Cannot access billing or delete the workspace.
- **`EDITOR`**: Can create, update, and archive listings. Can respond to leads. Cannot manage users.
- **`MODERATOR`**: Restricted to reading listings and applying tags/status updates.
- **`ANALYST`**: Read-only access to the analytics and reporting dashboards.

### Service Roles
- **`AGENT`**: Standard backend microservice access (e.g., event mesh consumer).
- **`AI_OPERATOR`**: Specifically scoped to background AI tasks (e.g., embedding generation, auto-moderation scripts).

## 3. Permission Scope Matrix

| Scope / Feature | TENANT_OWNER | TENANT_ADMIN | EDITOR | ANALYST |
| :--- | :--- | :--- | :--- | :--- |
| **Workspace Settings** | Full Access | Read-Only | Denied | Denied |
| **Billing & Plans** | Full Access | Denied | Denied | Denied |
| **User Management** | Full Access | Full Access | Denied | Denied |
| **Listings (CRUD)** | Full Access | Full Access | Full Access | Read-Only |
| **Leads & CRM** | Full Access | Full Access | Full Access | Read-Only |
| **Analytics** | Full Access | Full Access | Read-Only | Read-Only |

## 4. Isolation Matrix

- **Global Isolation**: A user with `TENANT_OWNER` role on Tenant A has exactly zero access to Tenant B.
- **Context Switching**: To switch organizations, the frontend client requests a new JWT by hitting a specific Supabase Edge Function that issues a token with the newly requested `active_tenant_id`, assuming the user possesses a valid `tenant.memberships` record for Tenant B.

## 5. RLS Application of Roles
To optimize Postgres performance, policies should check the custom JWT claims rather than performing JOINs against the memberships table.

**Example Implementation**:
```sql
CREATE POLICY "Tenant Admins can update listings" ON marketplace.listings
FOR UPDATE
USING (
  tenant_id = (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'active_tenant_id')::uuid
  AND 
  (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'tenant_role') IN ('TENANT_OWNER', 'TENANT_ADMIN', 'EDITOR')
);
```
