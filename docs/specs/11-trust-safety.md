# SPEC 11 — TRUST & SAFETY SPECIFICATION

> **Basis**: [PLANNER.md §10](file:///home/mohal665544/pr1/PLANNER.md) — Master Trust & Safety Operating Model
> **Status**: Execution-Ready v2 (Full Depth)
> **Version**: 2.0.0
> **Last Updated**: 2026-05-30

---

## 1. Trust & Safety System Architecture

The Trust & Safety system is the platform's **Immune System** — a multi-layer detection, response, and reputation management infrastructure that operates asynchronously without blocking the primary user experience while maintaining zero-tolerance for high-risk content.

### 1.1 System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                   TRUST & SAFETY SYSTEM                             │
│                                                                     │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│  │  Pre-Publish     │  │  Post-Publish    │  │  Behavioral      │  │
│  │  Content Scan    │  │  Monitoring      │  │  Risk Engine     │  │
│  │  (Async, <30s)   │  │  (Continuous)    │  │  (Real-time)     │  │
│  └─────────┬────────┘  └────────┬─────────┘  └────────┬─────────┘  │
│            │                   │                      │             │
│            └───────────────────┼──────────────────────┘             │
│                                ▼                                    │
│                    ┌───────────────────────┐                        │
│                    │  Trust Score Engine   │                        │
│                    │  (Reputation System)  │                        │
│                    └───────────┬───────────┘                        │
│                                │                                    │
│              ┌─────────────────┼──────────────────┐                 │
│              ▼                 ▼                  ▼                 │
│      ┌──────────────┐  ┌─────────────┐  ┌──────────────┐          │
│      │  Automated   │  │  Human      │  │  Enforcement │          │
│      │  Actions     │  │  Review     │  │  Engine      │          │
│      │  (Quarantine,│  │  Queue      │  │  (Suspensions│          │
│      │  Soft-lock)  │  │  (Jira-like)│  │  , bans)     │          │
│      └──────────────┘  └─────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pre-Publish Content Scan

### 2.1 Scan Pipeline

When a listing is submitted (`marketplace.listing_created` event), it enters status `PENDING_REVIEW` and the following scan pipeline runs asynchronously:

```
[marketplace.listing_created]
          │
          ▼
[Fetch listing content]
          │
  ┌───────┼──────────────────────────────┐
  ▼       ▼                              ▼
[LLM     [Vector Toxicity    [Heuristic Pattern
Moderation Check]  Check]    Scanner]
  │       │                              │
  └───────┴──────────────────────────────┘
                    │
                    ▼
          [Aggregate Scan Results]
                    │
          ┌─────────┴──────────┐
          ▼                    ▼
   Score < 0.3 (clean)   Score ≥ 0.3 (risk detected)
          │                    │
          ▼                    ▼
   [Approve listing]   [Quarantine + Human Review]
          │
          ▼
   [marketplace.listing_status_changed → ACTIVE]
   [trust.content_approved event]
```

### 2.2 Scan Method 1: LLM Moderation

**Prompt Used:** `trust_content_moderation_v1` (from Prompt Registry)

**Scan Dimensions:**
| Dimension | Risk Categories | Threshold |
|:----------|:--------------|:---------|
| Toxicity | Hate speech, harassment, personal attacks | > 0.7 → quarantine |
| Spam | Keyword stuffing, duplicate content, SEO manipulation | > 0.8 → quarantine |
| Misleading Claims | False performance metrics, fake reviews claims | > 0.7 → human review |
| Policy Violations | Adult content, illegal services, gambling | > 0.5 → quarantine |
| Prompt Injection | Jailbreak attempts in AI agent descriptions | Any detection → quarantine |
| PII Exposure | Personal data in listing content | Any detection → quarantine |

**Output Schema:**
```json
{
  "overall_risk_score": 0.23,
  "violation_found": false,
  "categories": {
    "toxicity": 0.05,
    "spam": 0.23,
    "misleading_claims": 0.10,
    "policy_violation": 0.00,
    "prompt_injection": 0.00,
    "pii_exposure": 0.00
  },
  "flagged_passages": [
    {
      "text": "100x better than competitors guaranteed",
      "category": "misleading_claims",
      "score": 0.72,
      "recommendation": "REMOVE"
    }
  ],
  "reasoning": "Content contains unsubstantiated superlative claims."
}
```

**Execution:** LOW priority AI queue. Budget capped at 2,000 tokens per listing scan.

### 2.3 Scan Method 2: Vector Toxicity Check

**Mechanism:** Cosine similarity check against a pre-built banned-content vector namespace.

**Banned Vector Index:**
- 50,000+ vectors representing known toxic/spam content patterns.
- Updated weekly from moderation decisions.
- Stored in dedicated `vector_store.embeddings` collection with `entity_type = 'banned_pattern'`.

**Check Logic:**
```
banned_pattern_similarity = MAX(
  cosine_similarity(listing_embedding, banned_pattern_vector)
  for banned_pattern_vector in top-50 nearest banned vectors
)

If banned_pattern_similarity > 0.85 → HIGH_RISK flag
If banned_pattern_similarity > 0.70 → MEDIUM_RISK flag, human review
```

**Advantages:** Runs in <5ms, no AI token cost, highly resistant to paraphrasing evasion.

### 2.4 Scan Method 3: Heuristic Pattern Scanner

Fast regex/rule-based scanner for known bad patterns:

| Rule | Pattern | Action |
|:-----|:--------|:-------|
| External contact injection | Email/phone/Telegram in listing body | Flag for review |
| URL blacklist | Known phishing/scam domains | Quarantine immediately |
| Keyword blacklist | Configurable bad keyword list | Score += 0.3 per hit |
| Price anomaly | Price = $0.00 for non-freemium listing | Flag for review |
| Duplicate detection | SHA-256 match with existing active listing | Flag as potential duplicate |
| Rapid listing creation | >5 listings in 1 hour from same tenant | Soft-lock, human review |

### 2.5 Scan Result Aggregation

```
final_risk_score = max(
  llm_overall_risk_score,
  (banned_pattern_similarity - 0.70) / 0.30,  // Normalized 0–1
  min(1.0, heuristic_score_sum / 3.0)
)
```

**Decision Matrix:**

| Final Risk Score | Decision | Action |
|:----------------|:---------|:-------|
| < 0.30 | CLEAN | Activate listing, emit `trust.content_approved` |
| 0.30–0.60 | REVIEW_REQUIRED | Quarantine, add to human review queue (NORMAL priority) |
| 0.60–0.80 | HIGH_RISK | Quarantine, add to human review queue (HIGH priority) |
| > 0.80 | CRITICAL | Quarantine, emit `trust.fraud_detected`, alert admin |

---

## 3. Trust Scoring System

### 3.1 Trust Score Model

Every tenant, user, and listing has an independent trust score (0.00–1.00).

**Tenant Trust Score Formula:**
```
trust_score = min(1.0, max(0.2,
  base_score
  + verification_bonus
  + age_bonus
  + review_rating_component
  - fraud_signal_penalty
  - policy_violation_penalty
))
```

**Score Components:**

| Component | Weight | Calculation |
|:----------|:-------|:-----------|
| `base_score` | Fixed | 0.60 (starting score for new tenants) |
| `verification_bonus` | +0.10 | Business identity verified (KYB) |
| `age_bonus` | +0.05 per 6 months | Capped at +0.15 (18+ months = max bonus) |
| `review_rating_component` | +0.00 to +0.15 | `(avg_rating - 3.5) / 5.0 × 0.15` (only applies if ≥10 reviews) |
| `fraud_signal_penalty` | -0.20 per signal | Capped at -0.40 (prevents score going below 0.20) |
| `policy_violation_penalty` | -0.10 per violation | Reset after 90 days of clean record |

**Score Floor:** 0.20 (even with maximum penalties, score never drops to 0 — allows recovery path).

**Score Update Triggers:**
- `trust.fraud_detected` event → recalculate immediately.
- New review submitted → recalculate within 5 minutes.
- Daily scheduled batch → recalculate all scores (apply age bonus, decay old penalties).
- Verification status change → recalculate immediately.

### 3.2 Trust Score Impact on Discovery

Trust score is used in Stage 2 Light Ranking formula as a multiplier:
```
Score_light = (1.0 - cosine_distance) × trust_score × ...
```

**Score Impact Table:**
| Trust Score Range | Discovery Visibility |
|:-----------------|:--------------------|
| 0.80–1.00 | Full visibility, eligible for featured placement |
| 0.60–0.79 | Normal visibility |
| 0.40–0.59 | Reduced visibility (lower in rankings) |
| 0.20–0.39 | Severely reduced visibility, badge displayed |
| < 0.20 | Effectively hidden (minimum score is 0.20) |

---

## 4. Behavioral Risk Engine

### 4.1 Monitored Behavioral Signals

The Behavioral Risk Engine continuously monitors interaction patterns for anomalies:

| Signal | Normal Baseline | Anomaly Threshold | Risk Type |
|:-------|:---------------|:----------------|:---------|
| Listing creation rate | 0–2 per day | >5 per hour | RAPID_LISTING_SPIKE |
| Price change frequency | 0–1 per week | >3 per day on same listing | PRICE_MANIPULATION |
| Review request rate | 0–1 per day | >5 per hour | REVIEW_FRAUD |
| API request rate | Plan limit | 2× plan limit sustained 10 min | QUOTA_ABUSE |
| Login from new IPs | 0–2 per week | >5 per hour from different IPs | ACCOUNT_TAKEOVER |
| Failed payment attempts | 0–1 per month | >3 per day | PAYMENT_FRAUD |
| Tenant switching rate | 0 | >3 tenants in 1 hour same user | MULTI_TENANT_ABUSE |
| Embedding similarity to banned content | <0.50 | >0.85 on submission | CONTENT_EVASION |

### 4.2 Anomaly Detection Algorithm

**Method:** Statistical z-score deviation from tenant's own historical baseline.

```
z_score = (current_value - historical_mean) / historical_std_dev

Risk flag triggered if: z_score > 3.0 (3 standard deviations above mean)
```

**Baseline Computation:** 30-day rolling window per tenant/signal pair. Stored in Redis as:
```
trust:behavioral_baseline:{tenant_id}:{signal_type}:mean
trust:behavioral_baseline:{tenant_id}:{signal_type}:std_dev
```

**For new tenants (< 30 days data):** Use platform-wide baseline per plan tier.

### 4.3 Risk Tier Assignment

Multiple risk signals are combined into a composite risk score:

```
composite_risk_score = Σ (signal_weight_i × normalized_signal_score_i) / Σ weights

Risk Tier:
  CRITICAL: composite_risk_score > 0.85 → Immediate automated action
  HIGH: 0.65–0.85 → Human review within 1 hour
  MEDIUM: 0.40–0.65 → Human review within 24 hours
  LOW: 0.20–0.40 → Monitoring only, logged
  CLEAN: < 0.20 → No action
```

---

## 5. Human Review Workflow

### 5.1 Moderation Queue Management

**Moderation Queue Table:** `trust_registry.moderation_queue`

Priority-based queue processing:

| Priority | SLA | Auto-escalation if SLA missed |
|:---------|:----|:-----------------------------|
| URGENT | 30 minutes | Escalate to senior reviewer + alert Slack |
| HIGH | 4 hours | Escalate to senior reviewer |
| NORMAL | 24 hours | Log as SLA breach, daily report |
| LOW | 72 hours | Log as SLA breach, weekly report |

**Queue Item Lifecycle:**
```
SUBMITTED → ASSIGNED → IN_REVIEW → DECISION_MADE → CLOSED
                                         │
                               APPROVE / REJECT / ESCALATE
```

### 5.2 Reviewer Assignment

- Reviewers are platform staff with `trust_reviewer` role.
- Assignment: round-robin with workload balancing.
- Each reviewer has a max active assignments limit (default: 20 items).
- Urgent items bypass normal assignment → assigned to first available reviewer.

### 5.3 Moderation Decision Actions

| Decision | Effect | Notification |
|:---------|:-------|:------------|
| APPROVE | Listing → ACTIVE, `trust.content_approved` event | Tenant notified via email + WebSocket |
| REJECT | Listing → REJECTED, trust score penalty applied | Tenant notified with rejection reason |
| ESCALATE | Escalation record created, senior reviewer assigned | Internal alert |
| REQUEST_CHANGES | Listing held, tenant asked to modify | Tenant notified with specific change requests |

---

## 6. Automated Enforcement Engine

### 6.1 Enforcement Actions Matrix

| Trigger | Risk Score | Automated Action | Duration | Reversal |
|:--------|:----------|:----------------|:---------|:---------|
| `RAPID_LISTING_SPIKE` | MEDIUM | Rate-limit listing creation to 1/hour | Until human review | Admin approval |
| `PRICE_MANIPULATION` | HIGH | Freeze price updates | 24 hours | Auto-releases |
| `FRAUD_DETECTED` risk=CRITICAL | CRITICAL | Soft-lock account (read-only mode) | Until human review | Admin approval |
| `FRAUD_DETECTED` risk=HIGH | HIGH | Quarantine all active listings | Until human review | Admin approval |
| `ACCOUNT_TAKEOVER` detected | CRITICAL | Force session revocation, lock login | Until user verifies identity | MFA verification |
| `PAYMENT_FRAUD` detected | CRITICAL | Suspend tenant, freeze assets | Until investigation | Admin approval + Stripe review |
| `CONTENT_EVASION` confirmed | HIGH | Quarantine listing, flag tenant | Until human review | Admin approval |
| Trust score < 0.20 sustained 7d | AUTO | Banner warning on tenant dashboard | Until trust score recovers | Auto-releases |

### 6.2 Soft-Lock vs. Hard-Lock

**Soft-Lock:** Tenant can read data but cannot:
- Create new listings.
- Send messages.
- Launch AI queries.
- Modify existing listings.

**Hard-Lock:** Tenant cannot:
- Log in.
- Access any data.
- Receive WebSocket updates.
- Access billing information.

---

## 7. Fraud Detection Signal Catalog

### 7.1 Signal Table: `trust_registry.fraud_signals`

| Signal Type | Detection Method | Weight |
|:-----------|:----------------|:-------|
| `RAPID_LISTING_SPIKE` | Behavioral counter | 0.8 |
| `UNUSUAL_PRICE_PATTERN` | Statistical deviation | 0.6 |
| `BEHAVIORAL_ANOMALY` | Z-score model | 0.7 |
| `CONTENT_INJECTION` | Pattern scanner | 0.9 |
| `ACCOUNT_TAKEOVER_PATTERN` | IP + device fingerprint change | 0.95 |
| `REVIEW_FRAUD` | Review velocity + IP clustering | 0.85 |
| `PAYMENT_FRAUD` | Failed payment pattern | 0.9 |
| `MULTI_TENANT_ABUSE` | Cross-tenant user detection | 0.7 |
| `IMPERSONATION` | Listing content similarity to verified brands | 0.8 |
| `PROMPT_INJECTION_ATTEMPT` | Content scan detection | 0.95 |
| `CONTENT_EVASION` | Vector similarity to banned content | 0.85 |

---

## 8. Escalation Workflow

### 8.1 Escalation Triggers

| Condition | Escalation Target | Notification Method |
|:----------|:-----------------|:------------------|
| CRITICAL risk score detected | Trust Team Lead + Platform Admin | Slack alert + email + WebSocket |
| Potential legal violation | Legal Team | Email + incident ticket |
| High-value tenant (>$10K MRR) flagged | Account Executive + Trust Team | Email + call |
| Repeated violations (3+ in 30 days) | Trust Team Lead | Email + escalation record |
| Reviewer disagrees with AI decision | Senior Reviewer | Internal queue |
| Pattern matching known threat actor | Security Team | Encrypted alert |

### 8.2 Escalation Record Schema

```
trust_registry.escalation_records:
  escalation_id: UUID
  source_queue_item_id: UUID
  tenant_id: UUID
  entity_type: string
  entity_id: UUID
  escalation_type: HIGH_RISK_FRAUD | HUMAN_REVIEW_REQUESTED | POLICY_DISPUTE | LEGAL
  priority: URGENT | HIGH | NORMAL
  escalated_to: TRUST_TEAM | PLATFORM_ADMIN | LEGAL | SECURITY
  escalation_notes: text
  status: OPEN | IN_PROGRESS | RESOLVED
  resolution_notes: text | null
  created_at: timestamptz
  resolved_at: timestamptz | null
```

---

## 9. Trust & Safety Observability

### 9.1 Key Metrics

| Metric | Description | Alert Threshold |
|:-------|:------------|:---------------|
| `trust_scan_latency_ms` | Time from listing_created to scan completion | P99 > 30,000ms (30 seconds) |
| `trust_scan_approval_rate` | % of listings auto-approved (no human review needed) | Alert if drops below 70% |
| `trust_false_positive_rate` | % of quarantined listings later approved by human | Target < 15% |
| `trust_queue_depth` | Total items in moderation queue | Alert if > 500 pending |
| `trust_sla_breach_rate` | % of queue items exceeding SLA | Alert if > 5% for URGENT |
| `trust_fraud_detection_rate` | Fraudulent listings caught / total listings | Track for safety model performance |
| `trust_score_distribution` | Histogram of trust scores across all tenants | Alert if % below 0.4 > 5% |

### 9.2 Trust Audit Trail

Every trust decision is permanently logged to `governance.audit_logs`:
```json
{
  "entity_type": "trust_decision",
  "entity_id": "queue_item_uuid",
  "action": "CONTENT_QUARANTINED | CONTENT_APPROVED | FRAUD_ESCALATED | TRUST_SCORE_UPDATED",
  "actor_id": "reviewer_uuid OR sys_trust_engine",
  "actor_type": "HUMAN_REVIEWER | AI_MODERATION | BEHAVIORAL_ENGINE",
  "metadata": {
    "risk_score": 0.78,
    "scan_methods_used": ["LLM_MODERATION", "VECTOR_CHECK"],
    "decision_confidence": 0.92,
    "reasoning_summary": "High toxicity score in description"
  }
}
```

---

## 10. Policy Rules Engine

### 10.1 Policy Rule Schema: `trust_registry.policy_rules`

| Column | Type | Description |
|:-------|:-----|:------------|
| `rule_id` | UUID | PRIMARY KEY |
| `rule_name` | VARCHAR(200) | |
| `rule_type` | VARCHAR(50) | `CONTENT`, `BEHAVIORAL`, `RATE`, `GEO` |
| `severity` | VARCHAR(20) | `INFO`, `WARNING`, `VIOLATION`, `CRITICAL` |
| `condition_expression` | TEXT | DSL expression defining trigger condition |
| `action` | VARCHAR(50) | `FLAG`, `QUARANTINE`, `SOFT_LOCK`, `HARD_LOCK`, `NOTIFY` |
| `is_active` | BOOLEAN | |
| `applies_to_plan_tiers` | VARCHAR[] | NULL = applies to all |
| `created_by` | VARCHAR(100) | |
| `created_at` | TIMESTAMPTZ | |

### 10.2 Policy DSL Examples

```
# Block listings with price = 0 for non-freemium price model
CONDITION: listing.price = 0 AND listing.price_model != 'FREEMIUM'
ACTION: FLAG, priority=HIGH

# Rate-limit listing creation
CONDITION: listing_count_last_hour > 5
ACTION: SOFT_LOCK, duration=60min

# Content injection detection
CONDITION: content.contains_regex('/\b[\w.]+@[\w.]+\.\w{2,}\b/')
ACTION: QUARANTINE, priority=HIGH
```
