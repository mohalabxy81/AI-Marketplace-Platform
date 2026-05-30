# PRD 11 — CRM & COMMUNICATION SYSTEM

> **Status**: Approved
> **Target Audience**: Engineering, Product, UX
> **Domain**: Marketplace (CRM Sub-Domain)

## 1. Executive Summary
The CRM & Communication System provides the internal tooling for tenants to manage their buyer relationships directly on the platform. Rather than forcing sellers to export leads to external email clients, this system provides a centralized messaging inbox, conversation threading, activity tracking, and internal note-taking. This ensures all communication context remains attached to the marketplace listing and lead lifecycle.

## 2. Business Objectives
- **Platform Stickiness**: Retain sellers on the platform by providing robust operational tooling, reducing the need for third-party CRM subscriptions for smaller tenants.
- **Data Capture**: Capture buyer-seller interactions to feed trust models (e.g., detecting abusive language or off-platform circumvention) and response-time SLAs.
- **Workflow Efficiency**: Enable sales teams to collaborate seamlessly on leads.

## 3. Strategic Goals
- Ensure 100% message delivery reliability via WebSocket with HTTP polling fallback.
- Support thread-level isolation so multiple team members can view context safely.

## 4. User Personas
- **Sales Rep / Agent**: Uses the system daily to message buyers, log activities, and leave notes.
- **Company Admin**: Uses the system to monitor team communications and reassign stuck threads.
- **Buyer**: Receives messages via their buyer inbox (and email relay) and replies to sellers.

## 5. Stakeholders
- **Trust & Safety**: Monitors communication threads for policy violations.
- **Tenant Owners**: Relies on activity tracking for team performance management.

## 6. User Stories
- As a **Sales Rep**, I want to message a buyer directly from the platform so my responses are tracked against the lead.
- As an **Agent**, I want to leave a private internal note on a thread (e.g., "Buyer seems price sensitive") that the buyer cannot see.
- As a **Buyer**, I want to receive seller messages in my email and be able to reply directly without logging back into the platform (V2).
- As a **Company Admin**, I want to see a timeline of all touches (messages, status changes, notes) on a lead to understand why a deal stalled.

## 7. Functional Requirements
- **FR-CRM-01 (Messaging)**: Bi-directional messaging between buyer and seller attached to a specific lead/listing context.
- **FR-CRM-02 (Internal Notes)**: Support private, tenant-only comments on a communication thread.
- **FR-CRM-03 (Activity Timeline)**: Automatically log state changes (status updates, assignments) in the conversation history.
- **FR-CRM-04 (Read Receipts)**: Track when a message is delivered and read.

## 8. Non-Functional Requirements
- **Privacy**: Strict RLS separation; a tenant cannot read another tenant's messages. Internal notes must never leak to the buyer.
- **Performance**: Messaging UI must feel instantaneous (optimistic UI updates).

## 9. User Workflows
- **Reply Flow**: Agent opens Inbox → Selects Thread → Types message → Clicks Send → Message appended optimistically → Sent via WebSocket → Saved to DB → Buyer notified.
- **Note Flow**: Agent toggles to "Internal Note" → Types note → Note appears in thread with distinct yellow styling → Visible only to team.

## 10. State Machines
- **Message State**: `SENT` → `DELIVERED` → `READ`.

## 11. Business Rules
- Messages cannot be deleted once sent (for trust & safety auditability), but can be marked as retracted/hidden.
- Trust & Safety ML models continuously scan messages for prohibited content (e.g., sharing credit card numbers, hate speech).

## 12. Permissions
- `messages:read` - Read access to tenant messages.
- `messages:send` - Send messages.
- `messages:notes:write` - Create internal notes.

## 13. Events Generated
- `messaging.message_sent`
- `messaging.message_read`
- `messaging.note_added`

## 14. Events Consumed
- `marketplace.lead_status_updated` (Appends system message to timeline).

## 15. Analytics Requirements
- Track average thread length.
- Track seller response time (Time between buyer message and seller reply).

## 16. KPIs
- Messages Sent per Day.
- Seller Reply Rate (%).

## 17. Success Metrics
- 80% of leads generate a bi-directional conversation thread.

## 18. Edge Cases
- **Simultaneous Replies**: Two agents reply to the same buyer at the exact same time. Both messages should append correctly via sequence IDs.

## 19. Failure Scenarios
- **Message Delivery Failure**: If WebSocket fails, the message is queued and the UI shows a "Retry" state.

## 20. Compliance Requirements
- Provide tooling for Super Admins to export a specific message thread if required by law enforcement.

## 21. Realtime Requirements
- Messages must appear in the recipient's open browser tab instantly via WebSockets.

## 22. AI Requirements
- V2: Suggested replies for sellers based on the listing context and buyer inquiry (e.g., Smart Reply).

## 23. MVP Scope
- Simple text-based bi-directional messaging.
- Centralized inbox UI.

## 24. V1 Scope
- Internal Notes.
- Read receipts.
- Activity timeline (system events mixed with messages).

## 25. V2 Scope
- Email relay (replying via email client posts to the platform DB).
- Smart Reply (AI suggestions).
- File attachments in chat.

## 26. Future Enhancements
- Voice/Video call integration (Twilio/Agora).
- Task management (set follow-up reminders).

## 27. Acceptance Criteria
- [ ] A seller can send a message to a buyer, and the buyer can reply.
- [ ] An agent can add an internal note that is completely invisible to the buyer.
- [ ] Messages appear in real-time if both parties have the app open.
- [ ] Changing a lead's status adds a system event to the message timeline.
