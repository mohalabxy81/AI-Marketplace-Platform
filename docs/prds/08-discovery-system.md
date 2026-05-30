# PRD 8 — DISCOVERY SYSTEM

> **Status**: Approved
> **Target Audience**: Engineering, Product, AI/ML Teams
> **Domain**: Discovery

## 1. Executive Summary
The Discovery System governs how marketplace supply is surfaced to users outside of explicit search queries. It acts as a passive recommendation engine, generating the personalized homepage feeds, category browse views, and dynamic exploration surfaces. Utilizing a 4-stage retrieval pipeline (Retrieval → Light Rank → Neural Re-Rank → Exploration), this system ensures that users are consistently exposed to highly relevant, fresh, and engaging inventory.

## 2. Business Objectives
- **Drive Engagement**: Maximize user time-on-platform and session depth through continuous, relevant feed scrolling.
- **Liquidity Optimization**: Ensure new listings receive baseline impressions to prevent "dead on arrival" supply.
- **Serendipity**: Introduce users to tangential categories they might not explicitly search for, expanding their purchasing scope.

## 3. Strategic Goals
- Feed generation (including personalized vector retrieval) must complete in < 50ms.
- Increase feed CTR by 30% through the implementation of Stage 3 Neural Re-Ranking.
- Allocate a strict 10% of feed slots to exploration (new/untested listings) to guarantee platform liquidity.

## 4. User Personas
- **Buyer**: Scrolls the homepage feed seeking inspiration or passive discovery.
- **Seller**: Relies on the discovery algorithm to surface their active listings to relevant buyers.
- **AI/ML Engineer**: Tunes the ranking weights and trains the Stage 3 XGBoost models.

## 5. Stakeholders
- **Growth Team**: Monitors feed engagement metrics as primary retention drivers.
- **Trust & Safety**: Relies on the pipeline to down-rank low-trust sellers automatically.
- **Monetization Team**: Integrates sponsored listings into the Stage 2/3 ranking logic.

## 6. User Stories
- As a **Buyer**, I want my homepage feed to adapt to my interests the more I click on listings, so I see highly relevant items immediately upon return.
- As a **New Buyer**, I want to see a high-quality, diverse "Trending" feed before I've established a preference history, so I understand the platform's value.
- As a **Seller**, I want my newly published listing to be shown to some users immediately so I can start gathering views.
- As a **Marketplace Manager**, I want low-quality listings to naturally sink to the bottom of the feed without needing manual intervention.

## 7. Functional Requirements
- **FR-DSY-01 (Feed Generation)**: Generate paginated, infinite-scroll feeds for authenticated and unauthenticated users.
- **FR-DSY-02 (Cold Start)**: Serve a tenant-average or global trending vector for users lacking preference history.
- **FR-DSY-03 (4-Stage Pipeline)**: Execute Retrieval (Stage 1), Light Rank (Stage 2), Neural Re-Rank (Stage 3), and Exploration Injection (Stage 4).
- **FR-DSY-04 (Freshness Boost)**: Apply an exponential time-decay curve to listing age during Stage 2 ranking.
- **FR-DSY-05 (Trust Weighting)**: Multiply final relevance scores by the Seller's Trust Score.

## 8. Non-Functional Requirements
- **Latency**: P95 feed response time must be under 50ms.
- **Scalability**: Feed API must handle the highest concurrent load on the platform (homepage default).
- **Graceful Degradation**: If Stage 3 ML inference fails, fallback to Stage 2 heuristic ranking transparently.

## 9. User Workflows
- **Homepage Load**: Client requests `/feed` → Gateway fetches User Preference Vector from Redis → Executes HNSW retrieval in pgvector → Applies Stage 2 heuristics (Freshness/Trust) → Returns Top 25 → Client renders.
- **Infinite Scroll**: Client reaches bottom of feed → Requests `/feed?page=2` (or cursor) → Gateway returns next batch of results from cached retrieval set.

