# 5. ROW LEVEL SECURITY (RLS) ARCHITECTURE

> **Status**: Approved
> **Target Audience**: Security Engineers, Database Administrators, Backend Engineers
> **Document Class**: Official Backend Constitution
> **System Context**: AI-Native Multi-Tenant Marketplace Operating System

---

## 1. RLS Philosophy

Row Level Security (RLS) is the ultimate enforcement mechanism in this platform. Application-level checks (Next.js middleware, React component visibility) are considered **UX affordances, not security boundaries**. 

If a malicious actor bypasses the frontend and sends a raw HTTP request to the PostgREST API endpoint, RLS guarantees they cannot read or mutate data outside their authorized tenant and role scope.

### 1.1 The Deny-by-Default Law
When a table is created and RLS is enabled, PostgreSQL blocks ALL access by default. We never create a `USING (true)` policy for the `authenticated` role. Every access vector must be explicitly permitted.

---

## 2. Global Policy Patterns

### 2.1 The JWT Abstraction Function
To simplify RLS policies and reduce the risk of typos, we use an immutable helper function to extract the active `tenant_id` from the JWT.

```sql
CREATE OR REPLACE FUNCTION auth.jwt_tenant_id()
RETURNS UUID
LANGUAGE sql STABLE
AS $$
  -- Extracts tenant_id injected into the JWT app_metadata
  SELECT NULLIF(current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id', '')::uuid;
$$;
```

### 2.2 The Role Check Function
Similarly, we extract the user's role within that tenant.

```sql
CREATE OR REPLACE FUNCTION auth.jwt_tenant_role()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT current_setting('request.jwt.claims', true)::jsonb ->> 'role';
$$;
```

---

## 3. Domain-Specific RLS Policies

### 3.1 `marketplace.listings` Policies

```sql
ALTER TABLE marketplace.listings ENABLE ROW LEVEL SECURITY;

-- 1. Read: Anyone within the tenant can view ACTIVE listings.
CREATE POLICY "tenant_read_active_listings" ON marketplace.listings
  FOR SELECT TO authenticated
  USING (
    tenant_id = auth.jwt_tenant_id() 
    AND status = 'active'
  );

-- 2. Read (Owner): The seller who created the listing can view it regardless of status.
CREATE POLICY "seller_read_own_listings" ON marketplace.listings
  FOR SELECT TO authenticated
  USING (
    tenant_id = auth.jwt_tenant_id() 
    AND seller_id = auth.uid()
  );

-- 3. Read (Admin): Tenant admins can view ALL listings in their tenant.
CREATE POLICY "admin_read_all_listings" ON marketplace.listings
  FOR SELECT TO authenticated
  USING (
    tenant_id = auth.jwt_tenant_id() 
    AND auth.jwt_tenant_role() IN ('owner', 'admin')
  );

-- 4. Insert: A user can only create a listing for themselves, within their active tenant.
CREATE POLICY "seller_insert_listing" ON marketplace.listings
  FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = auth.jwt_tenant_id() 
    AND seller_id = auth.uid()
  );

-- 5. Update: A seller can update their own listing (but cannot change the tenant_id or seller_id).
CREATE POLICY "seller_update_listing" ON marketplace.listings
  FOR UPDATE TO authenticated
  USING (
    tenant_id = auth.jwt_tenant_id() 
    AND seller_id = auth.uid()
  )
  WITH CHECK (
    -- Prevent malicious reassignment
    tenant_id = auth.jwt_tenant_id() 
    AND seller_id = auth.uid()
  );
```

### 3.2 `monetization.ledger_events` Policies (Immutable)

Billing ledgers must never be mutated by users.

```sql
ALTER TABLE monetization.ledger_events ENABLE ROW LEVEL SECURITY;

-- 1. Read: Admins can view billing events for their tenant.
CREATE POLICY "admin_read_ledger" ON monetization.ledger_events
  FOR SELECT TO authenticated
  USING (
    tenant_id = auth.jwt_tenant_id() 
    AND auth.jwt_tenant_role() IN ('owner', 'admin')
  );

-- 2. Insert: Handled EXCLUSIVELY by the service_role (Edge Functions).
-- No policy created for the authenticated role.
-- 3. Update: Blocked.
-- 4. Delete: Blocked.
```

### 3.3 `ai.embeddings` Policies

Vector data is highly sensitive and must be strictly isolated.

```sql
ALTER TABLE ai.embeddings ENABLE ROW LEVEL SECURITY;

-- 1. Read: Users can query vectors within their active tenant.
CREATE POLICY "tenant_read_embeddings" ON ai.embeddings
  FOR SELECT TO authenticated
  USING (tenant_id = auth.jwt_tenant_id());

-- 2. Insert/Update: Handled by Edge Functions (service_role) when a listing changes.
-- No write policies for the authenticated role.
```

---

## 4. Super Admin Access Bypass

To provide Super Admin functionality (the platform operators who manage all tenants), we utilize a specific RLS bypass pattern.

We do NOT use the `service_role` key for Super Admin UI dashboards, because `service_role` bypasses all RLS silently, breaking the audit trail. Instead, Super Admins log in via GoTrue, receive a JWT with a special `is_super_admin: true` claim, and we add an explicit policy to schemas that require platform-level oversight (e.g., `platform.tenants`, `trust.moderation_queue`).

```sql
CREATE OR REPLACE FUNCTION auth.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE
AS $$
  SELECT (current_setting('request.jwt.claims', true)::jsonb ->> 'is_super_admin')::boolean = true;
$$;

-- Apply to tenant directory
CREATE POLICY "super_admin_manage_tenants" ON platform.tenants
  FOR ALL TO authenticated
  USING (auth.is_super_admin() = true)
  WITH CHECK (auth.is_super_admin() = true);
```

---

## 5. Security Performance Considerations

RLS policies are evaluated on *every row* scanned by the query engine. Poorly written policies cause catastrophic performance degradation.

1. **Avoid Subqueries**: Never use `IN (SELECT id FROM...)` inside a policy if possible.
2. **Use STABLE functions**: By marking `auth.jwt_tenant_id()` as `STABLE`, PostgreSQL evaluates it once per statement, not once per row.
3. **Index Policy Columns**: Ensure `tenant_id` and `seller_id` are indexed, as they are evaluated in almost every policy.
