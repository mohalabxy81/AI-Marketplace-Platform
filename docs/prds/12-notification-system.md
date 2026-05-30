# PRD 12 — NOTIFICATION SYSTEM

> **Status**: Approved
> **Target Audience**: Engineering, Product, Communications Teams
> **Domain**: Realtime Infrastructure / Communications

## 1. Executive Summary
The Notification System is the central routing and delivery engine for all asynchronous alerts across the platform. It abstracts the complexity of delivering messages across multiple channels (In-App, Email, Push) while strictly respecting the User Management domain's notification preferences. It handles high-priority transactional alerts (e.g., new lead) and low-priority batch digests (e.g., weekly performance).

## 2. Business Objectives
- **Drive Re-engagement**: Bring users back to the platform via timely, relevant alerts.
- **Prevent Spam**: Ensure users never receive unwanted marketing or duplicate notifications, preserving platform trust.
- **Reliability**: Guarantee delivery of critical transactional alerts (e.g., password reset, billing failure) regardless of channel outages.

## 3. Strategic Goals
- Deliver high-priority transactional emails in < 5 seconds.
- Deliver in-app WebSocket notifications in < 500ms.
- Handle sudden spikes in notification volume (e.g., mass platform announcements) via robust queuing without crashing.

## 4. User Personas
- **Buyer**: Receives saved search alerts, message replies, and marketing digests.
- **Seller**: Receives new lead alerts, moderation rejections, and quota warnings.
- **Super Admin**: Sends platform-wide system announcements.

## 5. Stakeholders
- **Marketing Team**: Designs email templates and campaigns.
- **Support Team**: Uses delivery logs to troubleshoot "I didn't get the email" tickets.

## 6. User Stories
- As an **Agent**, I want an in-app notification and an email when a new lead arrives so I never miss a sale.
- As a **User**, if I have the app open, I don't want an email for every single chat message I receive, to prevent inbox spam.
- As a **Buyer**, I want a daily digest email of all new listings that match my saved search instead of an email for every single one.
- As a **Platform Operator**, I want to broadcast a banner notification to all users about upcoming scheduled maintenance.

## 7. Functional Requirements
- **FR-NOT-01 (Multi-Channel Delivery)**: Support Email (via SendGrid/Postmark) and In-App (via WebSocket + DB).
- **FR-NOT-02 (Preference Checking)**: Intercept all outbound notifications and drop them if the user has opted out of that specific category.
- **FR-NOT-03 (Smart Routing)**: If a user reads an in-app notification within 5 minutes, cancel the fallback email delivery.
- **FR-NOT-04 (Template Engine)**: Support dynamic variable interpolation in email templates.
- **FR-NOT-05 (Batching)**: Aggregate low-priority events into daily/weekly digests.

## 8. Non-Functional Requirements
- **Idempotency**: Ensure a user never receives the exact same notification twice due to queue retries.
- **Scalability**: The worker queue must scale horizontally to handle backlogs.

## 9. User Workflows
- **Trigger**: System publishes `marketplace.inquiry_submitted` event → Notification Worker picks up event → Checks User Preferences → User has Email=ON, In-App=ON → Worker writes to DB (unread) → Worker pushes via WebSocket → Worker schedules Email job with 5 min delay. If DB record marked READ before 5 mins, Email job is cancelled.

## 10. State Machines
- **Notification State**: `UNREAD` → `READ` (or `DISMISSED`).
- **Delivery State**: `QUEUED` → `DELIVERED` (or `FAILED` / `DROPPED_BY_PREFERENCE`).

## 11. Business Rules
- System-critical notifications (Password Reset, Suspension, Billing Failure) bypass all user preference opt-outs.
- Marketing and Digest notifications are strictly opt-in (or soft opt-out) depending on GDPR/CAN-SPAM requirements.

## 12. Permissions
- `notifications:read` - Read own notifications.
- `notifications:write` - Mark own notifications as read/dismissed.
- `admin:broadcast:write` - Send platform-wide announcements.

## 13. Events Generated
- `notification.delivered`
- `notification.read`
- `notification.failed`

## 14. Events Consumed
- Almost all platform events act as triggers for the notification engine.

## 15. Analytics Requirements
- Email Open Rates and Click-Through Rates.
- In-App Notification Dismissal Rate (helps identify annoying notifications).
- Delivery failure rate (bounces, complaints).

## 16. KPIs
- Deliverability Rate (> 99%).
- Time-to-Inbox for transactional emails.

## 17. Success Metrics
- Zero compliance violations regarding unsolicited email (spam reports < 0.1%).

## 18. Edge Cases
- **Hard Bounces**: If an email hard bounces, automatically flip the user's email preference to OFF and display an in-app banner asking them to update their email address.

## 19. Failure Scenarios
- **Email Provider Outage**: The queue must implement exponential backoff and retry until the third-party provider recovers.

## 20. Compliance Requirements
- CAN-SPAM / GDPR: All non-transactional emails must include a clear, one-click unsubscribe link.

## 21. Realtime Requirements
- In-App notifications must trigger the UI notification bell instantly via WebSocket.

## 22. AI Requirements
- V2: Smart Delivery Time (AI analyzes when the user is most likely to open emails and delays digest delivery to that optimal window).

## 23. MVP Scope
- Transactional Emails (SendGrid/Postmark integration).
- Basic In-App notification list.
- Preference checking before delivery.

## 24. V1 Scope
- Smart Routing (cancel email if read in-app).
- HTML Template management.

## 25. V2 Scope
- Batched digests (Saved Search alerts).
- Push Notifications (iOS/Android/Web Push).

## 26. Future Enhancements
- AI-optimized send times.
- SMS delivery for urgent alerts.

## 27. Acceptance Criteria
- [ ] A triggered event correctly generates an in-app notification.
- [ ] If a user opts out of marketing emails, they do not receive them, but still receive password resets.
- [ ] Unread in-app notifications increment a visual badge counter on the frontend.
- [ ] Clicking a notification marks it as read and redirects the user to the relevant context.
