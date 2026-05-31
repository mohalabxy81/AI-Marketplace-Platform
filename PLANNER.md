# 🔥 MASTER PLATFORM BLUEPRINT (THE PLATFORM CONSTITUTION)

> **Document Status**: Active / Canonical Reference  
> **Architecture Paradigm**: Reactive Cognitive OS-Kernel Hybrid  
> **Target Version**: v1.0.0-Enterprise  
> **Last Updated**: 2026-05-30  

---

## # 1. PLATFORM CONSTITUTION

### Fundamental Definition
The platform is an **AI-Native Multi-Tenant Marketplace Operating Infrastructure**. It does not function as a standard CRUD Software-as-a-Service (SaaS) application. Instead, it acts as a low-latency, real-time, event-driven operating system designed to orchestrate AI agents, data assets, model inference, and real-time discovery feeds. The system is engineered to handle matching complexity, dynamic personalization, and trust boundary isolation at the operational scale of TikTok's discovery pipelines, Amazon's recommendation engines, and Stripe's billing ledgers.

```
       ┌────────────────────────────────────────────────────────┐
       │             COGNITIVE SPACE (User Space)               │
       │  - Model Inference   - Vector Spaces   - Personalization│
       └───────────────────────────┬────────────────────────────┘
                                   │  (Async Event Mesh / gRPC)
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │              KERNEL SPACE (System Space)               │
       │  - Identity Claims   - Tenant RLS      - Token Guard    │
       └────────────────────────────────────────────────────────┘
```

### Platform Philosophy
1.  **AI as Infrastructure**: Model inference, token allocation, embedding computation, and vector space operations are treated as core resource scheduling tasks managed directly within the Kernel Space.
2.  **Discovery is Core**: The primary marketplace driver is the sub-50ms matching of demand (queries, intents) with supply (agents, tools, datasets) through vector similarity and relational filters.
3.  **Intelligence is the Product**: Static databases serve only as raw input signals. The output is a highly personalized feed, dynamically generated on-the-fly and adapting to every user click, scroll, hover, or transaction.
4.  **Operating-System-Like Behavior**: Tenants run arbitrary AI workflows (e.g., custom search weights, background agent runs). The platform serves as the scheduler, protecting shared memory/compute, preventing "noisy neighbor" resource starvation, and enforcing absolute logical and data isolation.

### Architectural Laws
1.  **Zero-Trust Multi-Tenancy**: All HTTP/WebSocket requests must be parsed at the Edge, where a tenant context (using cryptographically signed claims) is injected. Database actions must enforce Row-Level Security (RLS). No internal service call can bypass tenant-scoping parameters.
2.  **Strict Upward Flow**: The core system kernel (Identity, Tenants, Monetization, DB Isolation) has zero dependencies on the Cognitive Space (LLMs, Vector Search, Personalization). If the Cognitive Space experiences provider outages or vector index degradation, core authentication, billing, and basic listing systems must remain 100% functional.
3.  **Eventual Consistency via Asynchronous Event Mesh**: Distributed transactions (such as 2-Phase Commit) are strictly forbidden across domain boundaries. Cross-domain state changes are coordinated using the Event Outbox pattern, ensuring transactional consistency within a service before staging events onto the Event Mesh.

---

## # 2. MASTER PLATFORM ARCHITECTURE

```
Platform Infrastructure
│
├── Identity Systems (AuthN, AuthZ, JWT Signing, Edge claims injection)
├── Tenant Systems (Provisioning, Domain Routing, Dynamic Schema Allocator)
├── Marketplace Intelligence (Vector Store, Dynamically Updated Preference Index)
├── Discovery Infrastructure (Retrieval Filters, Bid Adjusters, Neural Re-ranker)
├── AI Infrastructure (LLM Gateway, Token Guard, Model Cache, Priority Queue)
├── Monetization Infrastructure (Ledger Service, Dynamic Billing Meter, Ad Bids)
├── Trust & Safety Infrastructure (Pre-publish Scan, Anomaly Engine, Quarantines)
├── Analytics Infrastructure (Clickstream Collector, Kafka Event Bus, ClickHouse DB)
├── Realtime Infrastructure (Supabase Realtime, WebSocket Gateway, WAL Listener)
├── Experimentation Infrastructure (A/B Test Router, Multi-Armed Bandits)
├── Governance Infrastructure (Super Admin UI, Schema Migrator, Audit Logs)
└── Core Infrastructure (Postgres RLS cluster, Redis cache tier, S3 Blob Store)
```

### 12-Domain Breakdown

#### 1. Identity Systems
*   **Purpose**: Manages authentication, authorization, and cryptographic signature verification.
*   **Responsibilities**: Issues JWTs containing custom tenant claims (`tenant_id`, `role`, `tier`, `scopes`).
*   **Ownership**: Identity DB Auth schema.
*   **Orchestration**: Operates at the Edge to intercepts all incoming API requests.
*   **Scaling Concerns**: Highly caching public keys (JWKS) to prevent signature verification bottlenecks.
*   **Isolation Boundaries**: Read-only distribution of public keys.
*   **Extraction Strategy**: Can be extracted to a dedicated microservice (e.g., Go/OAuth2) running on isolated Kubernetes pods.

#### 2. Tenant Systems
*   **Purpose**: Handles workspace lifecycle and dynamic routing.
*   **Responsibilities**: Allocates database space, provisions schemas, and maps custom domains.
*   **Ownership**: System registry database.
*   **Orchestration**: Triggers workspace creation routines.
*   **Scaling Concerns**: Scaling routing tables without service restarts.
*   **Isolation Boundaries**: Meta-data database containing plan limits and provisioning statuses.
*   **Extraction Strategy**: Remains within the Core control plane.

