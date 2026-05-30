# 14. TRUST & SAFETY INFRASTRUCTURE

> **Status**: Approved
> **Target Audience**: Trust & Safety Team, Backend Engineers
> **Domain**: Governance & Security

## 1. Executive Summary
The Trust & Safety Infrastructure protects the marketplace from bad actors, spam, and prohibited content. It separates the evaluation of content (Moderation) from the evaluation of behavior (Trust Scoring).

## 2. Moderation Pipeline
- Every user-submitted listing or media asset defaults to a `PENDING_REVIEW` state.
- An Outbox event triggers an Edge Function to execute an AI scan.
- **Auto-Approve**: Content is marked `PUBLISHED`.
- **Auto-Reject**: Content is marked `QUARANTINED` and hidden from search.
- **Borderline**: Content remains `PENDING_REVIEW` and is inserted into `trust.moderation_cases` for human review.

## 3. Trust Scoring (Anomaly Detection)
- Tenants possess a dynamic `trust_score` (0.0 to 1.0) in the `trust.tenant_scores` table.
- Event streams (e.g., rapid listing creation, high bounce rates) are analyzed.
- If velocity exceeds thresholds, the score degrades.
- A score < 0.3 triggers an automatic `STATUS = SUSPENDED` on the tenant organization, instantly dropping all active WebSocket connections and revoking API JWT access via RLS failures.

## 4. Verification
- High-value transactions require verified identity (e.g., Stripe Identity).
- Uploaded verification documents are stored in the secure `verification-documents` bucket and linked to `trust.verification_records`.

## 5. Appeals & Enforcement
- Users can submit appeals for rejected listings.
- `SUPER_ADMIN` or `PLATFORM_ADMIN` resolves appeals through the Super Admin dashboard.
- All actions are logged immutably in `governance.audit_logs`.
