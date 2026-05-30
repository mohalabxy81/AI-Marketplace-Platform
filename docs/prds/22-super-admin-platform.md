# PRD 22 — SUPER ADMIN PLATFORM

> **Status**: Approved
> **Target Audience**: Engineering, Operations, Customer Success
> **Domain**: Governance & Admin

## 1. Executive Summary
The Super Admin Platform is the internal control center for the marketplace operating system. It provides platform operators with the tools necessary to monitor system health, manage tenant lifecycles, configure global feature flags, and resolve high-level support escalations. This interface operates completely outside the tenant RLS boundaries, possessing "god-mode" access to all data, governed strictly by comprehensive audit logging.

## 2. Business Objectives
- **Operational Control**: Empower internal teams to resolve tenant issues without requiring direct engineering/database intervention.
- **Platform Integrity**: Provide levers to suspend malicious actors and toggle emergency kill-switches.
- **Visibility**: Consolidate cross-tenant data into actionable dashboards for business leaders.

## 3. Strategic Goals
- Eliminate 90% of Level 1 engineering support tickets by providing UI-based administrative tools.
- Ensure 100% of destructive actions (deletions, suspensions, plan changes) taken by admins are immutably logged.

## 4. User Personas
- **Super Admin**: Full read/write access to all platform settings, tenants, and billing ledgers.
- **Platform Operator**: Restricted internal access (e.g., Customer Support agent who can view tenants but cannot delete them or change global configs).

## 5. Stakeholders
- **Engineering / SRE**: Relies on the Super Admin panel to toggle feature flags and view health metrics instead of connecting directly to production databases.
- **Legal/Compliance**: Audits the actions of Super Admins to ensure no unauthorized access to PII occurred.

## 6. User Stories
- As a **Super Admin**, I want to search for any user by their email address across the entire platform so I can help them recover their account.
- As a **Customer Success Rep**, I want to "Impersonate" a Tenant Owner (read-only) so I can see exactly what they are seeing when they report a UI bug.
- As an **SRE**, I want a single toggle button to disable the AI Integration across the entire platform if the OpenAI API goes down.
- As a **Finance Lead**, I want to manually override a tenant's subscription plan to "Enterprise" without charging their credit card.

## 7. Functional Requirements
- **FR-SAD-01 (Tenant Management)**: Search, view, suspend, reactivate, and delete tenants.
- **FR-SAD-02 (User Management)**: Search, view, force-logout, and suspend individual users.
- **FR-SAD-03 (Impersonation)**: Secure, read-only impersonation of a user account.
- **FR-SAD-04 (Feature Flags)**: UI to manage global and tenant-specific feature toggles (LaunchDarkly equivalent).
- **FR-SAD-05 (Audit Logs)**: Dedicated viewer for the platform's immutable audit trail.

## 8. Non-Functional Requirements
- **Security**: The Super Admin platform must be hosted on a separate sub-domain (e.g., `admin.platform.com`) and heavily restricted (e.g., VPN required, strict MFA required).
- **Auditability**: Every API request made by a Super Admin must log the Admin ID, Target Resource, Action, and IP address.

## 9. User Workflows
- **Tenant Suspension Flow**: Admin navigates to Tenant List → Searches "SpamCorp" → Clicks Suspend → Prompts for reason code → Submits → Tenant state updated → Associated users force-logged out via WebSocket.
- **Impersonation Flow**: Support Rep searches User → Clicks "Impersonate" → JWT is issued with a special `impersonator_id` claim and `read_only` scope → Rep browses the app exactly as the user → Rep clicks "End Impersonation" to revert.

## 10. State Machines
- N/A

## 11. Business Rules
- A Super Admin cannot delete the Super Admin organization or their own account.
- Actions taken during "Impersonation" mode are completely restricted to READ operations. The UI must disable all submit/save buttons.
- Global config changes (e.g., changing the default AI model) require a confirmation modal.

## 12. Permissions
- `platform:*` - Full access.
- `admin:tenants:read` - Read-only tenant support access.

## 13. Events Generated
- `admin.action_executed`
- `admin.tenant_suspended`
- `admin.feature_flag_changed`

## 14. Events Consumed
- Subscribes to global error rates and health metrics for the dashboard.

## 15. Analytics Requirements
- Track Super Admin login locations and times.
- Monitor which internal tools are used most frequently to guide future admin UI development.

## 16. KPIs
- Support ticket resolution time (reduced by better admin tooling).

## 17. Success Metrics
- Zero direct database modifications required by engineers for routine support tasks (e.g., resetting passwords, changing plans).

## 18. Edge Cases
- **Concurrent Admin Actions**: Two admins try to modify the same global configuration simultaneously. Implement optimistic concurrency control.

## 19. Failure Scenarios
- **Audit Log Failure**: If the audit logging service (e.g., Kafka) goes down, the Super Admin API MUST block all `POST/PUT/DELETE` requests. Destructive actions must never occur unlogged.

## 20. Compliance Requirements
- Provide tooling to export Super Admin access logs for annual SOC2 audits.

## 21. Realtime Requirements
- Changing a global feature flag should push a WebSocket event to all connected clients to reload/refresh the feature state if necessary.

## 22. AI Requirements
- V2: "Ask Data" - A natural language interface over the analytical database allowing Admins to ask questions like "How many tenants churned this week?" and receive SQL-generated charts.

## 23. MVP Scope
- Tenant CRUD (Create, Read, Suspend).
- User search and force-logout.
- Global Feature Flag toggles.

## 24. V1 Scope
- Read-only User Impersonation.
- Immutable Audit Log viewer.
- Plan/Billing override UI.

## 25. V2 Scope
- Two-factor authentication (Maker/Checker) for highly destructive actions (e.g., Tenant Hard Delete requires 2 Admins to approve).

## 26. Future Enhancements
- Natural Language querying for platform data.

## 27. Acceptance Criteria
- [ ] A Super Admin can search for a tenant and click "Suspend", immediately locking out that tenant's users.
- [ ] A Super Admin can securely impersonate a user in read-only mode.
- [ ] Toggling a feature flag off instantly disables that feature across the platform for new requests.
- [ ] Every action performed in the Super Admin dashboard is written to the Audit Log.
