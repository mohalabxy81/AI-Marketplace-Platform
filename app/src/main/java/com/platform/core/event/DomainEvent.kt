package com.platform.core.event

/**
 * DomainEvent
 *
 * The canonical contract for all platform events crossing domain boundaries.
 * Every event written to the transactional outbox or published to Kafka must
 * implement (or be serialised from) this shape.
 *
 * FIELD NOTES
 * ───────────
 * @param eventId        UUID — deduplication / idempotency key.
 * @param eventType      Dot-namespaced name, e.g. "listing.created".
 * @param schemaVersion  Monotonically increasing integer.  Consumers must
 *                       reject events whose version exceeds the highest they
 *                       understand.
 * @param producerDomain Bounded-context name, e.g. "marketplace".
 * @param tenantId       company_id UUID — partition key.  Null for global
 *                       platform events (e.g. system.maintenance).
 * @param actorId        User who triggered the event; null for system events.
 * @param timestamp      ISO-8601 instant at which the event was created.
 * @param correlationId  Trace identifier that links all saga steps.
 * @param payload        Domain-specific data map.
 * @param source         Origin of the event: API | SYSTEM | SAGA | WEBHOOK.
 * @param environment    Runtime environment for routing / filtering.
 */
data class DomainEvent(
    val eventId: String,
    val eventType: String,
    val schemaVersion: Int,
    val producerDomain: String,
    val tenantId: String?,
    val actorId: String?,
    val timestamp: String,
    val correlationId: String,
    val payload: Map<String, Any?>,
    val source: EventSource,
    val environment: EventEnvironment
)

enum class EventSource { API, SYSTEM, SAGA, WEBHOOK }

enum class EventEnvironment { PRODUCTION, STAGING, DEVELOPMENT, TEST }
