package com.platform.core.event

import com.google.gson.Gson
import com.google.gson.reflect.TypeToken

/**
 * EventValidator
 *
 * Validates raw JSON event strings against the registered schema for their
 * declared (eventType, schemaVersion) pair.
 *
 * USAGE
 * ─────
 *   val validator = EventValidator(EventSchemaRegistry.default())
 *
 *   // Returns a typed DomainEvent on success.
 *   val event = validator.validateAndParse(rawJson)
 *
 *   // Or validate without parsing:
 *   val result = validator.validate(rawJson)
 *   when (result) {
 *     is ValidationResult.Valid   -> publish(result.event)
 *     is ValidationResult.Invalid -> sendToDlq(result.violations)
 *   }
 *
 * THREAD SAFETY
 * ─────────────
 * Gson and EventSchemaRegistry are both stateless after construction.
 * EventValidator can be shared as a singleton.
 */
class EventValidator(
    private val registry: EventSchemaRegistry,
    private val gson: Gson = Gson()
) {
    private val mapType = object : TypeToken<Map<String, Any?>>() {}.type

    // ── Public API ────────────────────────────────────────────────────────

    /**
     * Parses [rawJson] into a [DomainEvent] and validates its payload.
     *
     * @return [ValidationResult.Valid] on success.
     * @return [ValidationResult.Invalid] if the payload violates any schema rule.
     * @throws SchemaNotFoundException if no schema is registered for the event type/version.
     * @throws IllegalArgumentException if [rawJson] is not valid JSON or is missing
     *         the required top-level fields (eventType, schemaVersion).
     */
    fun validate(rawJson: String): ValidationResult {
        val rawMap: Map<String, Any?> = gson.fromJson(rawJson, mapType)
            ?: throw IllegalArgumentException("Failed to parse JSON: input is null or not a JSON object.")

        val eventType = rawMap["event_type"] as? String
            ?: throw IllegalArgumentException("Event JSON is missing required field 'event_type'.")

        val schemaVersion = (rawMap["schema_version"] as? Double)?.toInt()
            ?: (rawMap["schema_version"] as? Int)
            ?: throw IllegalArgumentException("Event JSON is missing required field 'schema_version'.")

        // Resolve the schema — throws SchemaNotFoundException if not registered.
        val schema = registry.resolve(eventType, schemaVersion)

        // Run field-level validations.
        val violations = schema.validate(rawMap)

        return if (violations.isEmpty()) {
            val event = parseEvent(rawMap)
            ValidationResult.Valid(event)
        } else {
            ValidationResult.Invalid(eventType, violations)
        }
    }

    /**
     * Convenience wrapper: parses and validates, throwing on any failure.
     *
     * @throws SchemaValidationException if validation fails.
     */
    fun validateAndParse(rawJson: String): DomainEvent {
        return when (val result = validate(rawJson)) {
            is ValidationResult.Valid   -> result.event
            is ValidationResult.Invalid -> throw SchemaValidationException(result.eventType, result.violations)
        }
    }

    // ── Private helpers ───────────────────────────────────────────────────

    @Suppress("UNCHECKED_CAST")
    private fun parseEvent(map: Map<String, Any?>): DomainEvent {
        val metadata = map["metadata"] as? Map<String, Any?> ?: emptyMap()

        return DomainEvent(
            eventId        = map["event_id"] as? String ?: "",
            eventType      = map["event_type"] as? String ?: "",
            schemaVersion  = (map["schema_version"] as? Double)?.toInt() ?: 1,
            producerDomain = map["producer_domain"] as? String ?: "unknown",
            tenantId       = map["tenant_id"] as? String,
            actorId        = map["actor_id"] as? String,
            timestamp      = map["timestamp"] as? String ?: "",
            correlationId  = map["correlation_id"] as? String ?: "",
            payload        = map["payload"] as? Map<String, Any?> ?: emptyMap(),
            source         = runCatching {
                EventSource.valueOf((metadata["source"] as? String)?.uppercase() ?: "SYSTEM")
            }.getOrDefault(EventSource.SYSTEM),
            environment    = runCatching {
                EventEnvironment.valueOf((metadata["environment"] as? String)?.uppercase() ?: "PRODUCTION")
            }.getOrDefault(EventEnvironment.PRODUCTION)
        )
    }
}

// ── Validation result ADT ─────────────────────────────────────────────────

sealed class ValidationResult {
    /** Payload passed all schema rules; [event] is the fully parsed domain event. */
    data class Valid(val event: DomainEvent) : ValidationResult()

    /** One or more schema violations were found; see [violations] for details. */
    data class Invalid(
        val eventType: String,
        val violations: List<SchemaViolation>
    ) : ValidationResult()
}
