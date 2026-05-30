# 3. AUTHENTICATION ARCHITECTURE

> **Status**: Approved
> **Target Audience**: Security Engineers, Backend Engineers
> **Domain**: Identity & Access Management

## 1. Authentication Strategy
The platform utilizes Supabase GoTrue as the primary Identity Provider (IdP). Authentication is completely decoupled from Authorization (RBAC). GoTrue validates "Who are you?" and issues a cryptographically signed JWT. Postgres RLS and Edge Functions consume this JWT to answer "What can you do?".

## 2. Core Entities

### `auth.users` (Supabase Managed)
- The absolute source of truth for identity, email, phone, and password hashes.
- Never exposed directly to the public schema.

### `identity.profiles`
- Extended metadata (first name, last name, avatar URL, preferences).
- Linked 1:1 with `auth.users(id)` via Foreign Key and Postgres Trigger on user creation.

### `tenant.organizations` (Tenants)
- The logical boundary for a company/workspace.

### `tenant.memberships`
- Maps `auth.users` to `tenant.organizations`.
- Contains the `role` for that specific tenant (e.g., Alice is ADMIN in Org A, but VIEWER in Org B).

## 3. Supported Authentication Flows
- **Magic Links (Passwordless)**: Primary B2B login flow. High conversion, low friction.
- **OAuth (SSO)**: Google Workspace and Microsoft Entra ID support for Enterprise tenants.
- **Email/Password**: Legacy fallback.
- **MFA (Multi-Factor Authentication)**: Enforced via Supabase GoTrue App Authenticator (TOTP) for all users holding `TENANT_ADMIN` or `SUPER_ADMIN` roles.

## 4. Organization Onboarding Flow
1. **Signup**: User authenticates via OAuth/Magic Link.
2. **Profile Creation**: Postgres Trigger creates `identity.profiles`.
3. **Workspace Prompt**: Next.js detects no active memberships and redirects to `/onboarding`.
4. **Tenant Creation**: User provides company name. Edge Function creates `tenant.organizations` and provisions default limits.
5. **Membership Mapping**: Edge Function creates `tenant.memberships` assigning the user as `TENANT_OWNER`.
6. **JWT Refresh**: Client forces a token refresh to inject the new `tenant_id` claim into the user's active session.

## 5. Tenant Assignment Flow & Custom Claims
To ensure ultra-low latency, RLS policies must not perform complex JOINs on every query. Therefore, the active `tenant_id` and `role` must be injected directly into the JWT.

**Mechanism**:
- Supabase Auth Hooks (Custom Access Tokens).
- Before JWT signing, an Edge Function queries `tenant.memberships`.
- The JWT payload is modified to include:
  ```json
  {
    "app_metadata": {
      "active_tenant_id": "uuid-1234",
      "tenant_role": "TENANT_ADMIN",
      "permissions": ["listings:write", "billing:read"]
    }
  }
  ```
- RLS policies use `auth.jwt() -> 'app_metadata' ->> 'active_tenant_id'`.

## 6. Service Accounts & AI Service Accounts
Machine-to-Machine (M2M) communication requires authentication without human intervention.
- **Implementation**: Service Accounts are created as distinct records in `auth.users` with a specific `is_service_account = true` flag.
- **Authentication**: Authenticate via long-lived JWTs (or Edge Function signed tokens) stored securely in Vault.
- **AI Service Accounts**: Dedicated accounts representing background AI Agents (e.g., "Moderation Bot"). They have restricted scopes allowing them to read listings and write to the moderation queue, but zero access to billing.

## 7. Invitations
- **Table**: `tenant.invitations` (email, tenant_id, role, token, expires_at).
- **Flow**: User inputs email -> Edge Function generates secure token -> Sends email -> Recipient clicks link -> Authenticates -> Edge Function consumes token and creates `tenant.memberships` record.
