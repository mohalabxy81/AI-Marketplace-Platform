# 5. RLS MASTER ARCHITECTURE

> **Status**: Approved
> **Target Audience**: Database Architects, Security Engineers
> **Domain**: Security & Isolation

## 1. Executive Summary
Row-Level Security (RLS) is the absolute foundation of the platform's multi-tenant isolation. All application logic must assume that the database will reject unauthorized queries. We employ a "Deny-by-Default" posture across all schemas (except `public` enums).

## 2. Universal RLS Principles
1. **Tenant ID Primacy**: Every table in the system (except global governance tables) must have a `tenant_id` column.
2. **JWT Injection**: `tenant_id` is derived from `request.jwt.claims`. Do not rely on client-provided `WHERE` clauses.
3. **No Cross-Tenant JOINs in RLS**: Policies must be simple scalar checks to prevent performance degradation.
4. **Service Role Bypass**: The `service_role` key bypasses RLS. It must be strictly reserved for backend Edge Functions executing trusted operations (e.g., Stripe Webhooks).

## 3. RLS Responsibility Matrix

### Domain: `marketplace` (Listings, Leads, Categories)
| Action | Policy Logic | Notes |
| :--- | :--- | :--- |
| **SELECT** | `status = 'PUBLISHED' OR tenant_id = jwt.tenant_id` | Public users can read published. Tenants can read all their own. |
| **INSERT** | `tenant_id = jwt.tenant_id AND role IN ('TENANT_OWNER', 'TENANT_ADMIN', 'EDITOR')` | Creation restricted by role. |
| **UPDATE** | `tenant_id = jwt.tenant_id AND role IN ('TENANT_OWNER', 'TENANT_ADMIN', 'EDITOR')` | Updates restricted by role. |
| **DELETE** | `tenant_id = jwt.tenant_id AND role IN ('TENANT_OWNER', 'TENANT_ADMIN')` | Editors cannot hard-delete. |

### Domain: `tenant_config` (Workspaces, Members)
| Action | Policy Logic | Notes |
| :--- | :--- | :--- |
| **SELECT** | `tenant_id = jwt.tenant_id` | Read your own workspace data. |
| **INSERT** | `role = 'TENANT_OWNER' OR role = 'TENANT_ADMIN'` | Inviting new members. |
| **UPDATE** | `role = 'TENANT_OWNER'` | Only Owners can rename workspace. |
| **DELETE** | `FALSE` | Soft deletes only via Edge Function. |

### Domain: `billing` (Subscriptions, Invoices)
| Action | Policy Logic | Notes |
| :--- | :--- | :--- |
| **SELECT** | `tenant_id = jwt.tenant_id AND role = 'TENANT_OWNER'` | Heavily restricted read access. |
| **INSERT** | `FALSE` | Only the Service Role (via Webhooks) can insert. |
| **UPDATE** | `FALSE` | Only the Service Role (via Webhooks) can update. |
| **DELETE** | `FALSE` | Immutable ledger. |

### Domain: `ai_ops` (Prompts, Logs)
| Action | Policy Logic | Notes |
| :--- | :--- | :--- |
| **SELECT** | `tenant_id = jwt.tenant_id` | Tenants can view their own AI logs. |
| **INSERT** | `FALSE` | Only Service Role / Edge Functions log inference. |
| **UPDATE** | `FALSE` | Immutable logs. |
| **DELETE** | `FALSE` | Immutable logs. |

### Domain: `governance` (Audit Logs, Super Admin)
| Action | Policy Logic | Notes |
| :--- | :--- | :--- |
| **SELECT** | `jwt.role = 'SUPER_ADMIN' OR jwt.role = 'PLATFORM_ADMIN'` | Strict global access. |
| **INSERT** | `FALSE` | Service Role only (append-only). |
| **UPDATE** | `FALSE` | Immutable. |
| **DELETE** | `FALSE` | Immutable. |

## 4. Admin Overrides
A helper function `is_super_admin()` should be implemented to allow global read/write access for system administrators without needing the `service_role` key.
```sql
CREATE OR REPLACE FUNCTION is_super_admin() RETURNS BOOLEAN AS $$
BEGIN
  RETURN (current_setting('request.jwt.claims', true)::jsonb -> 'app_metadata' ->> 'platform_role') = 'SUPER_ADMIN';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```
All policies that restrict `SELECT` will include `OR is_super_admin()`.

## 5. Security Validation
Before any migration goes to production, the `check_rls_enabled()` script MUST be run to verify that no tables are missing RLS enablement.
