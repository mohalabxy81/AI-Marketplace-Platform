# PRD 23 — EXPERIMENTATION PLATFORM

> **Status**: Approved
> **Target Audience**: Engineering, Product, Data Science
> **Domain**: Governance & Admin / Analytics

## 1. Executive Summary
The Experimentation Platform enables data-driven decision making across the marketplace. It manages the configuration, traffic allocation, and statistical analysis of A/B tests and Multi-Armed Bandit (MAB) experiments. Rather than relying on gut feelings for UI changes or ranking algorithm updates, this system ensures every change is statistically validated against control groups for its impact on core KPIs (CTR, Conversion, Latency).

## 2. Business Objectives
- **Risk Mitigation**: Roll out massive changes (e.g., swapping the Stage 3 XGBoost ranking model) to a small percentage of traffic first.
- **Optimization**: Continuously test variations of discovery feeds, pricing models, and UI layouts to maximize conversion.
- **Velocity**: Allow Product Managers to launch UI copy or layout tests without requiring engineering deployments.

## 3. Strategic Goals
- Ensure assignment to an experiment variant happens deterministically and adds < 1ms of latency to request paths.
- Achieve a highly scalable event attribution pipeline so experiments reach statistical significance rapidly.

## 4. User Personas
- **Product Manager**: Configures A/B tests to validate new features or copy changes.
- **Data Scientist**: Analyzes test results and configures Multi-Armed Bandit models for continuous optimization.
- **User (Buyer/Seller)**: Unknowingly participates in experiments, experiencing different variations of the platform.

## 5. Stakeholders
- **Engineering**: Relies on the SDK to serve variants based on the user's assignment.
- **Leadership**: Reviews experiment outcomes to finalize product roadmap decisions.

## 6. User Stories
- As a **Product Manager**, I want to test two different colors for the "Contact Seller" button and see which generates more leads.
- As a **Data Scientist**, I want to allocate 10% of traffic to a new LLM ranking model and track its NDCG metric vs the control model.
- As an **Engineer**, I want a simple SDK where I can call `getVariant("button_color")` and trust that the user gets a consistent experience.

## 7. Functional Requirements
- **FR-EXP-01 (Experiment Configuration)**: UI to define Experiments, Variants (e.g., Control, Variant A), and Traffic Allocation % (e.g., 50/50, 90/10).
- **FR-EXP-02 (Deterministic Assignment)**: Use consistent hashing (e.g., `MurmurHash3(user_id + experiment_id) % 100`) to assign users to variants instantly without a DB lookup.
- **FR-EXP-03 (Event Attribution)**: Append the `experiment_id` and `variant_id` to all analytics events (views, clicks, leads) fired by the client.
- **FR-EXP-04 (Multi-Armed Bandit)**: Support dynamic traffic reallocation (Thompson Sampling) where winning variants automatically receive more traffic over time.
- **FR-EXP-05 (Statistical Engine)**: Calculate P-values and confidence intervals nightly based on the ingested OLAP data.

## 8. Non-Functional Requirements
- **Performance**: Variant assignment must be purely mathematical and stateless at the edge/client level.
- **Consistency**: A user must remain in the same variant for the lifetime of the experiment to avoid confusing UI shifts (the "flicker" effect).

## 9. User Workflows
- **A/B Test Setup**: PM creates "Checkout Flow Test" → Defines Control (Current), Variant A (New UI) → Sets Allocation to 10% total traffic, split 50/50 → Starts Experiment.
- **Variant Delivery**: Client requests page → Backend hashes `user_id` → Determines user is in the 5% bucket for Variant A → Backend passes `variant=A` to frontend → Frontend renders New UI → Client fires `inquiry_submitted` event tagged with `variant=A`.

## 10. State Machines
- **Experiment State**: `DRAFT` → `RUNNING` → `PAUSED` → `CONCLUDED`.

## 11. Business Rules
- Experiments must specify a primary KPI (e.g., "Lead Conversion Rate") before starting.
- Overlapping experiments on the same UI component must be prevented via "Mutually Exclusive Experiment Groups."

## 12. Permissions
- `admin:experiments:read` - View ongoing tests.
- `admin:experiments:write` - Create and launch new tests.

## 13. Events Generated
- `experiment.started`
- `experiment.concluded`

## 14. Events Consumed
- All standard analytics events (`discovery.click`, `marketplace.inquiry_submitted`) are consumed to calculate outcomes.

## 15. Analytics Requirements
- Live dashboard showing Control vs Variant performance against the primary KPI.
- Statistical significance indicators (e.g., "95% confident Variant A is better").

## 16. KPIs
- Number of Concurrent Experiments.
- Test Velocity (Tests concluded per month).

## 17. Success Metrics
- 100% of major feature releases are validated via A/B testing before global rollout.

## 18. Edge Cases
- **Unauthenticated Users**: Hash based on a persistent session cookie or device ID to ensure consistency before the user logs in. If they log in, maintain the assignment.

## 19. Failure Scenarios
- **Configuration Fetch Failure**: If the client cannot fetch active experiment definitions, it must ALWAYS default to the Control variant.

## 20. Compliance Requirements
- GDPR: Ensure that participation in layout/color experiments does not violate data tracking consent. Tie assignment to essential session cookies rather than tracking cookies where possible.

## 21. Realtime Requirements
- N/A. Calculations can be batch-processed.

## 22. AI Requirements
- V2: Multi-Armed Bandit algorithms use reinforcement learning to continuously optimize traffic routing.

## 23. MVP Scope
- Deterministic hashing assignment for A/B routing.
- Event tagging.
- Manual data analysis (via SQL in ClickHouse).

## 24. V1 Scope
- UI for Experiment Configuration.
- Automated Statistical Dashboards (Bayesian / Frequentist math).

## 25. V2 Scope
- Multi-Armed Bandits for dynamic traffic routing.
- Mutually Exclusive Groups.

## 26. Future Enhancements
- Automated Rollouts (if Variant A reaches 99% confidence, automatically ramp to 100% traffic).

## 27. Acceptance Criteria
- [ ] An experiment can be defined with an 80/20 traffic split.
- [ ] Users are consistently hashed into the same variant across multiple sessions.
- [ ] Analytics events fired by the user contain the correct experiment and variant metadata.
- [ ] If the experiment configuration is unreachable, the system gracefully falls back to the Control variant.
