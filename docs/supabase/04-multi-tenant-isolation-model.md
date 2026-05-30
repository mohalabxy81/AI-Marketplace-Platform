# 4. MULTI-TENANT ISOLATION MODEL

> **Status**: Approved
> **Target Audience**: Security Engineers, Backend Architects
> **Document Class**: Official Backend Constitution
> **System Context**: AI-Native Multi-Tenant Marketplace Operating System

---

## 1. The Tenancy Paradigm

The platform operates as a **Business-to-Business-to-Consumer (B2B2C)** marketplace operating system. 
- The "Tenant" is a Marketplace Operator (a business or creator).
- The "Users" are buyers or sellers transacting within that specific operator's marketplace.
- The platform provides a unified infrastructure serving thousands of tenants simultaneously.

To balance compute efficiency, global AI discovery, and strict data security, the platform utilizes a **Logical Separation Strategy**.

### 1.1 Logical vs. Physical Separation
- **Physical Separation (Database-per-Tenant)**: Rejected. It prevents cross-marketplace AI discovery (e.g., recommending an AI Agent from Marketplace A to a user in Marketplace B if network-level sharing is enabled). It also makes schema migrations across 10,000 tenants an operational nightmare.
- **Logical Separation (Shared Database, Shared Schema)**: Adopted. All tenants share the same PostgreSQL tables. Isolation is enforced mathematically at the query execution engine layer using PostgreSQL Row Level Security (RLS).

---

## 2. The Identity & Tenant Hierarchy

### 2.1 Universal Identity (Auth)
A user possesses a single `auth.users` record (managed by Supabase GoTrue). A user (e.g., `alice@email.com`) authenticates once to the platform. 

### 2.2 Tenant Memberships
Once authenticated, the user may have relationships with multiple tenants:
1. Alice is the **Owner** of Tenant A (Her own AI template marketplace).
2. Alice is a **Customer (Viewer)** in Tenant B (A prompt engineering marketplace).

This many-to-many relationship is mapped in `identity.tenant_members`.

---

## 3. The Tenancy Boundary Enforcement Mechanism

### 3.1 The `tenant_id` Mandate
**Rule**: EVERY table in the system that stores tenant data MUST contain a `tenant_id UUID NOT NULL` column. There are zero exceptions to this rule in the `marketplace`, `crm`, `ai`, `monetization`, and `analytics` schemas.

### 3.2 JWT Claim Injection
When a user authenticates, they must select an "Active Tenant Context". Next.js requests a custom JWT from Supabase that injects the active `tenant_id` into the `app_metadata` claim of the JWT.

```json
{
  "sub": "user-uuid-123",
  "email": "alice@email.com",
  "app_metadata": {
    "tenant_id": "tenant-uuid-A",
    "role": "owner"
  }
}
```

### 3.3 The RLS Execution Path
When the Next.js API (or Edge Function) queries Supabase:
1. The JWT is passed in the `Authorization: Bearer <token>` header.
2. PostgREST parses the JWT and sets a local Postgres configuration variable: 
   `SET request.jwt.claims = '{...}'`
3. The SQL query (e.g., `SELECT * FROM marketplace.listings`) is executed.
4. The PostgreSQL engine intercepts the query and implicitly rewrites it based on the RLS policy:
   `SELECT * FROM marketplace.listings WHERE tenant_id = (request.jwt.claims->>'tenant_id')::uuid`

This ensures that even if a developer makes a mistake in the frontend or API layer and writes `SELECT * FROM marketplace.listings` without a WHERE clause, the database will *only* return listings belonging to the active `tenant_id`.

---

## 4. Cross-Tenant AI and Vector Boundaries

Because AI operations (Semantic Search, RAG) operate at the data layer, strict tenant isolation must extend to `pgvector`.

### 4.1 Embedding Isolation
When performing a vector similarity search (cosine distance), the search MUST be scoped to the tenant. If it is not, a user in Tenant A could prompt-inject a search query designed to retrieve private documents from Tenant B.

**Secure Vector Search Implementation (RPC):**
```sql
CREATE OR REPLACE FUNCTION match_listings(
  query_embedding vector(1536), 
  match_threshold float, 
  match_count int
)
RETURNS TABLE (id uuid, title text, similarity float)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id, 
    l.title, 
    1 - (e.embedding <=> query_embedding) AS similarity
  FROM marketplace.listings l
  JOIN ai.embeddings e ON l.id = e.entity_id
  -- The following condition is technically redundant if RLS is enabled, 
  -- but is added as a defense-in-depth measure.
  WHERE l.tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
    AND 1 - (e.embedding <=> query_embedding) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 4.2 Network Effects (Opt-in Cross-Tenancy)
The platform architecture supports future "Network Effects" where tenants can opt-in to syndicate their listings to a global discovery feed.
To support this, a `syndication_status` column exists. Global discovery queries run under a dedicated `platform_read_role` that bypasses strict tenant RLS *only* for rows where `syndication_status = 'global'`.

---

## 5. Security & Isolation Testing Contract

To guarantee tenant isolation, the CI/CD pipeline enforces the following testing contract:

1. **Test Environment**: Create Tenant X and Tenant Y.
2. **Seed Data**: Insert 10 listings for X, 10 for Y.
3. **Execution**: Authenticate as User of Tenant X.
4. **Assertion**: Query `SELECT COUNT(*) FROM marketplace.listings`.
5. **Validation**: Result MUST equal 10. If result is 20, the build immediately fails and blocks deployment, as it indicates a catastrophic RLS failure.
