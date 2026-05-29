package com.platform.core.event

/**
 * EventSchemaRegistry
 *
 * An in-process registry of all versioned event schema definitions.
 * Each registered schema declares the event type, the schema version it
 * applies to, and a set of field-level validation rules.
 *
 * DESIGN RATIONALE
 * ────────────────
 * The registry is intentionally kept in-process (no external network call)
 * so that validation is synchronous and zero-latency.  In a distributed
 * deployment, schemas are pushed into the registry at startup from a
 * centralised schema store (Kafka Schema Registry / Confluent / custom DB).
 *
 * USAGE
 * ─────
 *   val registry = EventSchemaRegistry.default()
 *   val schema   = registry.resolve("listing.created", version = 1)
 *   val errors   = schema.validate(payloadMap)
 *   if (errors.isEmpty()) { /* publish */ }
 */

// ── Field rule DSL ────────────────────────────────────────────────────────

sealed class FieldRule(open val fieldPath: String) {
    /** The field must exist and must not be null. */
    data class Required(override val fieldPath: String) : FieldRule(fieldPath)

    /** The field value, if present, must be of the given Kotlin type. */
    data class TypeCheck(override val fieldPath: String, val expectedType: Class<*>) : FieldRule(fieldPath)

    /** String field: value length must fall within [min, max]. */
    data class StringLength(override val fieldPath: String, val min: Int = 0, val max: Int = Int.MAX_VALUE) : FieldRule(fieldPath)

    /** Numeric field: value must be >= min. */
    data class MinValue(override val fieldPath: String, val min: Double) : FieldRule(fieldPath)

    /** List field: element count must be exactly [size]. */
    data class ExactListSize(override val fieldPath: String, val size: Int) : FieldRule(fieldPath)

    /** String field: value must match the given regex pattern. */
    data class Pattern(override val fieldPath: String, val regex: Regex) : FieldRule(fieldPath)
}

// ── Validation result ─────────────────────────────────────────────────────

data class SchemaViolation(val field: String, val rule: String, val message: String)

// ── Per-event schema descriptor ───────────────────────────────────────────

data class EventSchema(
    val eventType: String,
    val version: Int,
    val rules: List<FieldRule>
) {
    /**
     * Validates a payload map against all registered rules.
     *
     * @return A list of [SchemaViolation].  Empty = valid.
     */
    fun validate(payload: Map<String, Any?>): List<SchemaViolation> {
        val violations = mutableListOf<SchemaViolation>()

        for (rule in rules) {
            val rawValue = resolveNestedPath(payload, rule.fieldPath)

            when (rule) {
                is FieldRule.Required -> {
                    if (rawValue == null) {
                        violations += SchemaViolation(
                            field   = rule.fieldPath,
                            rule    = "REQUIRED",
                            message = "Field '${rule.fieldPath}' is required but missing or null."
                        )
                    }
                }

                is FieldRule.TypeCheck -> {
                    if (rawValue != null && !rule.expectedType.isInstance(rawValue)) {
                        violations += SchemaViolation(
                            field   = rule.fieldPath,
                            rule    = "TYPE",
                            message = "Field '${rule.fieldPath}' expected ${rule.expectedType.simpleName} but got ${rawValue::class.simpleName}."
                        )
                    }
                }

                is FieldRule.StringLength -> {
                    val str = rawValue as? String
                    if (str != null && (str.length < rule.min || str.length > rule.max)) {
                        violations += SchemaViolation(
                            field   = rule.fieldPath,
                            rule    = "STRING_LENGTH",
                            message = "Field '${rule.fieldPath}' length ${str.length} is outside allowed range [${rule.min}, ${rule.max}]."
                        )
                    }
                }

                is FieldRule.MinValue -> {
                    val num = (rawValue as? Number)?.toDouble()
                    if (num != null && num < rule.min) {
                        violations += SchemaViolation(
                            field   = rule.fieldPath,
                            rule    = "MIN_VALUE",
                            message = "Field '${rule.fieldPath}' value $num is below minimum ${rule.min}."
                        )
                    }
                }

                is FieldRule.ExactListSize -> {
                    val list = rawValue as? List<*>
                    if (list != null && list.size != rule.size) {
                        violations += SchemaViolation(
                            field   = rule.fieldPath,
                            rule    = "EXACT_LIST_SIZE",
                            message = "Field '${rule.fieldPath}' must have exactly ${rule.size} elements, found ${list.size}."
                        )
                    }
                }

                is FieldRule.Pattern -> {
                    val str = rawValue as? String
                    if (str != null && !rule.regex.matches(str)) {
                        violations += SchemaViolation(
                            field   = rule.fieldPath,
                            rule    = "PATTERN",
                            message = "Field '${rule.fieldPath}' value '$str' does not match required pattern."
                        )
                    }
                }
            }
        }

        return violations
    }

    /**
     * Resolves a dot-notation path against a nested map.
     * e.g. "payload.title" → map["payload"]["title"]
     */
    @Suppress("UNCHECKED_CAST")
    private fun resolveNestedPath(map: Map<String, Any?>, path: String): Any? {
        val parts = path.split(".")
        var current: Any? = map
        for (part in parts) {
            current = (current as? Map<String, Any?>)?.get(part) ?: return null
        }
        return current
    }
}

