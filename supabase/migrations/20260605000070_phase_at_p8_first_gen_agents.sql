-- ============================================================
-- Phase AT.P8 — First Generation Agents
-- ============================================================
-- Seeds the 5 core platform agents.
-- ============================================================

ALTER TABLE agents.agent_registry DISABLE TRIGGER agent_registry_audit;

INSERT INTO agents.agent_registry (slug, name, description, type, status, capabilities, permissions, configuration) VALUES
    (
        'recommendation-agent',
        'Recommendation Engine',
        'Generates personalized listing recommendations based on user interactions and semantic search',
        'recommendation',
        'active',
        ARRAY['semantic_search', 'collaborative_filtering', 'personalization'],
        '{"schemas": ["public", "agents"], "tables": ["listings", "semantic_embeddings", "user_interactions"]}',
        '{"model": "gpt-4o-mini", "temperature": 0.3, "max_tokens": 1024, "retry_policy": {"max_attempts": 3, "backoff": "exponential"}}'
    ),
    (
        'trust-agent',
        'Trust & Verification Agent',
        'Automatically verifies user identities and company details, assigning trust scores',
        'trust',
        'active',
        ARRAY['identity_verification', 'document_analysis', 'risk_scoring'],
        '{"schemas": ["public", "agents"], "tables": ["users", "companies", "trust_verifications"]}',
        '{"model": "gpt-4o", "temperature": 0.1, "max_tokens": 2048, "retry_policy": {"max_attempts": 5, "backoff": "exponential"}}'
    ),
    (
        'moderation-agent',
        'Content Moderation Agent',
        'Reviews new listings and messages for policy violations and inappropriate content',
        'moderation',
        'active',
        ARRAY['content_filtering', 'image_analysis', 'policy_enforcement'],
        '{"schemas": ["public", "agents"], "tables": ["listings", "messages", "moderation_queues", "moderation_actions"]}',
        '{"model": "gpt-4o-mini", "temperature": 0.0, "max_tokens": 512, "retry_policy": {"max_attempts": 2, "backoff": "linear"}}'
    ),
    (
        'fraud-agent',
        'Fraud Detection Agent',
        'Monitors billing events, logins, and interactions to detect anomalous patterns',
        'fraud',
        'active',
        ARRAY['anomaly_detection', 'pattern_recognition', 'billing_analysis'],
        '{"schemas": ["public", "agents"], "tables": ["billing_events", "tenant_invoices", "fraud_scores", "audit_logs"]}',
        '{"model": "gpt-4o", "temperature": 0.2, "max_tokens": 1024, "retry_policy": {"max_attempts": 3, "backoff": "exponential"}}'
    ),
    (
        'support-agent',
        'L1 Support Agent',
        'Provides frontline customer support, answering common questions and triaging tickets',
        'support',
        'active',
        ARRAY['conversational_qa', 'ticket_triage', 'knowledge_retrieval'],
        '{"schemas": ["public", "agents"], "tables": ["support_tickets", "support_messages", "conversations"]}',
        '{"model": "gpt-4o", "temperature": 0.5, "max_tokens": 1024, "retry_policy": {"max_attempts": 2, "backoff": "linear"}}'
    )
ON CONFLICT (company_id, slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    capabilities = EXCLUDED.capabilities,
    permissions = EXCLUDED.permissions,
    status = EXCLUDED.status;

ALTER TABLE agents.agent_registry ENABLE TRIGGER agent_registry_audit;
