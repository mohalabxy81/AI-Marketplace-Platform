# Security Report

## Security Posture Overview
The Agent Platform operates under a zero-trust model. Agents are treated as distinct entities with scoped permissions, ensuring that compromised or rogue agent behavior cannot compromise tenant data or platform integrity.

## Key Security Implementations

### 1. Row Level Security (RLS)
- **Strict Isolation**: All tables in the `agents` schema have RLS enabled.
- **Tenant Enforcement**: Data is strictly isolated by `company_id`. Functions enforce `company_id` comparisons explicitly.
- **Platform Exceptions**: Super admins (`is_super_admin()`) and internal platform functions bypass RLS where structurally necessary, but these pathways are heavily guarded.

### 2. Role-Based Access Control (RBAC)
- **Granular Scopes**: Agents are assigned specific operational scopes via `agent_scopes` and `agent_identities`.
- **Least Privilege**: Agents only have access to the specific context and tables required for their immediate tasks.

### 3. Function Security
- **Search Path Hardening**: All newly created PL/pgSQL and SQL functions utilize `SET search_path = ''` to prevent mutable search path vulnerabilities (e.g., search path hijacking).
- **Security Definer**: High-privilege functions operate with `SECURITY DEFINER` and are explicitly locked down to prevent unauthorized execution.

### 4. Audit Logging
- **Immutable Ledger**: Every CUD (Create, Update, Delete) operation in the `agents` schema writes an immutable record to `public.audit_logs`, complete with `OLD` and `NEW` JSONB payloads.

## Remaining Considerations
- The public bucket (`avatars`) continues to allow public reads, which is expected for UI rendering but should be monitored.
- Future API routes interacting with these database primitives must ensure robust JWT validation.