#### 3. Marketplace Intelligence
*   **Purpose**: Manages vector preference matrices and user interest representations.
*   **Responsibilities**: Updates user affinity vectors using real-time clickstream events.
*   **Ownership**: Vector Database (pgvector/Pinecone) partitions.
*   **Orchestration**: Runs asynchronous scoring updates from event streams.
*   **Scaling Concerns**: Heavy write amplification during user sessions.
*   **Isolation Boundaries**: Shared physical instances with vector metadata filtering.
*   **Extraction Strategy**: Separate vector indexing workers that process Kafka events.

#### 4. Discovery Infrastructure
*   **Purpose**: Matches buyers with relevant marketplace listings.
*   **Responsibilities**: Runs vector cosine retrieval, candidate filtering, and neural re-ranking.
*   **Ownership**: In-memory search indexes and candidate caches.
*   **Orchestration**: Orchestrates calls to the AI inference gateway for neural re-ranking.
*   **Scaling Concerns**: Enforcing sub-50ms latency budgets during traffic peaks.
*   **Isolation Boundaries**: Caches are partitioned by tenant namespace.
*   **Extraction Strategy**: Fully decoupled search service (Kotlin/gRPC).

#### 5. AI Infrastructure
*   **Purpose**: Unified gateway to all large language models and generation pipelines.
*   **Responsibilities**: Enforces Token Guard limits, manages prompt caching, and handles LLM provider fallbacks.
*   **Ownership**: AI billing logs, inference caches.
*   **Orchestration**: Schedules inference jobs using priority queues.
*   **Scaling Concerns**: Dynamic rate-limiting from upstream API providers.
*   **Isolation Boundaries**: Dedicated execution threads and memory allocations per tenant tier.
*   **Extraction Strategy**: Move to a standalone AI Gateway service (e.g., Rust/Axum).

#### 6. Monetization Infrastructure
*   **Purpose**: Captures platform revenue and tracks usage ledger events.
*   **Responsibilities**: Real-time token metering, promoted listing ad bidding, and Stripe-sync ledgers.
*   **Ownership**: Stripe sync logs and usage-billing Postgres database schema.
*   **Orchestration**: Intercepts events on the mesh to calculate billing increments.
*   **Scaling Concerns**: Writing ledger entries quickly without locking transaction tables.
*   **Isolation Boundaries**: High-security, write-only transactional outboxes.
*   **Extraction Strategy**: Isolated microservice with dedicated ledger database.

#### 7. Trust & Safety Infrastructure
*   **Purpose**: Enforces listing compliance, moderation guidelines, and fraud boundaries.
*   **Responsibilities**: Scans content for toxicity and detects anomalies in reviewer metrics.
*   **Ownership**: Flagged items catalog, moderation rules registry.
*   **Orchestration**: Runs asynchronously on listing submission and message transfers.
*   **Scaling Concerns**: High LLM costs for content evaluation.
*   **Isolation Boundaries**: Isolates flagged assets instantly.
*   **Extraction Strategy**: Completely isolated background moderation workers.

#### 8. Analytics Infrastructure
*   **Purpose**: High-throughput telemetry and clickstream ingestion.
*   **Responsibilities**: Consumes telemetry events and runs real-time analytical queries.
*   **Ownership**: ClickHouse database and Kafka topics.
*   **Orchestration**: Read-only ingestion from the Event Mesh.
*   **Scaling Concerns**: Storing millions of clickstream rows per day.
*   **Isolation Boundaries**: Separate ClickHouse databases or schema-level partitioning by tenant.
*   **Extraction Strategy**: Standalone ClickHouse/Kafka cluster.

#### 9. Realtime Infrastructure
*   **Purpose**: WebSocket connection hub for live data delivery.
*   **Responsibilities**: Broadcasts re-ranked feeds, moderation updates, and message logs.
*   **Ownership**: Connection tables and Supabase Realtime configurations.
*   **Orchestration**: Listens to database WAL streams and pushes state to WebSockets.
*   **Scaling Concerns**: Maintaining tens of thousands of active socket connections.
*   **Isolation Boundaries**: Socket channels scoped by authenticated tenant ID tokens.
*   **Extraction Strategy**: Dedicated Supabase/Elixir socket servers.

#### 10. Experimentation Infrastructure
*   **Purpose**: A/B testing and experimentation logic.
*   **Responsibilities**: Assigns users to experiments, updates multi-armed bandit models.
*   **Ownership**: Experiment registry database.
*   **Orchestration**: Intercepts feed requests to assign variance configurations.
*   **Scaling Concerns**: Consistent variance assignments with zero latency overhead.
*   **Isolation Boundaries**: Scoped within tenant workspaces.
*   **Extraction Strategy**: Library-based implementation in the Gateway level.

#### 11. Governance Infrastructure
*   **Purpose**: Internal control plane for platform operators.
*   **Responsibilities**: Provides global monitoring dashboard, config overrides, and schema migrations.
*   **Ownership**: Super Admin DB schema.
*   **Orchestration**: Master overrides.
*   **Scaling Concerns**: Audit logs storage capacity.
*   **Isolation Boundaries**: Strictly accessible to platform operators only.
*   **Extraction Strategy**: Admin UI and control plane services running on separated node groups.

#### 12. Core Infrastructure
*   **Purpose**: Core storage and persistent database engine.
*   **Responsibilities**: Safe storage of relational data, session cache keys, and asset binaries.
*   **Ownership**: System database, cache partitions, and object buckets.
*   **Orchestration**: The foundation upon which all other services run.
*   **Scaling Concerns**: Connection pool limits, disk IOPS constraints.
*   **Isolation Boundaries**: Distinct disk arrays, VPC network peering.
*   **Extraction Strategy**: Managed cloud infrastructure (RDS Aurora, Redis Cluster).

