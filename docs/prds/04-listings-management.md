# PRD 4 — LISTINGS MANAGEMENT

> **Status**: Approved
> **Target Audience**: Engineering, Product, Design, Trust & Safety
> **Domain**: Marketplace

## 1. Executive Summary
The Listings Management domain is the core supply-side engine of the marketplace. It enables sellers (tenants) to create, manage, version, and optimize their marketplace inventory. Because listings are the primary driver of buyer discovery and engagement, this system heavily integrates with Media Management, AI Content Intelligence, and Trust & Safety pipelines to ensure high-quality, standardized supply data.

## 2. Business Objectives
- **Supply Growth**: Provide a frictionless, intuitive creation flow to maximize inventory volume.
- **Data Quality**: Ensure structured, accurate data capture to feed the vector search and filtering engines.
- **Trust & Integrity**: Tightly couple listing creation with moderation pipelines to prevent fraudulent or low-quality inventory.

## 3. Strategic Goals
- Maintain < 2 seconds latency for listing save/update actions.
- Facilitate an average listing creation time of under 5 minutes for manual entry.
- Ensure 100% of published listings pass the automated AI moderation scan before becoming visible.

## 4. User Personas
- **Agent/Seller**: Primary creator and manager of listing content.
- **Company Admin**: Oversees team listings, performs bulk updates, and manages catalog hygiene.
- **Content Moderator (Admin)**: Reviews flagged listings in the moderation queue.

## 5. Stakeholders
- **Discovery Team**: Relies on structured listing metadata for accurate search and ranking.
- **AI Team**: Relies on listing descriptions to generate high-quality embedding vectors.
- **Trust & Safety**: Relies on the state machine to quarantine violating listings.

## 6. User Stories
- As a **Seller**, I want to easily upload multiple photos and reorder them so my listing looks appealing.
- As a **Company Admin**, I want to bulk import 500 listings via CSV so I don't have to enter them manually.
- As an **Agent**, I want AI suggestions to improve my listing description so I can attract more leads.
- As a **Platform Operator**, I want to view the version history of a listing to see if an agent stealthily changed a price after a lead was captured.

## 7. Functional Requirements
- **FR-LST-01 (Listing CRUD)**: Full creation, reading, updating, and deletion of listings (Title, Description, Price, Category, Tags).
- **FR-LST-02 (State Machine)**: Enforce lifecycle statuses (Draft, Pending Review, Active, Archived, Quarantined).
- **FR-LST-03 (Bulk Operations)**: Support bulk status changes, bulk tag additions, and CSV imports (V1).
- **FR-LST-04 (Expiration)**: Support setting expiration dates for listings to auto-archive stale supply.
- **FR-LST-05 (Versioning)**: Track historical changes to critical fields (Price, Description) for auditability (V2).

## 8. Non-Functional Requirements
- **Isolation**: Tenant RLS policies must strictly govern read/write access.
- **Eventual Consistency**: Once saved, listings must be indexed into the vector database asynchronously within 500ms.
- **Scalability**: Capable of handling 1,000+ listings imported concurrently via CSV without degrading platform performance.

## 9. User Workflows
- **Standard Creation**: User clicks "New Listing" → Fills out metadata (Title, Category, Price) → Uploads Images → Clicks Submit → Status becomes `PENDING_REVIEW` → Automated AI Scan runs → Status becomes `ACTIVE`.
- **Bulk Import (V1)**: User uploads CSV → Background worker parses rows → Validates data → Generates embeddings in batch → Sends to moderation → Batch notification upon completion.

## 10. State Machines
- **Listing Status**: 
  - `DRAFT` (Private to tenant)
  - `PENDING_REVIEW` (Awaiting Trust & Safety scan)
  - `ACTIVE` (Visible in discovery)
  - `ARCHIVED` (Hidden, preserved)
  - `QUARANTINED` (Hidden due to policy violation)
  - `DELETED` (Soft deleted).

## 11. Business Rules
- A listing must have at least 1 image, a title (>10 chars), and a valid category before moving from DRAFT to PENDING_REVIEW.
- Only the creator or a Company Admin can edit a listing.
- Moving to ACTIVE triggers a billing quota check; if the tenant is over quota, the listing remains ARCHIVED.
- Any change to the Title, Description, or Images pushes the listing back to PENDING_REVIEW (re-triggering moderation).

## 12. Permissions
- `listings:create` - Create new listings.
- `listings:own:write` - Edit listings created by the user.
- `listings:write` - Edit any listing in the tenant (Admins).
- `listings:bulk:*` - Execute bulk import/updates.

## 13. Events Generated
- `marketplace.listing_created`
- `marketplace.listing_updated`
- `marketplace.listing_status_changed`
- `marketplace.listing_deleted`

## 14. Events Consumed
- `trust.content_approved` (Transitions listing to ACTIVE).
- `trust.content_quarantined` (Transitions listing to QUARANTINED).

## 15. Analytics Requirements
- Track creation time (Draft initiation to Submit).
- Track listing churn (Active to Archived/Deleted).
- Monitor average number of images per listing.

## 16. KPIs
- Total Active Listings (Platform Supply).
- Supply Velocity (New Active Listings per week).
- Listing Rejection Rate (by moderation).

## 17. Success Metrics
- Zero instances of a QUARANTINED listing appearing in discovery feeds.
- 95% of listings transition from PENDING_REVIEW to ACTIVE in under 10 seconds via AI automation.

## 18. Edge Cases
- **Concurrent Edits**: Two admins edit the same listing simultaneously (requires optimistic concurrency control / eTags).
- **Category Deletion**: A platform admin deletes a category; associated listings must map to a default fallback or parent category gracefully.

## 19. Failure Scenarios
- **Embedding Failure**: If AI generation fails, the listing remains ACTIVE but falls back to BM25 keyword search until the retry queue succeeds.
- **Media Upload Timeout**: Graceful UI error prompting retry without losing the filled-in text metadata.

## 20. Compliance Requirements
- Provide immutable history of price changes to resolve buyer disputes (V2 Versioning).

## 21. Realtime Requirements
- The UI must instantly update the listing's status badge via WebSocket when the background moderation task completes (e.g., seeing it flip from Pending to Active in real-time).

## 22. AI Requirements
- **Embedding Sync**: Trigger an embedding generation task upon any text change.
- **Content Enrichment**: (V1) AI suggests better titles, tags, and description improvements during the drafting phase to maximize quality scores.

## 23. MVP Scope
- Full CRUD operations.
- Status state machine with automated transitions via AI Moderation.
- Basic image attachments (1 primary + gallery).
- Keyword tags and category assignments.

## 24. V1 Scope
- CSV Bulk Import.
- Bulk status updates.
- AI Enrichment suggestions in the UI.

## 25. V2 Scope
- Listing Versioning and diff history.
- Custom Attributes (tenant-specific fields).
- Listing Expiry auto-archiving.

## 26. Future Enhancements
- Video and 3D Tour attachments.
- Collaborative listing drafts (multi-player editing).
- Automated inventory sync with third-party CRM/ERP systems via API.

## 27. Acceptance Criteria
- [ ] A seller can create a listing, upload an image, and submit it.
- [ ] Submitting a listing sends it to `PENDING_REVIEW` and triggers the AI moderation scan.
- [ ] If AI approves, listing becomes `ACTIVE` and an event is published to the Event Mesh.
- [ ] A seller cannot edit a listing to change its status to `ACTIVE` directly bypassing moderation.
- [ ] Bulk import correctly maps CSV columns to listing attributes and processes rows in batch.
