# PRD 9 — RECOMMENDATION ENGINE

> **Status**: Approved
> **Target Audience**: Engineering, Product, ML/Data Teams
> **Domain**: Marketplace Intelligence

## 1. Executive Summary
The Recommendation Engine is responsible for surfacing contextual, item-to-item, and user-to-user suggestions outside of the main discovery feed. This powers features like "Similar Listings" on the listing detail page, "Customers Also Viewed," and automated cross-selling. It leverages the same underlying vector infrastructure as the Discovery system but applies it to item-centric contexts rather than global feed generation.

## 2. Business Objectives
- **Increase Conversion**: Keep buyers engaged if their initial listing choice isn't a perfect fit.
- **Maximize Page Views**: Drive deep exploratory behavior by linking related inventory.
- **Cross-Selling**: Introduce users to complementary categories (e.g., suggesting Office Furniture to someone looking at Commercial Office Space).

## 3. Strategic Goals
- Recommendation widget latency must be < 50ms.
- "Similar Listings" must drive at least 15% of all secondary page views.

## 4. User Personas
- **Buyer**: Navigates through the marketplace via recommendation links.
- **Seller**: Benefits from network effects when their listings are recommended alongside popular inventory.

## 5. Stakeholders
- **UX/Design**: Integrates recommendation carousels into the listing detail page and post-inquiry success screens.
- **Analytics Team**: Measures the engagement attribution of recommendation widgets.

## 6. User Stories
- As a **Buyer**, if I am looking at a 2-bedroom apartment but it's too expensive, I want to see a carousel of slightly cheaper 2-bedroom apartments nearby.
- As a **Buyer**, after I submit an inquiry for a listing, I want to see 3 alternative options just in case the first seller doesn't respond.
- As a **Seller**, I want my listings to be recommended to buyers who are looking at my competitors' listings.

## 7. Functional Requirements
- **FR-REC-01 (Content-Based Similarity)**: Surface listings based purely on vector similarity to the current listing (cosine distance).
- **FR-REC-02 (Collaborative Filtering)**: (V2) Surface listings based on co-viewing patterns ("Users who viewed X also viewed Y").
- **FR-REC-03 (Post-Action Recs)**: Provide targeted recommendations immediately after an inquiry submission.
- **FR-REC-04 (Cross-Category Recs)**: Support rules for recommending items in complementary categories.

## 8. Non-Functional Requirements
- **Performance**: Pre-compute or rapidly cache similar item vectors to ensure instantaneous widget loading.
- **Diversity**: Prevent all 5 recommendations from belonging to the same seller to ensure marketplace fairness.

## 9. User Workflows
- **Similar Items Flow**: Buyer views Listing A → Client fetches `/recommendations?item=A` → Gateway executes pgvector similarity search against A's embedding → Returns top 5 results → Client renders carousel.

## 10. State Machines
- N/A

## 11. Business Rules
- A listing must never recommend another listing from a Suspended or Quarantined seller.
- If a listing belongs to a specific branch/tenant, do not restrict recommendations *only* to that tenant unless explicitly configured (Marketplace vs. Storefront mode).

## 12. Permissions
- `recommendations:read` - Publicly available.

## 13. Events Generated
- `analytics.recommendation_served`
- `analytics.recommendation_clicked`

## 14. Events Consumed
- `discovery.item_viewed` (Feeds collaborative filtering models).

## 15. Analytics Requirements
- Track Recommendation CTR (Clicks / Impressions).
- Track Conversion Attribution (Did a lead originate from a recommendation click?).

## 16. KPIs
- Widget CTR.
- Secondary Page Views per Session.

## 17. Success Metrics
- 15% of all listing page views originate from a recommendation widget.

## 18. Edge Cases
- **Unique Item**: A highly niche listing has no vector neighbors within a reasonable similarity threshold (fallback to category popular items).

## 19. Failure Scenarios
- **Vector DB Timeout**: Hide the recommendation widget entirely rather than breaking the listing detail page load.

## 20. Compliance Requirements
- N/A

## 21. Realtime Requirements
- N/A

## 22. AI Requirements
- Embedding similarity calculation at runtime.
- Graph analysis for collaborative filtering (V2).

## 23. MVP Scope
- "Similar Listings" widget based on pgvector cosine similarity.
- Flat hard-coded diversity rule (max 2 items per seller in a 5-item carousel).

## 24. V1 Scope
- Post-inquiry recommendation widget.
- Cross-category basic rules.

## 25. V2 Scope
- Collaborative Filtering ("Customers who viewed this also viewed").

## 26. Future Enhancements
- Multi-modal similarity (visually similar images using Vision embeddings).

## 27. Acceptance Criteria
- [ ] Navigating to a listing detail page displays 5 semantically similar listings.
- [ ] If the vector DB fails, the page still loads normally without the widget.
- [ ] The carousel does not contain duplicate items or the currently viewed item.