---

## # 3. MASTER DOMAIN OWNERSHIP MODEL

```
                           ┌──────────────────────────────────────────────┐
                           │              EDGE GATEWAY                    │
                           │   - Authenticates JWT (Identity)             │
                           │   - Resolves Tenant Header (Tenant)          │
                           └──────────────────────┬───────────────────────┘
                                                  │ (Forward Request)
                                                  ▼
 ┌──────────────────────────┐             ┌──────────────────────────────┐
 │    DISCOVERY SERVICE     ├────────────►│     AI INFERENCE GATEWAY     │
 │  - COSINE vector retrieval│  (gRPC)     │  - Token Bucket Scheduler    │
 │  - Candidate matching    │             │  - Semantic Cache Lookup     │
 └───────────┬──────────────┘             └──────────────┬───────────────┘
             │                                           │
             │ (Outbox Event)                            │ (Outbox Event)
             ▼                                           ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │                            EVENT MESH (KAFKA)                         │
 │  Publishes: listing.created, feed.generated, quota.exceeded, etc.    │
 └───────────────────────────────────────────────────────────────────────┘
```

### Domain Ownership Matrix

| Domain | DB Schema Owner | Allowed DB Reads | Allowed DB Writes | Events Published | Events Consumed | API Interfaces |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Identity** | `auth` | `auth` | `auth` | `session_started` | None | JWKS URL, JWT Validate |
| **Tenant** | `tenant_config` | `tenant_config` | `tenant_config` | `tenant_provisioned` | None | Tenant Config resolver |
| **Discovery** | `search_index` | `search_index`, `listings` | `search_index` | `feed_served`, `item_clicked` | `listing_created` | `POST /feed`, `GET /search` |
| **AI Infrastructure** | `ai_cache` | `ai_cache` | `ai_cache`, `usage_log` | `inference_completed`, `quota_exceeded` | None | `POST /v1/chat/completions` |
| **Monetization** | `billing_ledger` | `billing_ledger` | `billing_ledger` | `monetization_event_recorded` | `inference_completed` | `POST /invoices/topup` |
| **Trust & Safety** | `trust_registry` | `trust_registry` | `trust_registry` | `fraud_detected`, `trust_score_updated` | `listing_created` | `POST /moderation/verify` |
| **Analytics** | `clickhouse` | `clickhouse` | `clickhouse` | None | `*` (All events) | `GET /metrics/analytics` |

### Dependency & Boundary Rules
*   **Direct DB Access Ban**: No service may connect directly to databases owned by other domains. If the `Discovery` domain needs tenant tiers, it must query the `Tenant` REST API or subscribe to `tenant_provisioned` updates, caching the information locally.
*   **Outbox Isolation**: Local state changes (e.g., updating user balance) and event generation (e.g., publishing `quota_exceeded`) must be written in the same database transaction using the Outbox pattern. A separate service collector polls the Outbox table and publishes events asynchronously to Kafka.
*   **Anti-Corruption Layer (ACL)**: External service interfaces (like Stripe API or OpenAI API) must run behind an ACL wrapper within the domain service. This shields internal business logic from external API changes.

---

## # 4. MASTER EVENT TAXONOMY

The platform uses a unified asynchronous message format. Every event is written in JSON and must pass schema validation rules defined in the Kotlin `EventSchemaRegistry` class.

### Key Event Schema Contracts

#### 1. `marketplace.listing_created` (v1)
*   **Source**: API Gateway / User dashboard.
*   **Payload Schema**:
```json
{
  "event_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "event_type": "marketplace.listing_created",
  "schema_version": 1,
  "producer_domain": "marketplace",
  "tenant_id": "7b9dcb3d-4bad-3b7d-9bdd-2b0d7b3dcb6d",
  "actor_id": "usr_9b1deb4d-3b7d-4bad",
  "timestamp": "2026-05-30T00:05:00Z",
  "correlation_id": "corr_3b7d-4bad-9bdd",
  "payload": {
    "listing_id": "lst_1b7d-4bad-9bdd",
    "title": "Enterprise RAG Agent Integration Suite",
    "price": 299.00,
    "embedding_vector": [0.015, -0.024, 0.089]
  },
  "metadata": {
    "source": "API",
    "environment": "PRODUCTION"
  }
}
```

#### 2. `discovery.feed_generated` (v1)
*   **Source**: Discovery Engine.
*   **Payload Schema**:
```json
{
  "event_id": "4a1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "event_type": "discovery.feed_generated",
  "schema_version": 1,
  "producer_domain": "discovery",
  "tenant_id": "7b9dcb3d-4bad-3b7d-9bdd-2b0d7b3dcb6d",
  "actor_id": "usr_9b1deb4d-3b7d-4bad",
  "timestamp": "2026-05-30T00:05:01Z",
  "correlation_id": "corr_3b7d-4bad-9bdd",
  "payload": {
    "feed_id": "feed_7b9dcb3d-4bad",
    "candidate_count": 500,
    "selected_candidates": ["lst_1b7d", "lst_2b7d", "lst_3b7d"]
  },
  "metadata": {
    "source": "SYSTEM",
    "environment": "PRODUCTION"
  }
}
```

