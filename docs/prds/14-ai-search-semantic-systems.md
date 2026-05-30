# PRD 14 — AI SEARCH & SEMANTIC SYSTEMS

> **Status**: Approved
> **Target Audience**: Engineering, AI/ML Teams, Data Engineering
> **Domain**: AI Systems

## 1. Executive Summary
The AI Search & Semantic Systems domain is responsible for generating, managing, and indexing the dense vector embeddings that power the Discovery and Recommendation engines. It acts as a translation layer, converting raw text (listing descriptions, search queries) into mathematical representations (vectors). This system manages the lifecycle of these embeddings, ensuring they are always synchronized with the relational database.

## 2. Business Objectives
- **Enable Semantic Discovery**: Provide the mathematical foundation required for the platform to understand "meaning" rather than just "keywords."
- **Data Synchronization**: Guarantee that the vector space accurately and immediately reflects the current state of active platform inventory.

## 3. Strategic Goals
- Generate new embeddings for a listing update in < 500ms.
- Support a vector index scale of up to 10M active listings using pgvector with HNSW indexing.
- Ensure 99.9% consistency between relational listing data and vector index data.

## 4. User Personas
- **AI Engineer**: Manages the embedding models and tunes index parameters (`m`, `ef_construction`).
- **Data Engineer**: Monitors the sync pipelines and resolves synchronization drift.
- **Backend Engineer**: Integrates vector searches into the application logic.

## 5. Stakeholders
- **Discovery Team**: Consumers of the vector index.
- **Finance Team**: Monitors the cost of continuous embedding generation via OpenAI APIs.

## 6. User Stories
- As an **AI Engineer**, I want to rebuild the entire vector index in the background without causing downtime, so I can migrate to a better embedding model.
- As a **Data Engineer**, I want an automated daily job that checks for missing vectors and repairs them, so our search results are never missing data.
- As a **Platform Consumer**, when I update a listing's description, I want its embedding to update instantly so search results reflect my changes.

## 7. Functional Requirements
- **FR-SEM-01 (Embedding Generation)**: Queue-based worker to convert text to vectors via `text-embedding-3-small` (1536d).
- **FR-SEM-02 (Vector Indexing)**: Store vectors in Postgres using `pgvector` and index them using HNSW (Hierarchical Navigable Small World).
- **FR-SEM-03 (Triggered Sync)**: Database triggers or CDC (Change Data Capture) must queue an embedding job whenever a listing's textual fields change.
- **FR-SEM-04 (Batch Re-indexing)**: Support bulk re-generation of vectors for schema migrations.
- **FR-SEM-05 (Tenant Isolation)**: Ensure vector queries can be strictly filtered by `tenant_id` at the index level to prevent data leakage and improve retrieval speed.

## 8. Non-Functional Requirements
- **Performance**: HNSW index queries must return top-K results in < 20ms.
- **Resilience**: The embedding worker queue must support exponential backoff for API rate limits.

## 9. User Workflows
- **Listing Update Flow**: Seller updates Listing Description → DB writes change → CDC Event published → Semantic Worker picks up event → Calls OpenAI Embedding API → Writes vector to pgvector DB → Updates HNSW index.

## 10. State Machines
- **Embedding Status**: `PENDING` → `EMBEDDED` (or `FAILED`).

## 11. Business Rules
- Embeddings are only generated for listings in `PENDING_REVIEW`, `ACTIVE`, or `ARCHIVED` states. `DRAFT` listings do not consume embedding API costs.
- Queries against the vector DB must always pre-filter by `status = 'ACTIVE'` to avoid retrieving dead links.

## 12. Permissions
- `admin:vectors:read` - Read index health stats.
- `admin:vectors:write` - Trigger manual re-index jobs.

## 13. Events Generated
- `ai.embedding_generated`
- `ai.index_rebuild_completed`

## 14. Events Consumed
- `marketplace.listing_updated`
- `marketplace.listing_created`

## 15. Analytics Requirements
- Track embedding generation volume per day.
- Monitor HNSW index memory consumption.
- Track index recall accuracy metrics (during offline evaluations).

## 16. KPIs
- Embedding Generation Latency.
- Vector Index Query Latency.
- Zero-Sync-Drift (Number of active listings missing an embedding).

## 17. Success Metrics
- 100% of ACTIVE listings have a valid, up-to-date embedding.
- Search latency remains stable even as the index grows from 100k to 1M items.

## 18. Edge Cases
- **Mass Update**: A Category is renamed, causing 50,000 listings to technically "update." The embedding queue must throttle these jobs to avoid hitting OpenAI rate limits while prioritizing user-initiated updates.

## 19. Failure Scenarios
- **Embedding API Timeout**: Queue the item for retry. Do not block the listing from going ACTIVE; it will simply be retrievable only via BM25 until the vector completes.

## 20. Compliance Requirements
- None directly, as embeddings are mathematical representations, but underlying text must be purged if the listing is hard-deleted.

## 21. Realtime Requirements
- Embedding updates must occur asynchronously but as close to real-time as possible (target: < 1 second).

## 22. AI Requirements
- OpenAI `text-embedding-3-small` (MVP).
- Strategy to handle multi-lingual embeddings.

## 23. MVP Scope
- Automated generation of embeddings on listing creation/update.
- Storage in pgvector with basic IVFFlat or HNSW index.

## 24. V1 Scope
- HNSW indexing with tenant pre-filtering.
- Drift detection cron job.

## 25. V2 Scope
- Dedicated vector database (e.g., Pinecone/Milvus) if Postgres CPU scaling becomes a bottleneck.

## 26. Future Enhancements
- Multi-modal embeddings (combining text and image vectors).

## 27. Acceptance Criteria
- [ ] Saving a new listing automatically generates a 1536-dimensional vector.
- [ ] The vector is saved to the database.
- [ ] Running a semantic search accurately retrieves this listing.
- [ ] Updating the listing's description generates a new vector, replacing the old one.
