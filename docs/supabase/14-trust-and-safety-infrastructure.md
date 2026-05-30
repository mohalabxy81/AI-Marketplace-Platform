# 14. TRUST & SAFETY INFRASTRUCTURE

> **Status**: Approved
> **Target Audience**: Security Engineers, Platform Administrators
> **Document Class**: Official Backend Constitution
> **System Context**: AI-Native Multi-Tenant Marketplace Operating System

---

## 1. Trust & Safety Paradigm

In a multi-tenant marketplace, Trust & Safety cannot be an afterthought. Fraudulent listings, prompt injection attacks, and spam can destroy network trust. The platform implements an **Automated Moderation + Human Verification** pipeline.

---

## 2. Core Schemas and Tables

### 2.1 The Moderation Queue
Entities (listings, reviews, users) flagged by heuristics or reported by users enter the moderation queue.

```sql
CREATE TABLE trust.moderation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
    entity_type TEXT NOT NULL,           -- 'listing', 'user', 'message'
    entity_id UUID NOT NULL,
    flag_reason TEXT NOT NULL,           -- 'toxicity', 'fraud_pattern', 'user_reported'
    severity TEXT DEFAULT 'low',         -- 'low', 'medium', 'high', 'critical'
    status TEXT DEFAULT 'pending',       -- 'pending', 'investigating', 'resolved', 'dismissed'
    ai_confidence_score FLOAT,           -- 0.0 to 1.0
    assigned_admin_id UUID,              -- Super Admin or Tenant Admin handling the case
    created_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ
);
```

### 2.2 Fraud Alerts and Heuristics
Tracks specific behavioral anomalies (e.g., a user attempting 50 credit card numbers in 5 minutes).

```sql
CREATE TABLE trust.fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES platform.tenants(id),
    user_id UUID,
    ip_address TEXT,                     -- Hashed for GDPR compliance
    alert_type TEXT NOT NULL,            -- 'velocity_spike', 'impossible_travel', 'llm_jailbreak_attempt'
    metadata JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. The Moderation Pipeline

Moderation happens asynchronously to avoid blocking the user experience (e.g., waiting 5 seconds for an OpenAI Moderation API call to finish before saving a listing).

### 3.1 The Listing Scan Flow
1. **Creation**: User creates a listing. It is saved to `marketplace.listings` with `status = 'pending_review'`.
2. **Event Mesh**: `outbox.events` emits `listing_created`.
3. **AI Scanner (Edge Function)**:
   - Reads the event.
   - Sends the listing text to `OpenAI Moderation API` (to check for hate speech, violence).
   - Runs a local heuristic check (regex for PII or known spam domains).
4. **Decision Logic**:
   - If `flagged == true`: The Edge Function inserts a row into `trust.moderation_queue` with `severity = high`. The listing remains `pending_review`.
   - If `flagged == false`: The Edge Function updates `marketplace.listings` setting `status = 'active'`.
5. **Realtime Notification**: The original seller receives a WebSocket broadcast: "Your listing is now live!" or "Your listing is under review."

---

## 4. LLM Security (Jailbreak Prevention)

Because the platform allows tenants to expose AI Agents, users will attempt to inject malicious prompts to extract system instructions or bypass billing.

### 4.1 The Pre-Flight Check
Before a user prompt is sent to an LLM:
1. The Edge Function runs a fast, local ONNX model (or simple regex blocklist) to check for common injection signatures (e.g., "Ignore previous instructions").
2. If detected, the request is immediately rejected.
3. An event is logged to `trust.fraud_alerts` with `alert_type = 'llm_jailbreak_attempt'`.
4. If a user accumulates 3 jailbreak attempts within 1 hour, their `identity.user_profiles.status` is automatically updated to `suspended`.

---

## 5. RLS and Privacy in Trust & Safety

Moderation data is highly sensitive and contains private evidence.

```sql
ALTER TABLE trust.moderation_queue ENABLE ROW LEVEL SECURITY;

-- 1. Tenant Admins can view the queue FOR THEIR TENANT ONLY.
CREATE POLICY "admin_view_queue" ON trust.moderation_queue
  FOR SELECT TO authenticated
  USING (
    tenant_id = auth.jwt_tenant_id() 
    AND auth.jwt_tenant_role() IN ('owner', 'admin')
  );

-- 2. Super Admins can view ALL queues (Platform governance).
CREATE POLICY "superadmin_view_queue" ON trust.moderation_queue
  FOR ALL TO authenticated
  USING (auth.is_super_admin() = true);

-- Note: Standard users have NO access to the trust schema.
```