#### 3. `discovery.ranking_completed` (v1)
*   **Source**: AI Re-ranker.
*   **Payload Schema**:
```json
{
  "event_id": "5a1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "event_type": "discovery.ranking_completed",
  "schema_version": 1,
  "producer_domain": "discovery",
  "tenant_id": "7b9dcb3d-4bad-3b7d-9bdd-2b0d7b3dcb6d",
  "actor_id": "usr_9b1deb4d-3b7d-4bad",
  "timestamp": "2026-05-30T00:05:02Z",
  "correlation_id": "corr_3b7d-4bad-9bdd",
  "payload": {
    "feed_id": "feed_7b9dcb3d-4bad",
    "ranked_count": 25,
    "top_listing_id": "lst_2b7d",
    "scores": {
      "lst_2b7d": 0.942,
      "lst_1b7d": 0.887
    }
  },
  "metadata": {
    "source": "SYSTEM",
    "environment": "PRODUCTION"
  }
}
```

#### 4. `ai.embedding_generated` (v1)
*   **Source**: Ingestion pipeline.
*   **Payload Schema**:
```json
{
  "event_id": "6a1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "event_type": "ai.embedding_generated",
  "schema_version": 1,
  "producer_domain": "ai_infra",
  "tenant_id": "7b9dcb3d-4bad-3b7d-9bdd-2b0d7b3dcb6d",
  "actor_id": "usr_9b1deb4d-3b7d-4bad",
  "timestamp": "2026-05-30T00:05:03Z",
  "correlation_id": "corr_3b7d-4bad-9bdd",
  "payload": {
    "listing_id": "lst_1b7d-4bad-9bdd",
    "embedding_model": "text-embedding-3-small",
    "dimensions": 1536
  },
  "metadata": {
    "source": "SYSTEM",
    "environment": "PRODUCTION"
  }
}
```

#### 5. `analytics.recommendation_served` (v1)
*   **Source**: Clickstream endpoint.
*   **Payload**: Includes `feed_id`, `listings_displayed`, and `placement_indices`.

#### 6. `intelligence.personalization_updated` (v1)
*   **Source**: Intelligence engine.
*   **Payload**: Contains the newly updated preference vector array (length 1536) for the user session.

#### 7. `monetization.quota_exceeded` (v1)
*   **Source**: Token Guard.
*   **Payload**:
```json
{
  "event_id": "7b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "event_type": "monetization.quota_exceeded",
  "schema_version": 1,
  "producer_domain": "billing",
  "tenant_id": "7b9dcb3d-4bad-3b7d-9bdd-2b0d7b3dcb6d",
  "actor_id": "usr_9b1deb4d-3b7d-4bad",
  "timestamp": "2026-05-30T00:05:04Z",
  "correlation_id": "corr_3b7d-4bad-9bdd",
  "payload": {
    "resource_name": "inference_tokens",
    "current_usage": 1500020,
    "limit_amount": 1500000
  },
  "metadata": {
    "source": "SYSTEM",
    "environment": "PRODUCTION"
  }
}
```

#### 8. `trust.fraud_detected` (v1)
*   **Source**: Trust engine.
*   **Payload**: Contains `actor_id`, `risk_score` (between 0.0 and 1.0), and a list of flagged policy reasons (e.g. `["rapid_tenant_switching", "unusual_price_spike"]`).

#### 9. `trust.trust_score_updated` (v1)
*   **Source**: Moderation ledger.
*   **Payload**: Contains `target_tenant_id` and the newly calculated global reputation weight.

#### 10. `monetization.monetization_event_recorded` (v1)
*   **Source**: Event collector.
*   **Payload**: Contains billing resource keys, quantities, and prices to calculate stripe ledger invoices.

---

## # 5. MASTER DATA FLOW ARCHITECTURE

### 1. Interactive Feed Generation Flow
```
[Client App] ──────1. GET /feed ────► [API Gateway] ─────2. AuthN/AuthZ Check ──► [Identity DB]
     ▲                                      │
     │                                      ├─3. Fetch Tenant context ──► [Tenant DB]
     │                                      ▼
[WebSocket] ◄───6. Push ranked items ─── [Discovery Engine] 
     ▲                                      │
     │                                      ├─4. Query vectors (pgvector)
     │                                      ▼
[Realtime] ◄────5. Broadcast ─────────── [Neural Re-ranker] ◄─── Model inference
```

### 2. User Clickstream Personalization Loop
```
[Client User Action] 
       │ (Clicks, hovers, scroll depth metrics)
       ▼
[Edge Collect API] ──► [Kafka Stream] ──► [ClickHouse Analytics Engine]
                                               │
                                               ▼ (Triggers dynamic affinity evaluation)
[Dynamic Preference Update] ◄──────────────────┘
       │
       ▼
[Redis Cache Update] (Stores user preferences at O(1) read latency)
```

### 3. Secure Asset Ingestion and Moderation Flow
```
[Listing Submission] ──► [Postgres DB (Stage 0: Unverified)]
                               │
                               ▼ (Transactional Outbox triggers WAL)
                       [Postgres WAL Listener] ──► [Kafka Event Bus]
                                                         │
                        ┌────────────────────────────────┴────────────────────────────────┐
                        ▼                                                                 ▼
             [LLM Moderation Worker]                                           [Embedding Generation Worker]
             (Checks text content for toxicity)                                (Generates vector embeddings)
                        │                                                                 │
                        ▼ (If moderation checks pass)                                     ▼ (Updates search indices)
             [Postgres DB (Stage 1: Verified)] ────────────────────────────────► [Vector Database (pgvector)]
                        │
                        ▼ (Broadcasting updates)
             [Realtime Notification Engine] ──► [Client WebSocket Feed Update]
```

---

## # 6. PLATFORM INTELLIGENCE MODEL

The marketplace engine runs on a **Dual-Loop Adaptive Learning Architecture** designed to balance real-time user session behavior with offline data calculations.

