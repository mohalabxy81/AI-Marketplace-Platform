# PRD 16 — ANALYTICS PLATFORM

> **Status**: Approved
> **Target Audience**: Engineering, Data Teams, Product Managers
> **Domain**: Analytics

## 1. Executive Summary
The Analytics Platform is the data nervous system of the marketplace. It ingests high-volume event streams (clickstream, transactions, search queries), processes them for analytical workloads, and serves aggregates back to user-facing dashboards and internal monitoring tools. Built on an OLAP architecture (ClickHouse), it separates heavy analytical reads from the primary transactional Postgres database, ensuring platform performance remains robust under heavy reporting loads.

## 2. Business Objectives
- **Tenant Value**: Provide sellers with undeniable proof of ROI via clear dashboards detailing listing views, CTRs, and lead generation.
- **Platform Intelligence**: Empower internal Product and Growth teams with funnel conversion metrics, cohort retention, and search failure data.
- **System Health**: Provide Super Admins with real-time observability into API latency, error rates, and AI token consumption.

## 3. Strategic Goals
- Ingest up to 10,000 events per second with < 5 seconds latency from event emission to dashboard availability.
- Ensure analytical queries driving tenant dashboards execute in < 200ms.
- Provide strict RLS equivalent isolation in the OLAP layer to prevent cross-tenant data leakage in dashboards.

## 4. User Personas
- **Tenant Admin / Owner**: Views their organization's performance dashboard to assess marketplace success.
- **Super Admin**: Views global platform health and revenue metrics.
- **Data Analyst**: Writes custom SQL against the OLAP database to uncover growth insights.

## 5. Stakeholders
- **Sales / Customer Success**: Uses tenant analytics to drive subscription upsells.
- **Product Managers**: Uses feature adoption metrics to guide the roadmap.

## 6. User Stories
- As a **Seller**, I want to see a chart of how many views my listings received this week compared to last week so I know if my updates worked.
- As a **Super Admin**, I want to view a real-time graph of AI token consumption so I can ensure we aren't exceeding our API budget.
- As a **Product Manager**, I want to see a funnel analysis of users who searched for "Office" and eventually submitted an inquiry.

## 7. Functional Requirements
- **FR-ANA-01 (Event Ingestion)**: Consume standardized JSON events from the Event Mesh (Kafka).
- **FR-ANA-02 (Tenant Dashboard API)**: Serve pre-aggregated, time-series data (Views, Leads, CTR) isolated by `tenant_id`.
- **FR-ANA-03 (Platform Dashboard API)**: Serve global aggregations (Total MRR, Active Tenants, Total Leads).
- **FR-ANA-04 (Clickstream Tracking)**: Track page views, component clicks, and scroll depth from the frontend clients.
- **FR-ANA-05 (Data Export)**: Allow tenants to export their raw analytical data via CSV (V1).

## 8. Non-Functional Requirements
- **Storage Strategy**: Use columnar storage (ClickHouse) for high-performance aggregations over large datasets.
- **Data Retention**: Retain granular clickstream data for 90 days; retain daily aggregates indefinitely.
- **Privacy**: Filter all PII before writing to the OLAP cluster unless strictly required for specific reporting features.

## 9. User Workflows
- **Dashboard Load Flow**: Tenant Admin navigates to Dashboard → Client requests `/api/analytics/views?range=7d` → API executes ClickHouse query with `tenant_id` filter → Results returned in < 200ms → UI renders D3/Recharts graph.

## 10. State Machines
- N/A

## 11. Business Rules
- Tenants on the Starter Plan only see 30 days of historical data; Enterprise plans see lifetime data.
- A tenant can only see analytics for listings they own.
- Soft-deleted listings still contribute to historical analytics, but are flagged differently.

## 12. Permissions
- `analytics:read` - View tenant analytics.
- `admin:analytics:read` - View global platform analytics.

## 13. Events Generated
- N/A (Analytics is a pure consumer).

## 14. Events Consumed
- `marketplace.*` (Listings, Leads, etc.)
- `discovery.*` (Searches, Feeds, Clicks)
- `identity.*` (Logins, Registrations)
- `billing.*` (Payments, Invoices)

## 15. Analytics Requirements
- This domain *is* the analytics requirement. Core dashboards include:
  - Listing Performance (Views, Clicks, CTR, Inquiries).
  - Search Analytics (Top terms, Zero-results).
  - System Health (Latency, AI Tokens).

## 16. KPIs
- Query execution latency on dashboard load.
- Event ingestion latency (Event time vs. Indexed time).

## 17. Success Metrics
- 0 incidents of analytical queries impacting the primary transactional DB (due to physical DB separation).
- Dashboards load within 1 second for 99% of requests.

## 18. Edge Cases
- **Bot Traffic Filtering**: Exclude identified bot traffic from tenant view counts so they are not artificially inflated.
- **Timezone Handling**: Ensure aggregate buckets align with the Tenant's configured timezone, not just UTC.

## 19. Failure Scenarios
- **Kafka Outage**: The transactional outbox pattern ensures events are buffered in Postgres until the event broker recovers, ensuring zero data loss.
- **ClickHouse Outage**: Gracefully degrade dashboards with a "Data temporarily unavailable" message while core marketplace functionality remains unaffected.

## 20. Compliance Requirements
- Provide tooling to purge a specific user's clickstream history from the OLAP cluster upon a GDPR Right to Erasure request.

## 21. Realtime Requirements
- Super Admin dashboards (e.g., active concurrent users) require < 5s freshness.

## 22. AI Requirements
- Provide labeled conversion data to the AI Platform for training Stage 3 Neural Re-Rankers.

## 23. MVP Scope
- Standardized event schema.
- Postgres-based rollups (Materialized Views) for basic metrics (Total Views, Total Leads).
- Basic tenant dashboard UI.

## 24. V1 Scope
- ClickHouse integration for high-volume clickstream ingestion.
- Time-series charts (Views over time).
- Search Analytics dashboard.

## 25. V2 Scope
- Cohort and Funnel analysis tooling.
- Multi-Touch Attribution reporting.

## 26. Future Enhancements
- AI-driven "Insights" (e.g., automated alert: "Your listing view count dropped 40% this week. Consider lowering the price.").

## 27. Acceptance Criteria
- [ ] Frontend click events are successfully ingested and routed to the analytics datastore.
- [ ] A tenant can view a time-series graph of their listing views, restricted accurately to their own data.
- [ ] Dashboard queries complete in < 200ms.
- [ ] Bot traffic is filtered out of tenant metrics.