## 10. State Machines
- **Listing Discovery State**: 
  - `EXPLORATION` (Newly active, receiving guaranteed impressions)
  - `EXPLOITATION` (Ranked based on proven CTR/Performance)
  - `DECAY` (Aging out of relevance).

## 11. Business Rules
- Exploration Guarantee: 10% (ε=0.10) of feed slots must be allocated to listings published within the last 48 hours.
- Trust Penalty: Listings from sellers with a Trust Score < 0.5 cannot rank in the top 20 positions of a personalized feed.
- Diversity: No more than 3 listings from the exact same seller can appear in a single 25-item feed page.

## 12. Permissions
- `discovery:feed:read` - Publicly available (personalized if authenticated, trending if not).
- `admin:ranking:write` - (Super Admin/AI Operator) Adjust global Stage 2 ranking weights.

## 13. Events Generated
- `discovery.feed_generated` (includes timing, model version, and returned item IDs).
- `discovery.item_impressed` (emitted by client when item enters viewport).

## 14. Events Consumed
- `marketplace.listing_status_changed` (New items enter exploration pool).
- `trust.trust_score_updated` (Adjusts ranking weights).

## 15. Analytics Requirements
- Track Feed CTR vs. Search CTR.
- Measure Session Depth (average number of feed pages scrolled).
- Monitor Exploration CTR (how well do new listings perform?).

## 16. KPIs
- Daily Active Engagement Time (time spent scrolling feed).
- Feed-to-Inquiry Conversion Rate.
- NDCG@10 (Normalized Discounted Cumulative Gain) for Stage 3 evaluation.

## 17. Success Metrics
- Personalized feeds achieve a 2x higher CTR than the baseline trending feed.
- New listings achieve their first 50 impressions within 24 hours of publishing (Liquidity).

## 18. Edge Cases
- **Bizarre Preferences**: A user rapidly clicks items across completely unrelated categories, scrambling their preference vector. Mitigate with moving average smoothing (α=0.85).
- **Exhausted Feed**: A user scrolls past the top 1,000 results. Fallback to broadening the search radius automatically.

## 19. Failure Scenarios
- **Redis Preference Cache Down**: Fallback to cold-start trending feed; UI remains functional.
- **XGBoost Inference Latency Spike**: If Stage 3 takes > 30ms, abort the neural rank and return the Stage 2 heuristically sorted list.

## 20. Compliance Requirements
- Avoid feedback loops that accidentally filter out diverse content (filter bubbles).

## 21. Realtime Requirements
- None for the feed generation itself; feed generation happens on HTTP request. However, preference vectors update in near-realtime (Fast Loop).

## 22. AI Requirements
- **Stage 3 Re-Ranker**: XGBoost cross-encoder trained on historical click/conversion data.
- **Preference Vectors**: 1536-dimensional embeddings representing user interests.

## 23. MVP Scope
- Stage 1 Vector Retrieval (pgvector).
- Stage 2 Heuristic Ranking (Trust × Freshness).
- Non-personalized trending feed (cold start).
- Basic infinite scroll pagination.

## 24. V1 Scope
- Personalized feeds (utilizing Redis user preference vectors).
- Stage 4 Exploration Injection (10% new listings).

## 25. V2 Scope
- Stage 3 Neural Re-Ranking (XGBoost).
- Multi-Armed Bandit testing for layout and ranking weights.

## 26. Future Enhancements
- Graph-based collaborative filtering (User A is similar to User B).
- Context-aware feeds (e.g., different feeds based on time of day or device type).

## 27. Acceptance Criteria
- [ ] Unauthenticated users see a high-quality trending feed.
- [ ] Authenticated users receive a personalized feed based on their Redis preference vector.
- [ ] 10% of items in the returned feed are flagged as exploration/new listings (V1).
- [ ] Feed generation request completes in < 50ms (excluding network latency).
- [ ] The feed correctly paginates without serving duplicate listings.