```
       ┌────────────────────────────────────────────────────────┐
       │             FAST LOOP (Online - Sub-Second)            │
       │  User interaction ──► In-Memory Vector Adjustments     │
       └───────────────────────────┬────────────────────────────┘
                                   │ (Aggregates logs daily)
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │             SLOW LOOP (Offline - Batch Runs)           │
       │  Kafka Logs ──► ClickHouse warehouse ──► Index rebuild│
       └────────────────────────────────────────────────────────┘
```

### Fast-Loop Personalization (Online)
*   **Trigger**: Real-time click, view duration (>3 seconds), hover duration (>1 second), or purchase events.
*   **Data Flow**: 
    1.  The client publishes telemetry events to `/metrics/clickstream`.
    2.  An in-memory processing worker computes a rolling weight average on the user preference vector:
        $$\vec{V}_{user(t)} = \alpha \cdot \vec{V}_{user(t-1)} + (1 - \alpha) \cdot \vec{V}_{item}$$
        Where $\alpha$ is the decay rate (default = `0.85`), and $\vec{V}_{item}$ is the vector representation of the clicked item.
    3.  The updated vector is saved back into the Redis session cache.
*   **Result**: The user's next feed query retrieves updated matching candidates without executing disk-heavy database updates.

### Slow-Loop Evolution (Offline)
*   **Trigger**: Daily cron schedule.
*   **Data Flow**:
    1.  Kafka logs are processed and saved in the ClickHouse analytical database.
    2.  The batch trainer calculates listing relationship statistics and recalibrates collaborative filtering weights.
    3.  A model builder regenerates global embedding profiles and builds new HNSW search indexes in the postgres vector engine.

---

## # 7. MASTER AI OPERATING MODEL

```
                           ┌───────────────────────────┐
                           │    Inference Gateway      │
                           └─────────────┬─────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
        [Token Guard Engine]    [Model Cache Engine]    [Queue Scheduler Engine]
```

### AI Lifecycle Phases

1.  **Inference Gateway**: Acts as the single entry-point for LLM interactions. It routes queries to providers (OpenAI, Anthropic, or local open-source models) using cost-based rules and active rate-limit tracking.
2.  **Token Guard Engine**: Validates tenant billing budgets. The Token Guard implements a leaky-bucket algorithm scoped to each tenant ID. If a tenant's token quota is exhausted, the Gateway drops non-critical inference requests and emits a `monetization.quota_exceeded` event to the mesh.
3.  **Model Cache Engine**: Implements semantic response caching. Before sending requests to external LLM providers, the gateway calculates a hash embedding of the prompt and queries Redis for matches using a cosine distance threshold:
    $$\text{Similarity}(\vec{Q}, \vec{K}) \ge 0.96$$
    If a hit is found, the cached response is returned, reducing execution latency and cutting LLM token usage costs.
4.  **Queue Scheduler Engine**: Categorizes execution tasks:
    *   *High-Priority Queue*: Real-time chat messages and user-facing search queries. Runs on dedicated thread pools with a 200ms completion target.
    *   *Low-Priority Queue*: Background vector embedding generation and safety scans. Processes tasks in batches during low-traffic periods.

---

## # 8. MASTER DISCOVERY OPERATING MODEL

The discovery engine runs search operations through a multi-stage retrieval pipeline designed to optimize candidate matching speed and re-ranking accuracy.

```
  [Candidate Pools (Listings, Agents, Tools)]  (N = 100,000+)
                      │
                      ▼ (Vector Cosine Similarity Search)
  [Stage 1: Retrieval Filter]                  (N = 500)
                      │
                      ▼ (Multi-Armed Bandit / sponsored boost / trust score)
  [Stage 2: Light Ranking]                     (N = 100)
                      │
                      ▼ (Neural Re-ranker / Personalization)
  [Stage 3: Heavy Re-Ranking]                  (N = 25)
                      │
                      ▼ (Real-time Web UI Feed Output)
```

### Retrieval & Ranking Stages

*   **Stage 1: Retrieval (Candidate Generation)**
    Queries are matched against vector indexes using cosine distance:
    ```sql
    SELECT listing_id, (embedding_vector <=> :query_vector) as distance
    FROM listings
    WHERE tenant_id = :tenant_id AND status = 'active'
    ORDER BY distance ASC
    LIMIT 500;
    ```
    This stage targets a execution budget of `<15ms`.

*   **Stage 2: Light Ranking (Ad Bids & Trust Adjustments)**
    Filters the initial 500 candidates down to 100 items using static metadata scores:
    $$\text{Score}_{light} = (1.0 - \text{Distance}) \cdot \text{TrustScore}_{tenant} \cdot (1.0 + \log(1.0 + \text{BidCPC}))$$
    Where $\text{TrustScore}_{tenant}$ ranges from `0.2` to `1.0` (penalizing fraudulent listings), and $\text{BidCPC}$ is the cost-per-click modifier set by promoted ad campaigns.

*   **Stage 3: Heavy Re-Ranking (Personalized Neural Alignment)**
    Passes the top 100 candidates to a Cross-Encoder scoring model to evaluate semantic similarity against the user's vector preference profile. Returns the top 25 sorted items.

*   **Stage 4: Exploration / Exploitation Engine**
    Applies an Epsilon-Greedy strategy ($\epsilon = 0.10$). Ten percent of the final feed is allocated to new listings or unexplored categories. This updates candidate impressions, prevents feedback loop stagnation, and surfaces fresh products.

---

## # 9. MASTER MONETIZATION OPERATING MODEL

The monetization framework manages invoicing, tracking, and balance verification.

