# PRD 2 — ORGANIZATIONS & TENANTS

> **Status**: Approved
> **Target Audience**: Engineering, Product, Database, B2B Operations
> **Domain**: Tenant Management

## 1. Executive Summary
The Organizations & Tenants domain defines the structural foundation of the B2B marketplace. Every listing, agent, piece of analytics, and token of AI usage is scoped to a Tenant (Organization). This domain handles the strict Row-Level Security (RLS) policies, organization lifecycle (from provisioning to suspension/deletion), role-based team management, and workspace isolation that guarantees one tenant can never access another's data.

## 2. Business Objectives
- **B2B Enablement**: Provide robust workspace isolation allowing companies to safely operate their business on the platform.
- **Data Security**: Guarantee mathematically provable isolation between tenant datasets via Postgres RLS.
- **Scalability**: Enable millions of isolated workspaces to coexist on shared infrastructure efficiently.
- **Operational Control**: Empower Super Admins to monitor, throttle, suspend, and govern all tenants.

## 3. Strategic Goals
- Tenant provisioning latency must be < 2 seconds.
- Achieve zero cross-tenant data leakage incidents.
- Support hierarchical organization structures (HQ and Branches) by V1 to capture enterprise accounts.

## 4. User Personas
- **Tenant Owner**: Individual who created the workspace; holds full billing and administrative control.
- **Company Admin**: Delegated administrator managing day-to-day team and listing operations.
- **Branch Manager**: Administrator restricted to a sub-workspace (Branch).
- **Super Admin**: Platform operator governing all tenants.

## 5. Stakeholders
- **Sales & Customer Success**: Relies on tenant analytics to identify upsell opportunities and churn risks.
- **Data/DBA Team**: Ensures RLS policies do not degrade database query performance.
- **Legal & Compliance**: Ensures data segregation and tenant deletion (Right to be Forgotten) comply with GDPR/CCPA.

## 6. User Stories
- As a **Tenant Owner**, I want to invite team members and assign them specific roles so they can manage listings without accessing my billing details.
- As a **Company Admin**, I want to configure a custom domain (CNAME) so our marketplace storefront reflects our brand.
- As a **Super Admin**, I want to quickly suspend a tenant violating platform policies to protect marketplace integrity.
- As an **Enterprise HQ**, I want to create branches for different regional offices so I can track their performance independently while maintaining global billing.

## 7. Functional Requirements
- **FR-TEN-01 (Provisioning)**: Automated multi-step tenant creation (assigns UUID, provisions default quotas, initializes default roles).
- **FR-TEN-02 (RLS Isolation)**: All database access must be filtered by `app.current_tenant_id` context.
- **FR-TEN-03 (Role Assignment)**: Tenant Owners can invite users via email and assign predefined roles (Admin, Member, Viewer).
- **FR-TEN-04 (Custom Domains)**: Tenants can map custom domains/subdomains (V1).
- **FR-TEN-05 (Tenant Lifecycle)**: Support Active, Suspended, Soft-Deleted, and Hard-Deleted states.
- **FR-TEN-06 (Branch Management)**: Allow parent tenants to provision child sub-workspaces (V1).

## 8. Non-Functional Requirements
- **Security**: Database RLS must be bypassable *only* by the system superuser/service roles (and heavily audited).
- **Performance**: Role and tenant checks must not add > 5ms to API request latency.
- **Scalability**: Must support up to 100,000 members per tenant for enterprise accounts.

## 9. User Workflows
- **Org Creation**: User registers → Submits Org Name/Industry → System creates Tenant record → System assigns User as Owner → System initializes default catalogs → Redirects to Dashboard.
- **Team Invitation**: Admin inputs email + role → System generates invite token → Emails user → User clicks link → Authenticates → Added to Tenant relation table.

