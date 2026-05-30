# 12. AI INFRASTRUCTURE

> **Status**: Approved
> **Target Audience**: AI Engineers, Backend Engineers
> **Domain**: AI & Intelligence

## 1. Executive Summary
The AI Infrastructure layer orchestrates LLMs, Vector Embeddings, and Machine Learning models. Supabase Postgres acts as the state and semantic search engine, while Edge Functions and external AI Gateways handle inference execution.

## 2. Core Components

### 2.1 Prompt Registry (`ai_ops.prompts`)
- Stores versioned system prompts used for Moderation, Content Generation, and Semantic routing.
- **Why**: Hardcoding prompts in Edge Functions requires deployments to tweak AI behavior. Storing them in Postgres allows non-engineers to fine-tune prompts in real-time via the Super Admin UI.

### 2.2 Model Registry (`ai_ops.model_registry`)
- Tracks active models (e.g., `gpt-4o-mini`, `text-embedding-3-small`, `claude-3-haiku`).
- Includes fallback logic. If `gpt-4o` fails 3 times, the gateway automatically routes to the secondary model.

### 2.3 Inference Logs (`ai_ops.inference_logs`)
- Every call made to an external AI provider must be logged with the token usage.
- Used for cost attribution, rate limiting, and analytics.

## 3. AI Operating Model
1. **Request**: Next.js BFF requests "Generate Listing Description."
2. **Token Guard**: Edge Function checks the tenant's token quota in the `billing` schema.
3. **Prompt Fetch**: Edge Function fetches the latest active prompt from the Prompt Registry.
4. **Execution**: Edge Function calls OpenAI API.
5. **Logging**: The inference cost and latency are recorded in `inference_logs` via the Outbox pattern.
6. **Response**: The streamed response is returned to the client.

## 4. AI Experiments & Evaluations
- A/B testing different prompts or models.
- **Evaluations**: Moderation AI outputs are randomly sampled (e.g., 5%) and sent to human review. The divergence rate between human and AI decisions determines the AI's accuracy score.

## 5. AI Governance
- Strict isolation of data. Tenant A's listings cannot be used as context window material for Tenant B's queries unless explicitly shared/published.
- PII must be scrubbed before sending prompts to external providers.