```
  [Billing Ledger] ◄── Usage Events ◄── [Token Metering Engine] ◄── API Requests
         │
         ▼ (Sponsored Auction Modifiers)
  [Discovery Engine] ◄── Ad Auction Engine ◄── Bids (CPM/CPC) ◄── Tenants
```

### Usage Metering Pipeline
*   Every model call, vector calculation, and storage change publishes usage details directly to the local transactional outbox.
*   The billing service processes these outbox logs to construct the ledger:
    $$\text{Cost}_{total} = \sum (\text{Tokens}_{in} \cdot R_{in}) + \sum (\text{Tokens}_{out} \cdot R_{out}) + \sum (\text{VectorOps} \cdot R_{vec})$$
    Where $R$ values represent dynamic rates configured for the tenant's current plan.
*   *Ledger Integrity*: Ledger entries are write-only. Adjustments or refunds create offsetting lines, keeping a clean audit trail.

### Promoted Listings Auction Engine
*   Tenants configure CPC/CPM bids on specific keywords or search vector categories.
*   The auction engine processes bids in real time using a generalized second-price model. The winning tenant pays the minimum bid needed to stay ahead of the next competitor:
    $$\text{Price}_{charged} = \text{Bid}_{runner\_up} + 0.01$$
*   This model encourages honest pricing and aligns ranking weights with platform monetization goals.

---

## # 10. MASTER TRUST & SAFETY OPERATING MODEL

```
                       +───────────────────────────+
                       │    Content Submission     │
                       +─────────────┬─────────────+
                                     │
               +─────────────────────┴─────────────────────+
               ▼                                           ▼
   [Pre-Publish LLM Check (Async)]             [Post-Publish Behavioral Engine]
   - Vector similarity toxicity score           - Suspicious activity detection
   - Instant quarantine flag                    - Account pattern locks
```

### Security Workflow
1.  **Pre-Publish Scans**: When a tenant uploads a listing, it is marked as `quarantined` and queued for verification. The safety worker runs:
    *   *Toxicity Verification*: Evaluates text descriptions against common spam/toxicity templates using cosine checks on banned vector namespaces.
    *   *LLM Guardrails*: Scans model instructions for prompt injection markers.
2.  **Escalation Queue**: Content flagging matches trigger a `trust.fraud_detected` event. The listing is held in quarantine, and an alert is pushed to the Super Admin Moderation queue via WebSockets.
3.  **Behavioral Engine**: Monitors active interaction profiles. If a tenant shifts from low-volume testing to high-frequency requests, the trust engine triggers a lockout action, suspends the account, and alerts operators.

---

## # 11. MASTER ANALYTICS & OBSERVABILITY MODEL

```
  System Logs / Trace Spans ➔ Vector OpenTelemetry Agent ➔ Prometheus / Jaeger
                                                                   │
                                                                   ▼
  Clickstream telemetry / metrics ➔ Apache Kafka ➔ ClickHouse ➔ Analytics API
```

### Ingestion & Tracing Pipelines
*   **Trace Context Propagation**: All incoming Edge requests are stamped with a unique `x-correlation-id` header. This ID is passed across all internal gRPC service calls and Kafka event message headers.
*   **ClickHouse Analytics**: Real-time clickstream event logs are stored directly in a ClickHouse database using a Kafka integration engine. This architecture handles millions of daily records while keeping analytical search latencies below 100ms.
*   **Explainability Console**: The Discovery Engine logs re-ranking decisions in an explainability index:
```json
{
  "feed_id": "feed_7b9dcb3d",
  "listing_id": "lst_1b7d",
  "final_rank": 1,
  "features": {
    "vector_similarity": 0.892,
    "personalization_alignment": 0.941,
    "sponsored_boost": 0.05,
    "trust_score_penalty": 0.00
  }
}
```
Super Admins use this data to inspect ranking decisions and resolve query logic issues.

---

## # 12. MASTER REALTIME INFRASTRUCTURE

The realtime message framework uses a PostgreSQL WAL listener to broadcast state changes over active WebSocket connections.

```
  [Database Mutation] ➔ [PostgreSQL WAL / pg_net] ➔ [Supabase Realtime] ➔ [WebSockets Client]
```

### Channel Topology
*   `tenant_feed:<tenant_id>`: Listens to search, ranking, and catalog updates.
*   `tenant_moderation:<tenant_id>`: Dedicated channel for moderation locks and validation warnings.
*   `platform:global`: System-wide maintenance announcements.

### Realtime Scale Rules
1.  **Connection Management**: Realtime traffic is handled by independent Supabase connection pools, isolating websocket state from core PostgreSQL API execution threads.
2.  **Backpressure Handling**: If a client's websocket falls behind on consuming events, the message queue drops old updates and sends a sync signal, prompting the client to refresh its state via REST.

---

## # 13. MASTER TENANT ISOLATION MODEL

The platform enforces absolute isolation boundaries across compute, cache, and database layers to guarantee data security.

```
       ┌────────────────────────────────────────────────────────┐
       │                   API GATEWAY / EDGE                   │
       │  Authenticates JWT ──► Injects x-tenant-id claim       │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                  POSTGRESQL INSTANCE                   │
       │  Sets app.current_tenant_id context variable          │
       │  Enforces Row-Level Security (RLS) policies           │
       └────────────────────────────────────────────────────────┘
```

### Isolation Strategies

*   **Database Isolation (RLS)**
    All tenant-owned tables must define a `tenant_id` column and enable Row-Level Security:
    ```sql
    ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY tenant_isolation_policy ON listings
      USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
    ```
    Every database connection session sets the active tenant context before executing queries.

