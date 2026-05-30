# PRD 17 — BILLING & SUBSCRIPTIONS

> **Status**: Approved
> **Target Audience**: Engineering, Product, Finance Teams
> **Domain**: Billing & Monetization

## 1. Executive Summary
The Billing & Subscriptions domain is the financial engine of the marketplace. It manages tenant subscription plans, usage-based metering (e.g., AI tokens, excess listings), payment processing, and invoicing. By abstracting the complexities of recurring revenue and integrating tightly with a payment gateway (e.g., Stripe), it enables the platform to seamlessly monetize its B2B supply side.

## 2. Business Objectives
- **Revenue Generation**: Implement structured subscription tiers (SaaS model) to drive predictable MRR.
- **Usage Monetization**: Enable flexible usage-based billing to monetize high-volume API or AI consumers without forcing them into custom enterprise tiers.
- **Operational Efficiency**: Automate invoicing, dunning (failed payment recovery), and plan provisioning to minimize manual finance ops.

## 3. Strategic Goals
- Ensure zero drift between the payment gateway's subscription state and the platform's internal access control state.
- Support self-serve upgrades/downgrades with automated proration calculations.
- Maintain PCI-DSS compliance by offloading all sensitive cardholder data to the payment processor.

## 4. User Personas
- **Tenant Owner**: Manages the organization's credit cards, views invoices, and changes subscription plans.
- **Super Admin (Finance)**: Overrides plans, issues refunds, and monitors MRR.

## 5. Stakeholders
- **Finance Team**: Relies on accurate invoice generation and revenue recognition reporting.
- **Customer Success**: Manages plan overrides and discounts for enterprise clients.

## 6. User Stories
- As a **Tenant Owner**, I want to upgrade my plan from Starter to Growth so I can add more team members.
- As a **Tenant Owner**, I want to download my past invoices as PDFs for my accounting department.
- As a **Platform Operator**, if a tenant's credit card fails three times, I want the system to automatically downgrade their plan and restrict access to premium features.

## 7. Functional Requirements
- **FR-BIL-01 (Plan Configuration)**: Define subscription tiers with specific quotas (Seats, Listings, AI Tokens).
- **FR-BIL-02 (Checkout Flow)**: Integrate Stripe Checkout for secure payment method capture and initial subscription creation.
- **FR-BIL-03 (Webhook Sync)**: Process Stripe webhooks (`invoice.paid`, `customer.subscription.deleted`) to update internal tenant state.
- **FR-BIL-04 (Usage Metering)**: Provide a ledger API to record usage events (e.g., +100 tokens) and sync them to Stripe Metered Billing.
- **FR-BIL-05 (Customer Portal)**: Provide a self-serve UI (Stripe Customer Portal) for users to update cards and view invoices.

## 8. Non-Functional Requirements
- **Consistency**: Webhook processing must be idempotent to handle Stripe retry logic without double-counting payments.
- **Security**: Card data must never touch the platform's servers.

## 9. User Workflows
- **Upgrade Flow**: Tenant clicks "Upgrade" → Directed to Stripe Checkout → Completes payment → Stripe fires `checkout.session.completed` webhook → Platform receives webhook → Updates Tenant Plan ID in DB → Grants access to premium features.
- **Dunning Flow**: Card fails on renewal → Stripe fires `invoice.payment_failed` → Platform sends warning email to Tenant Owner. After 3 days, Stripe cancels sub → Platform receives `subscription.deleted` → Platform downgrades Tenant to Free/Suspended tier.

## 10. State Machines
- **Subscription State**: `TRIALING` → `ACTIVE` → `PAST_DUE` → `CANCELED` / `UNPAID`.

## 11. Business Rules
- Downgrading a plan does not take effect until the end of the current billing cycle.
- Upgrading a plan takes effect immediately and calculates a prorated charge.
- If a tenant is downgraded and currently exceeds the new plan's listing quota, their oldest active listings are moved to ARCHIVED until they are within limits.

## 12. Permissions
- `billing:manage` - Restricted to Tenant Owner only.
- `admin:billing:write` - Super Admin capability to issue credits or manual overrides.

## 13. Events Generated
- `billing.subscription_created`
- `billing.subscription_updated`
- `billing.subscription_canceled`
- `billing.payment_failed`

## 14. Events Consumed
- Payment Processor Webhooks.

## 15. Analytics Requirements
- Track Monthly Recurring Revenue (MRR) and Annual Recurring Revenue (ARR).
- Track Churn Rate (Voluntary vs. Involuntary/Failed payments).
- Track Average Revenue Per User (ARPU).

## 16. KPIs
- MRR Growth Rate.
- Net Revenue Retention (NRR).
- Dunning Recovery Rate.

## 17. Success Metrics
- 100% successful synchronization between Stripe state and Platform DB state.
- Zero PCI compliance violations.

## 18. Edge Cases
- **Webhook Out-of-Order**: A `subscription.updated` event arrives before `subscription.created`. The system must buffer or query the Stripe API to ensure eventual consistency.
- **Manual Overrides**: A sales rep gives a client a 100% discount for 6 months; the system must track this gracefully without breaking quota allocations.

## 19. Failure Scenarios
- **Stripe Outage**: The platform continues to serve traffic based on the last known DB state, but prevents plan changes or new checkouts until the gateway recovers.

## 20. Compliance Requirements
- **Tax Collection**: Integrate Stripe Tax or Avalara to calculate and collect appropriate VAT/Sales Tax based on the tenant's jurisdiction.

## 21. Realtime Requirements
- Webhooks must be processed in < 5 seconds so the user sees their new plan active immediately upon returning from the checkout page.

## 22. AI Requirements
- V2: Predictive churn modeling based on usage patterns and billing history.

## 23. MVP Scope
- Manual invoicing (Super Admin assigns plans directly, payments handled offline).
- Hardcoded Plan Quotas.

## 24. V1 Scope
- Stripe Checkout integration for self-serve subscriptions.
- Stripe Webhook sync for automated state changes.
- Stripe Customer Portal for invoice downloads.

## 25. V2 Scope
- Usage-based metered billing (syncing AI token usage to Stripe).
- Prorated upgrades/downgrades.

## 26. Future Enhancements
- Multi-currency support.
- Configurable add-ons (e.g., buying a pack of 10 extra listings).

## 27. Acceptance Criteria
- [ ] A Tenant Owner can successfully complete a Stripe Checkout flow.
- [ ] Upon successful payment, the Stripe webhook updates the tenant's plan in the database.
- [ ] Attempting to access a feature restricted to a higher tier results in a clean 403 Forbidden / Upgrade Prompt.
- [ ] The platform handles failed payment webhooks by notifying the user and gracefully downgrading access after the grace period.
