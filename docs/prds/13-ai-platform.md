# PRD 13 — AI PLATFORM

> **Status**: Approved
> **Target Audience**: Engineering, AI/ML Teams, DevOps
> **Domain**: AI Systems

## 1. Executive Summary
The AI Platform is the foundational infrastructure that enables all LLM and machine learning features across the marketplace. Rather than allowing individual microservices to call OpenAI or Anthropic directly, this platform acts as a centralized Inference Gateway. It handles prompt routing, semantic caching, provider failovers, token metering (quotas), and model versioning. This ensures the platform remains provider-agnostic, cost-efficient, and highly available.

## 2. Business Objectives
- **Cost Control**: Strictly control and meter LLM inference costs per tenant to ensure positive unit economics.
- **Provider Independence**: Prevent vendor lock-in by standardizing inputs/outputs across OpenAI, Anthropic, and open-source models (Llama).
- **Performance**: Reduce LLM response latency by aggressively caching frequent or highly similar prompts.

## 3. Strategic Goals
- Maintain a Semantic Cache hit rate of > 30% for high-volume endpoints (e.g., semantic search embedding generation).
- Guarantee 99.99% inference availability through automated provider fallback chains.
- Track token usage with 100% accuracy for billing reconciliation.

## 4. User Personas
- **Platform Engineer**: Configures the gateway, API keys, and model routing rules.
- **AI/ML Researcher**: Tests new prompts and models in the experiment registry.
- **Tenant**: Consumes AI capabilities implicitly (e.g., moderation) or explicitly (e.g., listing enhancement).

## 5. Stakeholders
- **Finance Team**: Monitors the monthly API spend across AI providers.
- **Security Team**: Ensures PII is stripped from prompts before being sent to external third-party APIs.

## 6. User Stories
- As a **Platform Operator**, I want to seamlessly switch our primary moderation model from GPT-4o to Claude 3 Haiku if OpenAI experiences an outage.
- As a **Finance Manager**, I want to see exactly how many tokens Tenant X consumed this month so we can bill them for overages.
- As a **Developer**, I want to call a single internal API for "Enhance Text" and not worry about which LLM provider is actually fulfilling the request.

## 7. Functional Requirements
- **FR-AIP-01 (Inference Gateway)**: Central API that accepts standardized requests and routes them to the configured provider/model.
- **FR-AIP-02 (Semantic Cache)**: Hash incoming prompts into embeddings, check Redis for cosine similarity > 0.98, and return cached responses instantly.
- **FR-AIP-03 (Token Metering)**: Count prompt/completion tokens and write usage records to the billing ledger asynchronously.
- **FR-AIP-04 (Fallback Chain)**: If Provider A returns a 5xx error or times out, automatically retry with Provider B.
- **FR-AIP-05 (Prompt Registry)**: Centralized version control for all system prompts used across the platform.

## 8. Non-Functional Requirements
- **Latency**: Gateway overhead (routing, caching, metering) must add < 10ms to the raw LLM response time.
- **Security**: The gateway must never log raw PII. System prompts must be protected against prompt injection attacks.

## 9. User Workflows
- **Inference Request**: Microservice requests Moderation → Gateway checks Semantic Cache → Miss → Gateway routes to GPT-4o-mini → Response received → Tokens counted & Ledger updated → Cache updated → Response returned to Microservice.

## 10. State Machines
- **Model State**: `EXPERIMENTAL` → `ACTIVE_PRIMARY` → `ACTIVE_FALLBACK` → `DEPRECATED`.

## 11. Business Rules
- Tenants on the Starter plan are restricted to smaller, cheaper models (e.g., GPT-4o-mini). Enterprise tenants can route to premium models (e.g., GPT-4o).
- If a tenant exceeds their monthly AI token quota, the gateway rejects explicitly requested AI features (like listing enhancement) but continues to process mandatory background tasks (like moderation) and bills for overage.

## 12. Permissions
- `admin:ai:read` - View model configurations and cache hit rates.
- `admin:ai:write` - Change model routing and fallback chains.

## 13. Events Generated
- `ai.inference_completed`
- `ai.cache_hit`
- `ai.provider_fallback_triggered`
- `ai.quota_exceeded`

## 14. Events Consumed
- None directly (Gateway is primarily synchronously called via gRPC/REST).

## 15. Analytics Requirements
- Track Token volume by Model, Provider, and Tenant.
- Track Cache Hit Rate and Cache Latency.
- Track Provider error rates and latency percentiles.

## 16. KPIs
- Cost per 1,000 requests.
- Cache Hit Rate.
- Provider Uptime (from the perspective of the gateway).

## 17. Success Metrics
- LLM API costs are reduced by 30% via Semantic Caching.
- Zero customer-facing errors due to a single LLM provider outage.

## 18. Edge Cases
- **Context Window Exceeded**: If an input is too large for the primary model, the gateway must gracefully truncate it or route it to a model with a larger context window (e.g., Claude 3 Opus 200k).

## 19. Failure Scenarios
- **All Providers Down**: Gateway must return a standardized, graceful error allowing the consuming microservice to degrade feature functionality rather than crashing.

## 20. Compliance Requirements
- **Data Privacy**: Ensure OpenAI and Anthropic are configured via Enterprise agreements with "Zero Data Retention" policies so customer data is not used to train public models.

## 21. Realtime Requirements
- Support streaming responses (Server-Sent Events) for UI-facing generation tasks.

## 22. AI Requirements
- The Gateway itself uses embeddings to power the Semantic Cache.

## 23. MVP Scope
- OpenAI Integration (GPT-4o, GPT-4o-mini).
- Basic exact-match caching (Redis string keys).
- Simple Token metering.

## 24. V1 Scope
- Semantic Caching (Vector similarity in Redis).
- Provider Fallback Chain (Anthropic Claude 3 integration).
- Streaming responses.

## 25. V2 Scope
- Local model hosting integration (Llama 3 via vLLM) for high-volume/low-complexity tasks.

## 26. Future Enhancements
- LLM Firewall (pre-computation check for prompt injection or jailbreak attempts).

## 27. Acceptance Criteria
- [ ] The gateway successfully routes a request to OpenAI and returns the response.
- [ ] Sending the exact same semantically similar request twice results in a cache hit on the second attempt, returning in < 20ms.
- [ ] If OpenAI API key is invalidated (simulating outage), the gateway successfully falls back to Anthropic.
- [ ] Token usage is accurately recorded in the DB per tenant.