*   **Vector Database Separation**
    Vector search queries must enforce tenant filters to prevent vector space leakage:
    ```sql
    SELECT * FROM listings
    WHERE tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid
    ORDER BY embedding <=> :query_embedding
    LIMIT 25;
    ```

*   **Cache Segmentation**
    Redis keys use tenant-scoped namespaces:
    `tenant:{tenant_id}:{user_id}:preference_vector`
    This namespace structure simplifies cache eviction and ensures clear tenant boundaries.

---

## # 14. MASTER INFRASTRUCTURE EVOLUTION STRATEGY

The system starts as a modular monolith to simplify deployment and testing. As individual components hit scale bottlenecks, they are extracted into independent microservices.

```
  [Modular Monolith]
    ├── Core Auth Domain
    ├── Monetization Domain  ──► (CPU Spikes) ──► [Extracted Billing Service]
    └── Discovery Domain     ──► (Throughput) ──► [Extracted Discovery Engine]
```

### Extraction Triggers & Thresholds
1.  **Discovery Engine Extraction**: Extract when vector search queries consume >40% of the core PostgreSQL database's CPU and disk IOPS capacity.
    *   *Target Architecture*: Move to a dedicated vector index cluster (e.g. Milvus/Pinecone) using Kafka for asynchronous sync pipelines.
2.  **Inference Gateway Extraction**: Extract when the concurrency of LLM prompt completions causes database connection starvation.
    *   *Target Architecture*: Extract to an independent Rust service utilizing token-bucket rate limits and asynchronous gRPC connections.

---

## # 15. MASTER PLATFORM BOTTLENECK ANALYSIS

| Bottleneck Category | System Trigger | Core Infrastructure Risk | Engineering Mitigation |
| :--- | :--- | :--- | :--- |
| **Vector Index Locks** | High write rates during agent creations | Degradation of search search latency | Run vector index builds on background threads; use temporary vector index segments. |
| **Inference Latency** | Network issues with upstream LLM providers | Starvation of thread pools, API gateway timeouts | Semantic response caching in Redis; configure local backup models (e.g. Llama-3-8B). |
| **RLS Performance** | Nested subqueries in policy checks | High Postgres CPU load on table joins | Inject tenant context via JWT claims at the gateway; avoid runtime DB checks in RLS policies. |
| **Realtime Connection Scale** | Traffic spikes causing websocket disconnects | Connection limits on PostgreSQL | Dedicated Supabase connection pools; drop old messages if client consumption lags. |
| **Ledger Write Speed** | High volume of usage events | Lock issues on billing transaction tables | Write usage metrics to Kafka first; process in batches using background ledger workers. |
| **Analytics Stream** | Millions of daily clickstream events | IO bottlenecks on ClickHouse storage | Run clickstream ingestion using Kafka pipelines; aggregate analytics before writing to disk. |
| **Tenant Storage Limits** | Massive media uploads or log accumulation | Disk capacity issues on DB volumes | Store large assets in S3 buckets; configure automated log retention and archiving policies. |

---

## # 16. MASTER ENGINEERING EXECUTION ROADMAP

```
                    ┌──────────────────────────────┐
                    │ Phase 1: Governance Found.   │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ Phase 2: Core Infrastructure │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ Phase 3: Discovery Intell.   │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                             [Phases 4 - 9]
```

### Phase Breakdown

#### Phase 1 — Governance Foundation
*   **Objectives**: Setup Super Admin RBAC role rules, database schemas, and Next.js authorization middleware.
*   **Dependencies**: None.
*   **Complexity**: Medium.
*   **Implementation Risks**: Edge role injection configuration issues.
*   **Scalability Impact**: Minimal.
*   **Operational Readiness**: Health checks on Auth gateway.
*   **Validation Requirements**: Verification scripts verify that unauthorized users are rejected.

#### Phase 2 — Core Infrastructure
*   **Objectives**: Integrate Postgres database RLS policies, Redis cache layers, and Supabase WebSockets.
*   **Dependencies**: Phase 1.
*   **Complexity**: High.
*   **Implementation Risks**: RLS performance bottlenecks.
*   **Scalability Impact**: 10x connection limit improvements.
*   **Operational Readiness**: Database pool sizing configs.
*   **Validation Requirements**: Verify that queries do not leak tenant data.

#### Phase 3 — Discovery Intelligence
*   **Objectives**: Set up vector indexes on `pgvector`, build search workflows, and configure re-ranking processes.
*   **Dependencies**: Phase 2.
*   **Complexity**: High.
*   **Implementation Risks**: Dynamic index rebuild times.
*   **Scalability Impact**: Enforces sub-50ms query limits.
*   **Operational Readiness**: Vector indexing metrics tracking.
*   **Validation Requirements**: Validate precision of candidate matches.

#### Phase 4 — AI Infrastructure
*   **Objectives**: Configure LLM gateway, Token Guard scheduler, and Redis prompt caches.
*   **Dependencies**: Phase 3.
*   **Complexity**: High.
*   **Implementation Risks**: Upstream provider latency.
*   **Scalability Impact**: 80% cache hit rates.
*   **Operational Readiness**: Cache invalidation configurations.
*   **Validation Requirements**: Verify that requests stop when budget is exceeded.

#### Phase 5 — Monetization Intelligence
*   **Objectives**: Connect Stripe webhooks, build usage ledger database tables, and configure ad auctions.
*   **Dependencies**: Phase 4.
*   **Complexity**: High.
*   **Implementation Risks**: Double-billing issues.
*   **Scalability Impact**: Zero-downtime ledger pipelines.
*   **Operational Readiness**: Billing alert webhooks.
*   **Validation Requirements**: Audit that billed costs match ledger outputs.

