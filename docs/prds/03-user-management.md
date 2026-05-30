# PRD 3 — USER MANAGEMENT

> **Status**: Approved
> **Target Audience**: Engineering, Product, UI/UX
> **Domain**: Identity & Access Management / Tenant Management

## 1. Executive Summary
The User Management domain governs the lifecycle, preferences, and personal configurations of individual users on the platform. It separates the human identity (User) from their organizational context (Tenant/Role). This domain handles profile setups, personal notification settings, avatar management, UI preferences (e.g., dark mode), and GDPR-compliant account deletion.

## 2. Business Objectives
- **User Engagement**: Provide personalized experiences by remembering user preferences across sessions.
- **Compliance & Trust**: Give users total control over their personal data, privacy, and communication preferences.
- **Retention**: Ensure high-quality communication delivery (avoiding spam) by respecting notification configurations.

## 3. Strategic Goals
- Ensure all personal data deletion requests are processed fully across all microservices within 30 days.
- Maintain a highly performant user profile fetch (< 20ms) as it is required on almost every page load.

## 4. User Personas
- **All Authenticated Users**: Every user has a personal profile and settings, regardless of their tenant roles.
- **Buyers**: Use profile settings to manage saved searches and communication preferences.
- **Agents/Sellers**: Manage public-facing profiles (bio, avatar) visible to buyers.

## 5. Stakeholders
- **Marketing/CRM**: Relies on accurate communication preferences to send newsletters and digests.
- **Legal/DPO**: Ensures privacy controls meet regulatory requirements.
- **UX Team**: Relies on UI preferences (theme, language) to render the app correctly.

## 6. User Stories
- As an **Agent**, I want to upload a professional avatar and write a bio so that buyers trust me when viewing my listings.
- As a **User**, I want to toggle off marketing emails but keep transactional alerts so my inbox isn't cluttered.
- As a **Buyer**, I want to delete my account completely and wipe all my inquiry history.
- As a **Global User**, I want to set my preferred language and timezone so timestamps and text are localized correctly.

## 7. Functional Requirements
- **FR-USR-01 (Profile CRUD)**: Users can update basic info (Name, Avatar, Bio, Phone number).
- **FR-USR-02 (Preferences)**: Users can set UI Theme (Light/Dark/System), Language, and Timezone.
- **FR-USR-03 (Notification Settings)**: Granular toggles for Email, Push, and In-App notifications across different categories (Marketing, Leads, System).
- **FR-USR-04 (Account Lifecycle)**: Users can initiate self-service account deletion.
- **FR-USR-05 (Public Profile)**: Agents can toggle public visibility of their profile to buyers.

## 8. Non-Functional Requirements
- **Performance**: Avatar images must be optimized and served via CDN.
- **Privacy**: Phone numbers and emails must be encrypted at rest if PII compliance requires it.
- **Accessibility**: User preference UI must meet WCAG 2.1 AA standards.

## 9. User Workflows
- **Update Avatar**: User navigates to Settings → Profile → Uploads Image → Image is resized/cropped → Uploaded to S3 → CDN URL saved to DB → Profile updates instantly.
- **Delete Account**: User clicks Delete → Prompted for password/MFA confirmation → Account marked as Soft-Deleted → 30-day countdown begins → Background job purges data.

## 10. State Machines
- **Account Data State**: `ACTIVE` → `SOFT_DELETED` (awaiting purge) → `PURGED` (anonymized).

## 11. Business Rules
- An account cannot be deleted if the user is the sole Owner of an active Tenant (they must transfer ownership or delete the Tenant first).
- Critical system emails (e.g., billing failures, security alerts) cannot be opted out of.
- Avatars must not exceed 5MB and must be standard image formats (JPEG, PNG, WebP).

## 12. Permissions
- `profile:read` - Read public profile.
- `profile:write` - Update own profile.
- `admin:users:read` - (Super Admin) View user profiles for support.

## 13. Events Generated
- `user.profile_updated`
- `user.preferences_changed`
- `user.deletion_requested`
- `user.purged`

## 14. Events Consumed
- `identity.user_registered` (Initializes default profile and preferences).

## 15. Analytics Requirements
- Track adoption of Dark Mode vs. Light Mode.
- Monitor account deletion request rates (churn signal).
- Track opt-out rates for different notification categories.

## 16. KPIs
- Profile Completion Percentage (users with avatar + bio).
- Email Opt-Out Rate.

## 17. Success Metrics
- > 80% of active agents have a completed public profile.
- 0 compliance breaches regarding account deletion SLAs.

## 18. Edge Cases
- **GDPR vs Audit Logs**: User requests deletion, but their actions in the moderation queue or billing ledger must remain for legal/audit reasons (solution: hard anonymization of the user ID).
- **Timezone shifts**: Handling users traveling across timezones for localized push notifications.

## 19. Failure Scenarios
- **Avatar Upload Fails**: Display graceful error and fallback to initials-based default avatar.
- **Deletion Job Fails**: Alert SREs if the 30-day hard purge cron job fails to process a deleted account.

## 20. Compliance Requirements
- **GDPR / CCPA**: Self-serve data export (JSON dump of all user data) and Right to Erasure.

## 21. Realtime Requirements
- Language/Theme preference changes should reflect immediately across all open browser tabs for that user via WebSocket broadcast.

## 22. AI Requirements
- N/A for MVP. V2: AI moderation of uploaded avatars to prevent inappropriate imagery.

## 23. MVP Scope
- Basic profile updates (Name, Avatar, Phone).
- Basic UI preferences (Theme).
- Global notification toggle.

## 24. V1 Scope
- Granular notification preferences.
- Public agent profile pages.
- Self-serve account deletion.

## 25. V2 Scope
- Data export tools for GDPR.
- AI Avatar moderation.
- Localization/Language preferences.

## 26. Future Enhancements
- "Out of Office" status settings for agents routing leads to team members.
- Social links integration for public profiles.

## 27. Acceptance Criteria
- [ ] Users can successfully upload an avatar image and it propagates via CDN.
- [ ] Changing the UI Theme preference persists across sessions.
- [ ] Users can toggle marketing emails off, and the system respects this flag.
- [ ] A user cannot delete their account if they are the sole owner of a tenant workspace.
- [ ] Account deletion successfully anonymizes or drops PII within the platform.