// ── Registry ──────────────────────────────────────────────────────────────

private val UUID_PATTERN = Regex(
    "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
)

class EventSchemaRegistry private constructor(
    private val schemas: Map<Pair<String, Int>, EventSchema>
) {
    /**
     * Resolves the schema for a given event type and version.
     *
     * @throws SchemaNotFoundException if no schema is registered for the pair.
     */
    fun resolve(eventType: String, version: Int): EventSchema {
        return schemas[Pair(eventType, version)]
            ?: throw SchemaNotFoundException(
                "No schema registered for eventType='$eventType' version=$version. " +
                "Registered schemas: ${schemas.keys.joinToString()}"
            )
    }

    /** Returns all registered (eventType, version) pairs. */
    fun registeredSchemas(): Set<Pair<String, Int>> = schemas.keys

    companion object {
        /**
         * Builds the default registry pre-loaded with all v1 platform schemas.
         * Call once at application startup and share as a singleton.
         */
        fun default(): EventSchemaRegistry = EventSchemaRegistry(
            schemas = buildDefaultSchemas()
        )

        private fun buildDefaultSchemas(): Map<Pair<String, Int>, EventSchema> {
            val all = listOf(
                listingCreatedV1(),
                embeddingGeneratedV1(),
                feedGeneratedV1(),
                rankingCompletedV1(),
                quotaExceededV1(),
                fraudDetectedV1(),
                monetizationEventRecordedV1()
            )
            return all.associateBy { Pair(it.eventType, it.version) }
        }

        // ── Schema definitions ────────────────────────────────────────────

        /** listing.created v1 — emitted when a tenant submits a new listing. */
        private fun listingCreatedV1() = EventSchema(
            eventType = "listing.created",
            version   = 1,
            rules     = listOf(
                FieldRule.Required("event_id"),
                FieldRule.Pattern("event_id", UUID_PATTERN),
                FieldRule.Required("tenant_id"),
                FieldRule.Pattern("tenant_id", UUID_PATTERN),
                FieldRule.Required("listing_id"),
                FieldRule.Pattern("listing_id", UUID_PATTERN),
                FieldRule.Required("payload.title"),
                FieldRule.TypeCheck("payload.title", String::class.java),
                FieldRule.StringLength("payload.title", min = 1, max = 100),
                FieldRule.Required("payload.embedding_vector"),
                FieldRule.TypeCheck("payload.embedding_vector", List::class.java),
                FieldRule.ExactListSize("payload.embedding_vector", size = 1536),
                FieldRule.MinValue("payload.price", min = 0.0)
            )
        )

        /** embedding.generated v1 — emitted after the AI pipeline indexes a listing. */
        private fun embeddingGeneratedV1() = EventSchema(
            eventType = "embedding.generated",
            version   = 1,
            rules     = listOf(
                FieldRule.Required("event_id"),
                FieldRule.Required("tenant_id"),
                FieldRule.Required("listing_id"),
                FieldRule.Pattern("listing_id", UUID_PATTERN),
                FieldRule.Required("embedding_model"),
                FieldRule.TypeCheck("embedding_model", String::class.java)
            )
        )

        /** feed.generated v1 — emitted when a candidate set is generated for a user session. */
        private fun feedGeneratedV1() = EventSchema(
            eventType = "feed.generated",
            version   = 1,
            rules     = listOf(
                FieldRule.Required("event_id"),
                FieldRule.Required("tenant_id"),
                FieldRule.Required("user_id"),
                FieldRule.Pattern("user_id", UUID_PATTERN),
                FieldRule.Required("candidate_count"),
                FieldRule.TypeCheck("candidate_count", Int::class.javaObjectType),
                FieldRule.MinValue("candidate_count", min = 0.0)
            )
        )

        /** ranking.completed v1 — emitted after multi-stage re-ranking. */
        private fun rankingCompletedV1() = EventSchema(
            eventType = "ranking.completed",
            version   = 1,
            rules     = listOf(
                FieldRule.Required("event_id"),
                FieldRule.Required("tenant_id"),
                FieldRule.Required("user_id"),
                FieldRule.Required("ranked_count"),
                FieldRule.TypeCheck("ranked_count", Int::class.javaObjectType),
                FieldRule.MinValue("ranked_count", min = 0.0)
            )
        )

        /** quota.exceeded v1 — emitted by the Token Guard engine. */
        private fun quotaExceededV1() = EventSchema(
            eventType = "quota.exceeded",
            version   = 1,
            rules     = listOf(
                FieldRule.Required("event_id"),
                FieldRule.Required("tenant_id"),
                FieldRule.Required("resource_name"),
                FieldRule.TypeCheck("resource_name", String::class.java),
                FieldRule.Required("current_usage"),
                FieldRule.Required("limit_amount")
            )
        )

        /** fraud.detected v1 — emitted by the Trust & Safety engine. */
        private fun fraudDetectedV1() = EventSchema(
            eventType = "fraud.detected",
            version   = 1,
            rules     = listOf(
                FieldRule.Required("event_id"),
                FieldRule.Required("tenant_id"),
                FieldRule.Required("actor_id"),
                FieldRule.Required("risk_score"),
                FieldRule.TypeCheck("risk_score", Double::class.javaObjectType),
                FieldRule.MinValue("risk_score", min = 0.0),
                FieldRule.Required("flags"),
                FieldRule.TypeCheck("flags", List::class.java)
            )
        )

        /** monetization.event_recorded v1 — emitted for every billed operation. */
        private fun monetizationEventRecordedV1() = EventSchema(
            eventType = "monetization.event_recorded",
            version   = 1,
            rules     = listOf(
                FieldRule.Required("event_id"),
                FieldRule.Required("tenant_id"),
                FieldRule.Required("resource_name"),
                FieldRule.Required("quantity"),
                FieldRule.TypeCheck("quantity", Int::class.javaObjectType),
                FieldRule.MinValue("quantity", min = 1.0)
            )
        )
    }
}

// ── Exceptions ────────────────────────────────────────────────────────────

/** Thrown when no schema is registered for the requested (eventType, version) pair. */
class SchemaNotFoundException(message: String) : RuntimeException(message)

/** Thrown (optionally) when a payload fails schema validation. */
class SchemaValidationException(
    val eventType: String,
    val violations: List<SchemaViolation>
) : RuntimeException(
    "Event '$eventType' failed schema validation with ${violations.size} violation(s): " +
    violations.joinToString("; ") { "${it.field}: ${it.message}" }
)