#### Phase 6 — Trust & Safety
*   **Objectives**: Pre-publish moderation queues and behavioral anomaly checks.
*   **Dependencies**: Phase 5.
*   **Complexity**: Medium.
*   **Implementation Risks**: High false-positive rates.
*   **Scalability Impact**: Minimal.
*   **Operational Readiness**: Manual review console setup.
*   **Validation Requirements**: Verify that toxic inputs trigger quarantines.

#### Phase 7 — Distributed Scaling
*   **Objectives**: Transition outbox tables to Apache Kafka streams and move vectors to dedicated indexes (Milvus/Pinecone).
*   **Dependencies**: Phase 6.
*   **Complexity**: Very High.
*   **Implementation Risks**: Message loss during transitions.
*   **Scalability Impact**: Horizontal scale capabilities.
*   **Operational Readiness**: Kafka replica monitoring configs.
*   **Validation Requirements**: Zero data loss during streaming tests.

#### Phase 8 — Production Infrastructure
*   **Objectives**: Setup Kubernetes cluster, auto-scaling parameters, and Multi-AZ database mirrors.
*   **Dependencies**: Phase 7.
*   **Complexity**: High.
*   **Implementation Risks**: Ingress configuration mismatches.
*   **Scalability Impact**: Active-Active multi-zone availability.
*   **Operational Readiness**: Chaos testing exercises.
*   **Validation Requirements**: Auto-recovery happens within 30 seconds of node failures.

#### Phase 9 — Global Optimization
*   **Objectives**: Multi-region database replication and global edge vector distribution.
*   **Dependencies**: Phase 8.
*   **Complexity**: Very High.
*   **Implementation Risks**: Data partition sync issues.
*   **Scalability Impact**: Multi-continent sub-50ms latency.
*   **Operational Readiness**: Cross-region routing health checks.
*   **Validation Requirements**: Verify data replicates successfully to all target regions.

### Post-Launch Strategic Roadmaps

Beyond the foundational engineering phases, the long-term strategic evolution of the platform is defined by the following master blueprints:
*   **[AI Evolution Roadmap](file:///home/mohal665544/pr1/AI_EVOLUTION_ROADMAP.md)**: A 36-month, 7-phase strategy (AI-Enhanced → AI-Native → AI Agent Platform → Autonomous Marketplace Ecosystem) detailing deep designs for agent tooling, memory, multi-agent catalog, and sovereign multi-tenant AI.
*   **[Enterprise Expansion Blueprint](file:///home/mohal665544/pr1/ENTERPRISE_EXPANSION_BLUEPRINT.md)**: A complete 24-month plan to scale the platform into an enterprise-grade SaaS ecosystem, specifying SSO (SAML/OIDC), SCIM 2.0 provisioning, ABAC/PBAC authorization, SOC 2 / HIPAA compliance profiles, multi-region active-active tenancy, and the holding company model.
*   **[Global Scale Architecture](file:///home/mohal665544/pr1/GLOBAL_SCALE_ARCHITECTURE.md)**: A planet-scale distributed operating infrastructure strategy supporting 10M+ users, 100M+ daily events, and 100K+ concurrent companies across multiple continents, defining multi-region active-active database sharding, Anycast BGP networking, decentralized GPU AI routing, and unified global compliance meshes.
*   **[Data Platform & BI Blueprint](file:///home/mohal665544/pr1/docs/specs/43-STEP-AP-DATA-PLATFORM-BI-BLUEPRINT.md)**: A complete design for the real-time event analytics platform, ClickHouse OLAP databases, materialized views, and business intelligence frameworks.
*   **[Security & Compliance Enterprise Package](file:///home/mohal665544/pr1/docs/specs/44-STEP-AQ-SECURITY-COMPLIANCE-ENTERPRISE-PACKAGE.md)**: A 34-section board-grade zero-trust security operating model, vulnerability patching pipelines, and compliance audit frameworks (SOC 2, ISO 27001, GDPR, EU AI Act).
*   **[Capital & Governance Enterprise Package](file:///home/mohal665544/pr1/docs/specs/45-STEP-AR-CAPITAL-GOVERNANCE-ENTERPRISE-PACKAGE.md)**: A board-grade enterprise operating model, board of directors committees, venture fundraising roadmaps, M&A readiness playbooks, regional tax entity setups, and IPO/SOX compliance programs.

---

## # 17. MASTER PLATFORM PRINCIPLES

1.  **AI-First Design**: Platform workflows assume intelligence inputs are dynamic. Hardcoded logic paths must give way to adaptive scoring parameters.
2.  **Zero-Trust Isolation**: Isolate all tenant resources at every layer: Compute, Storage, Memory, and Vector.
3.  **Async Event-Driven Core**: Coordinate domain actions using event schemas. Synchronous cross-domain calls are an anti-pattern.
4.  **Observability by Design**: Ensure every inference decision and re-ranking result is traceable, logged, and explainable.
5.  **Zero-Redesign Evolution**: System components must enforce interfaces that allow modular microservice extraction without rewriting core domains.
6.  **Realtime-First Thinking**: The UI should never "pull-to-refresh". The system pushes state changes directly to the client via WebSockets.
7.  **Socratic Gatekeeping**: All design shifts, code changes, or domain modifications must undergo review to assess trade-offs.
8.  **Strict Anti-Corruption Barriers**: External integration details must reside behind domain wrappers to protect core database systems.
9.  **Noisy Neighbor Elimination**: Compute and memory limits are strictly enforced on all background agent processes.
10. **Ledger Immutability**: Usage, financial, and trust scores use write-only ledgers to guarantee auditing records.
