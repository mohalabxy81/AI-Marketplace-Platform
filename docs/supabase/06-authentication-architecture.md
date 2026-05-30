# 6. AUTHENTICATION ARCHITECTURE

> **Status**: Approved
> **Target Audience**: Security Engineers, Frontend Engineers
> **Document Class**: Official Backend Constitution
> **System Context**: AI-Native Multi-Tenant Marketplace Operating System

---

## 1. Identity Provider Overview

The platform uses **Supabase GoTrue** as the sole Identity Provider (IdP). GoTrue is a Go-based API managing users, passwords, OAuth tokens, and Magic Links. It tightly integrates with PostgreSQL, managing the core `auth.users` schema.

### 1.1 Supported Authentication Vectors

| Vector | Target User Base | Rationale |
|:---|:---|:---|
| **Magic Links (Passwordless)** | B2B Sellers, B2C Buyers | Lowest friction, highest conversion. Eliminates password reuse vulnerabilities. |
| **Google/GitHub OAuth** | Developers, Creators | 1-click onboarding for tech-savvy personas. |
| **SSO (SAML/OIDC)** | Enterprise Tenants | Required for Enterprise plan compliance. Routes via WorkOS/Supabase SSO. |
| **Email + Password** | Traditional users | Maintained for legacy compatibility, but deprecated as the primary CTA. |

---

## 2. The Multi-Tenant Auth Flow

Because GoTrue itself is inherently single-tenant (a user exists globally across the Supabase project), we must implement a **Custom JWT Injection Pipeline** to achieve logical multi-tenancy.

### 2.1 The Authentication Lifecycle

1. **Login**: User clicks Magic Link. GoTrue validates the token and issues a Session (Access Token + Refresh Token).
2. **Context Selection**: The Next.js frontend checks if the user belongs to multiple tenants (querying `identity.tenant_members`).
3. **Workspace Activation**: The user selects a workspace (e.g., "Acme Corp").
4. **JWT Minting (The Hook)**: Next.js calls a custom Supabase Edge Function: `POST /functions/v1/auth-context`.
5. **Context Validation**: The Edge Function verifies the user's membership in the requested tenant.
6. **JWT Customization**: The Edge Function updates the `app_metadata` of the user's auth record to inject `tenant_id` and `role`.
7. **Session Refresh**: Next.js forces a session refresh (`supabase.auth.refreshSession()`), receiving a new JWT containing the active tenant context.

### 2.2 Auth Hook Implementation (Edge Function)

```typescript
// Edge Function: /functions/v1/auth-context
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  // 1. Validate the current JWT
  const authHeader = req.headers.get('Authorization')
  // ... verify token ...

  const { target_tenant_id } = await req.json()
  const user_id = decodedToken.sub

  // 2. Use Service Role to query identity.tenant_members
  const supabaseAdmin = createClient(URL, SERVICE_KEY)
  const { data: membership } = await supabaseAdmin
    .from('tenant_members')
    .select('role')
    .eq('user_id', user_id)
    .eq('tenant_id', target_tenant_id)
    .single()

  if (!membership) return new Response('Unauthorized', { status: 403 })

  // 3. Inject context into app_metadata
  await supabaseAdmin.auth.admin.updateUserById(user_id, {
    app_metadata: {
      tenant_id: target_tenant_id,
      role: membership.role
    }
  })

  return new Response('Context Updated', { status: 200 })
})
```

---

## 3. Session & Security Policies

### 3.1 Token Lifecycles
- **Access Token (JWT)**: Expires in 15 minutes. Minimizes the window if a token is exfiltrated.
- **Refresh Token**: Valid for 30 days. Automatically rotated upon use (Refresh Token Rotation enabled).
- **MFA Requirement**: Any user possessing an `owner` or `admin` role within a tenant must have Multi-Factor Authentication (TOTP) enabled to access the dashboard.

### 3.2 Device & IP Tracking
Every login event is logged to `auth.audit_log_entries`. The platform extracts IP addresses and User-Agents to populate `identity.active_sessions`. If a user logs in from a high-risk IP or impossible travel distance, the session is flagged in the `trust.fraud_alerts` table.

---

## 4. API Keys & Service Authentication

Not all traffic comes from browsers. Tenants may generate API keys to programmatically interact with their marketplace (e.g., syncing inventory via an ERP).

### 4.1 Tenant API Keys
1. Generated in the tenant dashboard.
2. Stored securely via pg_crypto hashing.
3. Passed as `Bearer <tenant_api_key>` to the Next.js API route.
4. The API route validates the key, assumes the identity of a "Service Account User" mapped to that tenant, and issues a standard Supabase query using that service account's JWT.

This ensures that API-driven operations are subjected to the exact same RLS policies as user-driven operations.
