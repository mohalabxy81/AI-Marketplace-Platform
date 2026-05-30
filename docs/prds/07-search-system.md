# PRD 7 — SEARCH SYSTEM

> **Status**: Approved
> **Target Audience**: Engineering, Product, AI Teams
> **Domain**: Discovery

## 1. Executive Summary
The Search System is the high-intent gateway for buyers on the marketplace. Moving beyond simple keyword matches, it utilizes a hybrid retrieval architecture that combines lexical (BM25) and semantic (pgvector HNSW) search to understand natural language intent. Combined with faceted filtering based on the Property & Attribute System, this domain ensures buyers find exactly what they are looking for, even if they don't use exact terminology.

## 2. Business Objectives
- **Conversion Optimization**: Maximize the Search-to-Click and Search-to-Inquiry conversion rates.
- **Zero-Result Mitigation**: Eliminate "no results found" dead-ends by leveraging vector similarity to always provide the next best alternatives.
- **User Experience**: Provide an instant (< 100ms) search experience with predictive typeahead suggestions.

## 3. Strategic Goals
- P95 latency for a complex hybrid search query must remain under 100ms.
- Semantic search must improve retrieval recall by at least 40% compared to legacy keyword-only systems.
- 100% of the active listing catalog must be searchable within 1 second of publication.

## 4. User Personas
- **Buyer (High Intent)**: Knows exactly what they want (e.g., "3 bedroom apartment near downtown with exposed brick").
- **Buyer (Exploratory)**: Uses broad terms (e.g., "modern office space").
- **Data Analyst**: Monitors search queries to identify supply gaps (e.g., highly searched terms with low inventory).

## 5. Stakeholders
- **Marketplace Intelligence Team**: Relies on search query logs to define platform ontology and taxonomy.
- **Backend Engineering**: Maintains the Elasticsearch / Postgres vector indexes.
- **Sellers**: Rely on the search engine accurately interpreting their listing descriptions.

## 6. User Stories
- As a **Buyer**, I want to search using natural language (e.g., "quiet workspace for a startup") and see listings that match the vibe, not just the exact words.
- As a **Buyer**, I want to filter my search by category, price range, and specific amenities so I don't waste time on irrelevant results.
- As a **Buyer**, as I type in the search box, I want to see instant suggestions so I can find popular categories faster.
- As an **Admin**, I want to see which searches return zero results so I know what supply we need to recruit.

## 7. Functional Requirements
- **FR-SRC-01 (Hybrid Retrieval)**: Execute parallel queries against pgvector (semantic) and BM25 (lexical) and fuse the results via Reciprocal Rank Fusion (RRF).
- **FR-SRC-02 (Faceted Filtering)**: Support strict pre-filtering (Category, Price bounds, Boolean attributes) before vector similarity calculations to guarantee precision.
- **FR-SRC-03 (Typeahead)**: Provide debounced (300ms) query suggestions, category suggestions, and recent searches.
- **FR-SRC-04 (Sorting)**: Support sorting by Relevance (default), Newest, Price (High/Low).
- **FR-SRC-05 (Typo Tolerance)**: Apply fuzzy matching for lexical searches.

## 8. Non-Functional Requirements
- **Performance**: Search query execution (retrieval phase) must complete in < 50ms to allow time for re-ranking.
- **Scalability**: The vector index must handle millions of dense embeddings using HNSW (Hierarchical Navigable Small World) graphs efficiently.
- **Freshness**: New or updated listings must appear in search results (both BM25 and Vector) within 1 second of reaching the ACTIVE state.

## 9. User Workflows
- **Search Flow**: User types in global search bar → Typeahead shows suggestions → User presses Enter → Client sends Query + Active Filters → Gateway routes to Hybrid Search → Results returned → Client renders Grid.
- **Faceted Refinement**: User views results → Clicks "Price < $1000" filter → Client fires new search request with updated filter payload → UI updates instantly.

## 10. State Machines
- **Search Session State**: `INITIATED` → `REFINING` (applying filters) → `CLICKED` / `ABANDONED`.

## 11. Business Rules
- Suspended or Quarantined listings must NEVER be returned in search results.
- Hard filters (e.g., Category = Office) absolutely override semantic similarity (e.g., if a Warehouse is semantically similar, it is still excluded if Category filter is applied).
- Empty queries return the default non-personalized trending feed.

## 12. Permissions
- `search:execute` - Publicly available to all users (Visitor and Authenticated).
- `search:analytics:read` - Internal analytics managers viewing search trends.

## 13. Events Generated
- `discovery.search_executed` (Contains query string, filters applied, result count, execution time).
- `discovery.suggestion_requested`

## 14. Events Consumed
- `marketplace.listing_status_changed` (Triggers index addition/removal).
- `ai.embedding_generated` (Triggers vector index update).

## 15. Analytics Requirements
- Track top 100 search queries daily.
- Measure the "Zero Results Rate" (percentage of queries returning 0 items).
- Track the CTR (Click-Through Rate) by position in search results (e.g., Pos 1 = 20%, Pos 2 = 12%).

## 16. KPIs
- Search-to-Click Conversion Rate.
- Mean Reciprocal Rank (MRR) of clicked items.
- Latency per query.

## 17. Success Metrics
- Zero-results rate drops below 2% due to semantic fallback.
- Search-to-inquiry conversion rate is 1.5x higher than category browsing.

## 18. Edge Cases
- **Index Out of Sync**: The vector DB is lagging behind the primary relational DB. Fallback exclusively to BM25 or relational DB queries for the newest items.
- **Malicious Queries**: Excessively long or malformed queries (e.g., 10,000 characters) should be truncated or rejected immediately with HTTP 400.

## 19. Failure Scenarios
- **Vector DB Outage**: Graceful degradation to purely lexical (BM25) search. UI should hide "Sort by Relevance" and default to "Newest".
- **LLM Embedding API Down**: If new listings cannot be embedded, they are indexed only lexically until the AI API recovers.

## 20. Compliance Requirements
- Search query logs must be anonymized (stripped of PII or IP addresses) if retained for more than 30 days for model training.

## 21. Realtime Requirements
- Typeahead suggestions require persistent, low-latency connections (or aggressive debouncing over HTTP/2).

## 22. AI Requirements
- Real-time generation of user query embeddings using `text-embedding-3-small`.
- NLP Query Parsing: Extracting entities (Price, Location) from natural language ("apartments under $1000") to automatically apply hard filters.

## 23. MVP Scope
- Vector Semantic Search (pgvector HNSW).
- BM25 Keyword Search.
- Basic Faceted Filtering (Category, Price, Tags).
- Typeahead suggestions.

## 24. V1 Scope
- Hybrid Search (RRF fusion of Vector + BM25).
- Search query analytics tracking.
- Saved Searches (alert me when new listings match my query).

## 25. V2 Scope
- NLP Query Parsing (auto-converting text to filters).
- Location-based radial search (GeoJSON).

## 26. Future Enhancements
- Visual Search (upload an image to find visually similar listings).
- Voice Search integration.

## 27. Acceptance Criteria
- [ ] A user can type a query and receive semantically relevant results, even if the exact keyword is not in the listing.
- [ ] Applying a price filter strictly removes all results outside the defined bounds, regardless of semantic similarity.
- [ ] Typeahead suggestions appear within 300ms of typing.
- [ ] Search executes correctly and returns results in < 100ms.
- [ ] A newly published listing appears in search results within 1 second.
