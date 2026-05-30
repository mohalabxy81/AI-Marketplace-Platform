# PRD 19 — TRUST & SAFETY

> **Status**: Approved
> **Target Audience**: Engineering, Trust & Safety Teams, Legal
> **Domain**: Trust & Safety

## 1. Executive Summary
The Trust & Safety domain is the immune system of the marketplace. It evaluates user behavior, computes dynamic Trust Scores for every tenant, and enforces platform policies to protect buyers from fraud and sellers from spam. By utilizing behavioral heuristics and anomaly detection, this system acts independently of content moderation, focusing instead on the *actors* within the system.

## 2. Business Objectives
- **Protect Buyers**: Ensure buyers have a safe transaction environment free from scams or phishing.
- **Protect Sellers**: Filter out automated bot inquiries and malicious actors draining ad budgets.
- **Brand Reputation**: Maintain the platform's reputation as a premium, trustworthy marketplace.

## 3. Strategic Goals
- Compute behavioral Trust Scores dynamically based on real-time activity.
- Automatically suspend accounts demonstrating clear fraudulent patterns within 5 minutes of detection.
- Maintain a False Positive suspension rate of < 1% to avoid punishing legitimate sellers.

## 4. User Personas
- **Buyer/Seller**: Unknowingly interacts with the system, expecting a safe environment.
- **Trust & Safety Analyst**: Reviews flagged accounts, tunes heuristics, and handles suspension appeals.

## 5. Stakeholders
- **Legal/Compliance**: Ensures enforcement actions adhere to Terms of Service.
- **Customer Success**: Manages the fallout and support tickets from False Positive account suspensions.

## 6. User Stories
- As a **Trust Analyst**, I want the system to automatically flag any tenant that creates 500 listings in 10 minutes, as this is likely a spam bot.
- As a **Seller**, I want inquiries from known spam IPs to be blocked before they hit my CRM inbox.
- As a **Buyer**, I want a visual "Verified" badge on highly trusted sellers so I feel confident transacting with them.

## 7. Functional Requirements
- **FR-TNS-01 (Trust Scoring)**: Maintain a numeric Trust Score (0.0 to 1.0) for every tenant, updated daily based on behavior.
- **FR-TNS-02 (Anomaly Detection)**: Implement sliding window rate limiters (Redis) to detect velocity anomalies (e.g., rapid listing creation, rapid messaging).
- **FR-TNS-03 (Automated Sanctions)**: Automatically quarantine listings or suspend tenants if their Trust Score drops below predefined thresholds.
- **FR-TNS-04 (IP/Device Fingerprinting)**: Track user IPs and device signatures to detect malicious ban evasion (V2).
- **FR-TNS-05 (Appeals System)**: Allow suspended users to submit a standardized appeal form to the Trust & Safety queue.

## 8. Non-Functional Requirements
- **Performance**: Behavioral telemetry tracking must not add latency to core API paths (must use async UDP or Kafka).
- **Auditability**: Every sanction (automated or manual) must log the exact reason code and timestamp in the immutable audit log.

## 9. User Workflows
- **Anomaly Detection Flow**: Malicious script registers account → Script POSTs 100 listings in 60s → Redis Rate Limiter trips `velocity_violation` → Event published to Kafka → Trust Worker consumes event → Decrements Trust Score to 0.1 → Triggers `tenant.suspended` event → Listings removed from search → User locked out.

## 10. State Machines
- **Trust State (Tenant)**: `VERIFIED` → `NEUTRAL` → `FLAGGED` (Under Review) → `RESTRICTED` (Limited actions) → `SUSPENDED`.

## 11. Business Rules
- Tenants with a Trust Score < 0.3 cannot utilize the `messages:send` permission.
- Tenants with a Trust Score < 0.5 suffer a permanent 0.5x multiplier to their Stage 2 Discovery rank.
- Only a Super Admin or Trust Analyst can manually override a Trust Score or lift a suspension.

## 12. Permissions
- `admin:trust:read` - View tenant trust scores and violation histories.
- `admin:trust:write` - Manually suspend/reinstate tenants or adjust scores.

## 13. Events Generated
- `trust.score_updated`
- `trust.tenant_suspended`
- `trust.tenant_reinstated`
- `trust.anomaly_detected`

## 14. Events Consumed
- `marketplace.listing_created` (for velocity checks)
- `marketplace.inquiry_submitted`
- `identity.session_started` (for geolocation tracking)

## 15. Analytics Requirements
- Track the number of automated suspensions vs. manual suspensions.
- Track the False Positive Rate (Suspensions that are successfully appealed and overturned).
- Monitor the distribution of Trust Scores across the platform.

## 16. KPIs
- Spam/Fraud Incident Rate (Reported by users).
- Suspension Appeal Success Rate (< 5% target).

## 17. Success Metrics
- 99% of spam bot accounts are suspended automatically before a buyer views their listings.

## 18. Edge Cases
- **Shared IP Addresses**: Corporate networks or university dorms sharing a NAT IP must not cause legitimate users to be cross-banned if one user is malicious (requires device fingerprinting, not just IP bans).

## 19. Failure Scenarios
- **Redis Limiter Outage**: Fallback to less aggressive database-level checks; do not block user traffic, but queue telemetry for post-processing.

## 20. Compliance Requirements
- Provide clear justification in the UI when a user is suspended to comply with EU P2B (Platform-to-Business) regulations regarding account termination.

## 21. Realtime Requirements
- Suspensions must trigger an immediate WebSocket disconnect and JWT invalidation for the affected user.

## 22. AI Requirements
- V2: Graph Neural Networks (GNN) to detect coordinated fraud rings based on shared behavioral patterns and attributes.

## 23. MVP Scope
- Manual Tenant suspension by Super Admins.
- Basic IP blocking.
- Simple static rate limiting (e.g., max 50 listings per day).

## 24. V1 Scope
- Dynamic Trust Scoring (heuristic-based).
- Automated suspension on severe velocity violations.
- Trust & Safety Analyst dashboard.

## 25. V2 Scope
- Device Fingerprinting.
- Machine Learning anomaly detection models.
- Formal Appeals system.

## 26. Future Enhancements
- Identity Verification integration (e.g., Stripe Identity / Onfido) to unlock "Verified" badges.

## 27. Acceptance Criteria
- [ ] A Super Admin can manually suspend a tenant, which immediately hides all their listings and revokes their API access.
- [ ] Submitting 100 listings in under 1 minute triggers an automated velocity violation and flags the account.
- [ ] A suspended user logging in sees a clear "Account Suspended" screen with instructions for appeal, rather than a generic 500 error.
