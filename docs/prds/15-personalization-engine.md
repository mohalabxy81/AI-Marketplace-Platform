# PRD 15 — PERSONALIZATION ENGINE

> **Status**: Approved
> **Target Audience**: Engineering, Product, ML Teams
> **Domain**: Marketplace Intelligence

## 1. Executive Summary
The Personalization Engine powers the hyper-relevant experiences across the marketplace. By tracking user behavior (clickstream, inquiries, saved items) and translating it into a dynamically evolving "Preference Vector" stored in Redis, the engine ensures that the Discovery System surfaces inventory tailored to the individual buyer. This system runs the "Fast Loop" (real-time vector adjustments) and coordinates with the "Slow Loop" (batch re-training of neural rankers).

## 2. Business Objectives
- **Drive Engagement**: Maximize CTR and session length by showing users what they want before they search for it.
- **Conversion Velocity**: Reduce the time it takes a buyer to find a transacting item.
- **Retention**: Create a highly sticky user experience that feels "magic" to the buyer.

## 3. Strategic Goals
- Update a user's preference vector within 1 second of an interaction (Fast Loop).
- Maintain an accurate cold-start proxy vector for unauthenticated users based on global trends.

## 4. User Personas
- **Buyer**: Receives a uniquely tailored experience based on their browsing history.
- **ML Engineer**: Tunes the Exponential Moving Average (EMA) alpha values to balance short-term vs. long-term interests.

## 5. Stakeholders
- **Growth Team**: Uses personalization metrics to optimize acquisition flows.
- **Discovery Team**: Consumes the preference vectors to generate feeds.

## 6. User Stories
- As a **Buyer**, if I click on three "Modern Office" listings, my homepage feed should immediately refresh to show more modern offices.
- As a **Buyer**, if my interests shift from "Offices" to "Warehouses," the system should adapt quickly rather than showing me offices forever.
- As an **ML Engineer**, I want to train a neural ranking model overnight using today's click data to improve tomorrow's personalized feeds.

## 7. Functional Requirements
- **FR-PER-01 (Fast Loop Vector Update)**: Upon interaction (view, click, favorite), fetch the listing's vector and blend it with the user's current preference vector using EMA (e.g., `NewVec = (0.85 * OldVec) + (0.15 * ItemVec)`).
- **FR-PER-02 (Redis State)**: Store user preference vectors in an in-memory datastore (Redis) for < 5ms retrieval during feed generation.
- **FR-PER-03 (Decay Mechanism)**: Apply a time-decay factor to preference vectors to forget stale interests over time.
- **FR-PER-04 (Cold Start)**: Assign a global "trending" vector to users without history.

## 8. Non-Functional Requirements
- **Latency**: Preference vector updates must occur asynchronously and not block the user's client-side navigation.
- **Storage**: Redis must be sized adequately to hold vectors for all DAUs (e.g., 1 million DAUs * 1536 floats * 4 bytes ≈ 6GB).

## 9. User Workflows
- **Click Flow**: User clicks Listing A → Client sends `item_viewed` event → Fast Loop Worker consumes event → Fetches Listing A Vector → Fetches User Preference Vector from Redis → Applies EMA math → Saves new vector to Redis → Next feed request uses new vector.

## 10. State Machines
- N/A

## 11. Business Rules
- High-intent actions (Inquiries, Favorites) have a higher EMA weight (e.g., 0.30) than low-intent actions (Views = 0.10).
- Unauthenticated user preferences are tied to a session cookie/local storage ID, which is merged into their permanent profile upon registration/login.

## 12. Permissions
- `internal:personalization:write` - System access only.

## 13. Events Generated
- `personalization.vector_updated`

## 14. Events Consumed
- `discovery.item_viewed`
- `marketplace.inquiry_submitted`
- `discovery.item_favorited`

## 15. Analytics Requirements
- Track preference vector drift (how fast do user interests change?).
- Measure the difference in CTR between users with mature preference vectors vs. cold-start users.

## 16. KPIs
- Personalized Feed CTR.
- Fast Loop execution latency.

## 17. Success Metrics
- Personalized feeds achieve 2x higher engagement than non-personalized feeds.

## 18. Edge Cases
- **Bot Traffic**: If a scraper bot traverses the site, it will generate a chaotic preference vector. Fast Loop workers must ignore traffic flagged by Trust & Safety or IP rate limiters.

## 19. Failure Scenarios
- **Redis Eviction**: If a user's vector is evicted from Redis due to memory limits, the system seamlessly recalculates it from their historical click logs stored in Postgres/ClickHouse upon their next login.

## 20. Compliance Requirements
- **GDPR**: "Right to not be subject to automated decision-making" — provide an opt-out toggle in User Preferences that disables personalization and serves the trending feed instead.

## 21. Realtime Requirements
- Fast Loop updates must process within 1 second to ensure the next page navigation reflects the new context.

## 22. AI Requirements
- Stage 3 Neural Re-Ranking (XGBoost) relies on personalized click features generated by this system.

## 23. MVP Scope
- Simple User Preference Vector storage in Redis.
- Fast Loop EMA update on `item_viewed` events.
- Cold start global vector.

## 24. V1 Scope
- Differentiated weights for Views vs. Inquiries.
- Session-to-Profile merging upon authentication.

## 25. V2 Scope
- Stage 3 XGBoost Re-Ranker integration (Slow Loop batch training).
- Time-decay mechanisms for stale preferences.

## 26. Future Enhancements
- Contextual Embeddings (differentiating "weekend browsing" vs "workday browsing" vectors).

## 27. Acceptance Criteria
- [ ] Clicking on a listing updates the user's preference vector in Redis.
- [ ] A user with no history is assigned the cold-start vector.
- [ ] Highly weighted actions (Inquiries) shift the preference vector more significantly than simple views.
- [ ] Opting out of personalization clears the Redis vector and halts Fast Loop updates.
