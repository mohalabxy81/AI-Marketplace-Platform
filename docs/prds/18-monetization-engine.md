# PRD 18 — MONETIZATION ENGINE

> **Status**: Approved
> **Target Audience**: Engineering, Product, Marketplace Operations
> **Domain**: Billing & Monetization

## 1. Executive Summary
While the Billing & Subscriptions domain handles SaaS-style recurring revenue, the Monetization Engine handles transaction-based and marketplace-specific revenue streams. In V1, this primarily focuses on the Sponsored Listings (Ad Auction) system, allowing sellers to pay to boost their listings in search results and discovery feeds.

## 2. Business Objectives
- **Diversify Revenue**: Establish a secondary revenue stream decoupled from flat subscription fees.
- **Tenant Value**: Provide sellers with a direct lever to accelerate lead generation through targeted ad spend.
- **Marketplace Fairness**: Ensure that sponsored listings are still highly relevant to the buyer's query, protecting the user experience.

## 3. Strategic Goals
- Ad auction execution must add < 10ms to the search/discovery retrieval pipeline.
- Maintain a CTR on sponsored listings that is at least 70% of the organic CTR.

## 4. User Personas
- **Seller (Advertiser)**: Creates campaigns, sets budgets, and bids on keywords/categories.
- **Buyer**: Interacts with sponsored listings subtly integrated into their feeds.
- **Ad Operations Manager**: Internal admin monitoring auction health and global CPC trends.

## 5. Stakeholders
- **Finance Team**: Reconciles ad spend against actual billing.
- **Discovery Team**: Integrates the auction results into the Stage 2/Stage 3 ranking pipeline.

## 6. User Stories
- As a **Seller**, I want to set a $50 daily budget to boost my new listing so I don't overspend accidentally.
- As a **Seller**, I want to see exactly how many extra clicks my $50 bought me compared to my organic traffic.
- As a **Buyer**, I want sponsored listings to be clearly labeled but still highly relevant to my search.

## 7. Functional Requirements
- **FR-MON-01 (Campaign Management)**: CRUD for advertising campaigns (Targeting, Budget Caps, Bids, Start/End Dates).
- **FR-MON-02 (Ad Auction Engine)**: Generalized Second-Price Auction executed at query time to determine winning bids.
- **FR-MON-03 (Quality Score)**: Multiply raw bids by a Quality Score (based on historical CTR) to determine the true auction rank, preventing irrelevant listings from buying the top spot.
- **FR-MON-04 (Budget Enforcement)**: Track real-time spend and instantly remove listings from the auction once their daily/total budget cap is hit.
- **FR-MON-05 (Attribution)**: Accurately track Impressions and Clicks specifically tied to the sponsored placement, distinct from organic interactions.

## 8. Non-Functional Requirements
- **Performance**: The auction logic must run in memory (Redis) to avoid blocking search results.
- **Accuracy**: Budget enforcement must be strictly accurate to avoid overcharging sellers due to distributed system delays.

## 9. User Workflows
- **Campaign Creation**: Seller selects Listing → Sets target category → Sets Max CPC ($2.00) → Sets Daily Budget ($50) → Launches Campaign → Engine validates funds/plan.
- **Auction Execution**: Buyer searches "Office" → Search Gateway fetches organic results + Active Bidders for "Office" → Runs auction algorithm in memory → Injects winners into slots 1, 4, and 7 of the results grid.

## 10. State Machines
- **Campaign State**: `DRAFT` → `ACTIVE` → `PAUSED` → `DEPLETED` (Budget Hit) → `COMPLETED`.

## 11. Business Rules
- Only listings that are `ACTIVE` and have passed moderation can be sponsored.
- Sponsored listings must be explicitly tagged with a "Sponsored" or "Promoted" badge in the UI.
- A maximum of 20% of slots on any given search/feed page can be occupied by sponsored listings.

## 12. Permissions
- `ads:manage` - Manage tenant ad campaigns.
- `admin:ads:read` - View global auction analytics.

## 13. Events Generated
- `monetization.campaign_started`
- `monetization.ad_impressed`
- `monetization.ad_clicked`
- `monetization.budget_depleted`

## 14. Events Consumed
- `marketplace.listing_status_changed` (Pauses campaigns if listing is archived/quarantined).

## 15. Analytics Requirements
- Campaign ROI Reporting (Spend vs. Leads Generated).
- Average Cost-Per-Click (CPC) by category.
- Ad CTR vs Organic CTR.

## 16. KPIs
- Total Ad Spend (Platform Revenue).
- Advertiser Retention Rate.
- Auction Density (Bidders per keyword/category).

## 17. Success Metrics
- Ad Revenue constitutes > 15% of total platform revenue by end of Year 1.
- Zero budget overruns exceeding 5% of the configured daily cap.

## 18. Edge Cases
- **Click Fraud**: A competitor repeatedly clicks an ad to drain the seller's budget. Implement IP rate limiting and behavioral analysis to filter out invalid clicks before billing.

## 19. Failure Scenarios
- **Auction Engine Timeout**: If the Redis auction computation exceeds 15ms, abort the auction and serve 100% organic results to prioritize buyer experience.

## 20. Compliance Requirements
- Ad disclosure regulations (FTC guidelines) require clear labeling of paid placements.

## 21. Realtime Requirements
- Spend accumulation must be tracked in near real-time (e.g., Redis counters) to enforce budget caps swiftly.

## 22. AI Requirements
- V2: Automated Bidding (AI dynamically adjusts CPC bids to maximize leads within the daily budget).

## 23. MVP Scope
- Flat-rate "Featured" listings (pay a fixed monthly fee to pin a listing to the top of a category, no auction logic).

## 24. V1 Scope
- CPC Ad Auction system.
- Daily budget caps.
- Basic Click Fraud detection.

## 25. V2 Scope
- Quality Score integration (Bid × CTR).
- Automated AI Bidding.

## 26. Future Enhancements
- Off-platform retargeting (Displaying marketplace listings on third-party ad networks).

## 27. Acceptance Criteria
- [ ] A seller can create an ad campaign with a defined CPC and daily budget.
- [ ] Sponsored listings are injected into organic search results with a "Sponsored" badge.
- [ ] Clicking a sponsored listing decrements the campaign budget by the second-price auction amount.
- [ ] Once the daily budget is hit, the listing is immediately removed from future auctions until the next day.