## 10. State Machines
- **Tenant State**: `PROVISIONING` → `ACTIVE` → `SUSPENDED` → `SOFT_DELETED` (30 days) → `PURGED`.
- **Invitation State**: `PENDING` → `ACCEPTED` / `EXPIRED` / `REVOKED`.

## 11. Business Rules
- A single user account can belong to multiple tenants (e.g., an agency managing multiple clients).
- Only the Tenant Owner can delete the tenant workspace or transfer ownership.
- Suspended tenants immediately block all read/write access for all members, and their listings are hidden from public discovery.

## 12. Permissions
- `tenant:manage` - Edit org profile and settings.
- `team:manage` - Invite/remove users and change roles.
- `admin:tenants:read` - (Super Admin) View all tenant records.
- `admin:tenants:suspend` - (Super Admin) Suspend or reactivate tenants.

## 13. Events Generated
- `tenant.provisioned`
- `tenant.profile_updated`
- `tenant.suspended`
- `tenant.reactivated`
- `tenant.member_invited`
- `tenant.member_joined`
- `tenant.member_removed`

## 14. Events Consumed
- `identity.user_registered` (to link invitations)
- `monetization.subscription_changed` (to update tenant tier context)
- `trust.fraud_detected` (can trigger automated suspension)

## 15. Analytics Requirements
- Track number of active seats vs. vacant seats per tenant.
- Track tenant onboarding funnel completion rates.
- Monitor branch creation adoption.

## 16. KPIs
- Total Active Tenants.
- Average Team Size per Tenant.
- Seat Utilization Rate (assigned seats / available seats on plan).

## 17. Success Metrics
- 0 cross-tenant data leaks.
- 95% of invited team members successfully onboard within 48 hours.

## 18. Edge Cases
- **Last Admin Leaving**: Prevent the last Tenant Owner from leaving the organization without transferring ownership.
- **Domain Verification Failure**: Handle SSL generation failures or DNS propagation delays during custom domain setup.

## 19. Failure Scenarios
- **Provisioning Failure**: If quota initialization or default catalog creation fails during signup, roll back the transaction and retry to prevent orphaned tenant records.
- **Invitation Token Expiry**: User clicks an expired invite; route them to an explanatory UI to request a new invite rather than a raw 404 error.

## 20. Compliance Requirements
- **Data Deletion**: Hard deletion must permanently wipe all tenant data from relational DBs, vector stores, and S3 buckets within 30 days to comply with GDPR.
- **Audit Logging**: Any changes to tenant ownership or roles must be immutably logged.

## 21. Realtime Requirements
- Immediate WebSocket push to all connected team members if a tenant is suspended, forcing an immediate client-side logout/lockout.

## 22. AI Requirements
- V2: AI-driven workspace setup (e.g., automatically categorize the tenant and suggest configurations based on their industry input during onboarding).

## 23. MVP Scope
- Organization creation and basic profile configuration.
- Strict PostgreSQL RLS implementation.
- Basic team invitations via email.
- Pre-defined RBAC (Owner, Admin, Member).
- Manual Super Admin suspension controls.

## 24. V1 Scope
- Custom Domains and Subdomain routing.
- Branch / Sub-workspace management.
- Bulk team invitations via CSV.

## 25. V2 Scope
- Self-serve role requests (users requesting elevated permissions).
- Detailed audit logs visible to Tenant Owners.

## 26. Future Enhancements
- Fine-grained Custom Roles (Tenant Owners creating their own permission bundles).
- Cross-tenant data sharing alliances (B2B partnerships).

## 27. Acceptance Criteria
- [ ] RLS policies actively block queries lacking the correct `tenant_id` context in the database.
- [ ] Users can create an organization during signup and are assigned the Owner role.
- [ ] Owners can invite other users, and invited users can join the tenant context successfully.
- [ ] Super Admins can suspend a tenant, which immediately hides their listings and blocks member access.
- [ ] Users belonging to multiple tenants can seamlessly switch active tenant contexts via the UI.
