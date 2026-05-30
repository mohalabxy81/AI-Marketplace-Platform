# 8. PGVECTOR ARCHITECTURE

> **Status**: Approved
> **Target Audience**: AI Engineers, DBAs
> **Domain**: AI Infrastructure & Discovery

## 1. Executive Summary
The `pgvector` extension powers the core intelligence of the marketplace. By storing semantic embeddings directly adjacent to the relational data, we enable ultra-fast Hybrid Search (combining exact keyword/filter matches via traditional Postgres indexes with semantic similarity matching).

## 2. Embedding Architecture

### `ai_ops.listing_embeddings`
- **Purpose**: Represents the semantic meaning of a marketplace listing (Description, Title, Attributes).
- **Format**: `vector(1536)` (Optimized for OpenAI `text-embedding-3-small`).
- **Generation**: Triggered asynchronously via Edge Function upon listing creation/update.

### `ai_ops.user_preference_embeddings`
- **Purpose**: Represents a buyer's dynamic preferences based on their clickstream history (Personalization Engine).
- **Format**: `vector(1536)`.
- **Generation**: Recalculated periodically (EMA - Exponential Moving Average) based on clicked listing vectors.

### `ai_ops.search_query_embeddings`
- **Purpose**: Represents the buyer's text search query to match against listing embeddings.
- **Format**: `vector(1536)`.
- **Generation**: Generated on the fly at the edge during a search request.

## 3. Retrieval Lifecycle (Hybrid Search)
1. **Query Input**: User types "Quiet space for focus work".
2. **Edge Processing**: The Next.js API or Edge Function calls OpenAI to generate a vector for the query.
3. **Database Execution**: A custom Postgres function executes a Hybrid Search.
   - **Filter**: Applies hard RLS and explicit filters (e.g., `price < 500`, `status = 'PUBLISHED'`).
   - **Semantic Match**: Calculates cosine distance (`<=>`) against the remaining vectors.
   - **FTS Match**: Calculates Full-Text Search (BM25) rank.
   - **Reciprocal Rank Fusion (RRF)**: Combines the vector score and FTS score into a final rank.
4. **Return**: Sub-50ms return of the top 20 candidates.

## 4. Indexing Strategy
To ensure similarity search scales beyond 100k+ rows while maintaining low latency, we use **HNSW** (Hierarchical Navigable Small World) indexes.

```sql
CREATE INDEX idx_listing_embeddings_hnsw ON ai_ops.listing_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```
- **Trade-offs**: HNSW requires more RAM and slightly slower build times than IVFFlat, but offers significantly faster retrieval speeds without requiring a pre-training step.

## 5. Embedding Refresh Lifecycle
- When a listing's core text (`title`, `description`) is modified, a trigger fires adding an event to the Outbox.
- An Edge Function consumes the event, calls the Embedding API, and `UPDATE`s the vector row.
- Old embeddings are completely overwritten; historical vector storage is unnecessary as semantic meaning relies strictly on the current text state.

## 6. Versioning Strategy
If the platform migrates to a new embedding model (e.g., from `1536` dims to `3072` dims), a new column (e.g., `embedding_v2`) must be created. An async background job will backfill the new column. Once complete, the search functions will cut over to the new column, and `embedding_v1` will be dropped. Vectors from different models cannot be compared.
