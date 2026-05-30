# PRD 5 — PROPERTY & ATTRIBUTE SYSTEM

> **Status**: Approved
> **Target Audience**: Engineering, Product, Marketplace Operations
> **Domain**: Marketplace

## 1. Executive Summary
The Property & Attribute System governs the taxonomy and structured metadata defining marketplace listings. To move beyond generic descriptions and enable deep, faceted search, listings must be categorized into specific Property Types (e.g., Commercial Real Estate, Industrial Equipment) with corresponding Attributes (e.g., Square Footage, Year Built) and Amenities. This domain powers the structured filtering capabilities in the Discovery system.

## 2. Business Objectives
- **Standardized Supply**: Enforce consistent data capture across different verticals.
- **Precision Discovery**: Enable buyers to filter listings by precise, categorical requirements rather than relying solely on semantic search.
- **Vertical Expansion**: Allow the platform to easily onboard new marketplace verticals simply by defining new Categories and Attribute schemas.

## 3. Strategic Goals
- Ensure attribute payloads remain small enough for rapid JSONB parsing and vector indexing.
- Support deep taxonomies without creating overly complex UI creation flows for sellers.
- Enable zero-downtime schema updates for category attributes.

## 4. User Personas
- **Buyer**: Relies on attributes to filter and compare listings.
- **Seller**: Inputs attribute data during listing creation.
- **Super Admin (Taxonomist)**: Defines the global platform categories and required attribute schemas.
- **Tenant Admin**: Defines custom tenant-specific attributes (V2).

## 5. Stakeholders
- **Discovery Team**: Uses structured attributes for faceted search (Elasticsearch/Postgres JSONB).
- **AI Team**: Uses attribute schemas to generate structured prompts for LLM listing enrichment.
- **Frontend Team**: Renders dynamic forms based on the category attribute schemas.

## 6. User Stories
- As a **Super Admin**, I want to define a "Commercial Office" category with required attributes "Square Feet" and "Max Occupancy" so sellers provide complete data.
- As a **Seller**, I want the listing form to adapt dynamically when I select a category, showing only relevant fields.
- As a **Buyer**, I want to filter my search specifically by "Square Feet > 5000" instead of just hoping the text search finds it.
- As a **Tenant Admin**, I want to add a custom attribute called "Internal Asset ID" that isn't public but helps my team track inventory (V2).

## 7. Functional Requirements
- **FR-ATT-01 (Categories)**: Support a hierarchical category tree (Parent → Child).
- **FR-ATT-02 (Attribute Schemas)**: Attributes mapped to categories with strong typing (String, Integer, Boolean, Enum, Date).
- **FR-ATT-03 (Validation)**: Enforce required vs. optional attributes during listing submission.
- **FR-ATT-04 (Amenities/Tags)**: Support flat tagging arrays associated with listings.
- **FR-ATT-05 (Custom Fields)**: Allow tenants to define custom attributes (V2).

## 8. Non-Functional Requirements
- **Storage**: Attributes must be stored as indexed JSONB on the Listing record to avoid expensive EAV (Entity-Attribute-Value) table joins.
- **Performance**: Dynamic form schema retrieval must take < 50ms.

## 9. User Workflows
- **Category Definition (Admin)**: Super Admin navigates to Taxonomy → Creates Category "Office" → Adds Attribute "SqFt" (Integer, Required) → Publishes schema.
- **Listing Creation (Seller)**: Seller selects "Office" → UI fetches schema → Renders "SqFt" input field → Seller inputs 5000 → Validated and saved in JSONB payload.

## 10. State Machines
- **Category Schema State**: `DRAFT` → `ACTIVE` → `DEPRECATED`.

## 11. Business Rules
- If an attribute is marked "Required," the listing cannot transition from DRAFT to PENDING_REVIEW without it.
- Changing an attribute type (e.g., String to Integer) in an active schema requires a migration strategy to handle existing JSONB data.
- Deleted attributes are hidden from the UI but retained in the JSONB payload for historical accuracy.

## 12. Permissions
- `admin:taxonomy:write` - Manage global categories and attributes (Super Admin).
- `tenant:attributes:write` - Manage custom tenant attributes (Tenant Owner, V2).

## 13. Events Generated
- `taxonomy.category_created`
- `taxonomy.schema_updated`

## 14. Events Consumed
- None (Taxonomy is primarily a master data publisher).

## 15. Analytics Requirements
- Track attribute fill rates (how often are optional attributes completed?).
- Track category usage distribution across active listings.
- Identify unused or rarely-used attributes for cleanup.

## 16. KPIs
- Category Fill Rate.
- Filter utilization rate (which attributes are buyers actually filtering by?).

## 17. Success Metrics
- 100% of ACTIVE listings contain all globally required attributes for their category.
- Faceted filtering latency remains < 100ms even with complex attribute filters on 1M+ listings.

## 18. Edge Cases
- **Listing Migration**: When a category schema changes, existing listings remain valid but are prompted to update the missing required fields upon their next edit.
- **Deep Hierarchies**: Prevent hierarchies deeper than 3 levels to maintain UI usability.

## 19. Failure Scenarios
- **Schema Fetch Timeout**: If dynamic schema fetch fails, fall back to basic text description entry to prevent blocking supply creation.

## 20. Compliance Requirements
- Avoid capturing PII in custom attribute fields; rely on AI moderation to detect if a tenant creates a custom field asking for sensitive data.

## 21. Realtime Requirements
- N/A. Taxonomy updates can propagate eventually.

## 22. AI Requirements
- AI must parse raw text descriptions and suggest values for structured attributes (e.g., detecting "5,000 sq ft office" and auto-filling the SqFt integer field).

## 23. MVP Scope
- Flat 2-level category hierarchy (e.g., Real Estate → Office).
- Static JSONB storage.
- Standard platform tags.

## 24. V1 Scope
- Strictly typed Attribute schemas per category (Integer, Boolean, Enum).
- Required vs. Optional field validation.

## 25. V2 Scope
- Custom tenant-defined categories and attributes.
- Location Metadata (GeoJSON integration for radius search).

## 26. Future Enhancements
- Ontology mapping (mapping vendor-specific attributes to a global platform ontology).

## 27. Acceptance Criteria
- [ ] A Super Admin can create a category and attach strongly-typed attributes.
- [ ] During listing creation, selecting the category dynamically renders the correct attribute fields.
- [ ] The system rejects listing submission if a required attribute is missing.
- [ ] Attributes are saved properly in the JSONB `metadata` column of the listing table.
