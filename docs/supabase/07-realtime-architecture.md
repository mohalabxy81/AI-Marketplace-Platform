# 7. REALTIME ARCHITECTURE

> **Status**: Approved
> **Target Audience**: Frontend Engineers, Backend Engineers
> **Domain**: Realtime Infrastructure

## 1. Executive Summary
The Realtime Architecture leverages Supabase Realtime (an Elixir cluster) to push instant updates to clients. It eliminates the need for expensive HTTP polling and maintains the platform's "operating system" feel by instantly synchronizing state across thousands of active sessions.

## 2. Channel & Subscription Model
Supabase Realtime provides three core primitives: Broadcast, Presence, and Postgres Changes. We utilize distinct channels to route messages efficiently.

### `tenant:[tenant_id]` Channel
- **Purpose**: Workspace-wide updates.
- **Payloads**: New leads, CRM messages, quota warnings, background task completions.
- **Security**: Only members with a matching `tenant_id` in their JWT can join.

### `listing:[listing_id]` Channel
- **Purpose**: Entity-specific updates for public or private viewing.
- **Payloads**: Status changes (e.g., Sold out), price drops, live visitor count.
- **Security**: Public read if listing is published; private if drafted.

### `user:[user_id]` Channel
- **Purpose**: Individual-specific updates.
- **Payloads**: Direct messages, personal notification alerts, MFA challenges.
- **Security**: Strictly limited to the authenticated `user_id`.

### `system:broadcast` Channel
- **Purpose**: Global platform announcements.
- **Payloads**: Maintenance windows, feature flag toggles.
- **Security**: Public read, `SUPER_ADMIN` write only.

## 3. Realtime Capabilities

### 3.1 Postgres Changes (CDC)
- Uses Postgres Logical Replication (WAL).
- **Use Case**: Instantly updating the UI when a listing's status changes from `PENDING_REVIEW` to `PUBLISHED` without requiring the Edge Function to send a separate Broadcast event.
- **Configuration**: Only highly specific tables (e.g., `marketplace.leads`, `marketplace.listing_status_transitions`) are added to the publication list to avoid choking the Elixir nodes with high-volume WAL noise (like analytics events).

### 3.2 Broadcast
- **Use Case**: Ephemeral events that do not need database persistence.
- **Examples**: Cursor tracking in collaborative text editors, live typing indicators in the CRM chat.

### 3.3 Presence
- **Use Case**: Tracking who is currently online.
- **Examples**: Showing a green dot next to a Tenant Admin in the team roster; displaying "3 buyers are currently viewing this listing."

## 4. Security Model
Realtime channels enforce Postgres RLS seamlessly. When a client subscribes to Postgres Changes, the Supabase Realtime server establishes a database connection acting as that user (by passing their JWT context) and runs the RLS policies against the WAL stream. If the policy fails, the event is silently dropped for that specific client.

## 5. Scaling Strategy
- **Connection Limits**: Supabase Enterprise supports 100k+ concurrent connections.
- **WAL Filtering**: To prevent bottlenecks, configure the publication strictly:
  ```sql
  ALTER PUBLICATION supabase_realtime ADD TABLE marketplace.leads;
  ```
- **Connection Throttling**: Frontend clients must implement exponential backoff logic on disconnects to avoid Thundering Herd scenarios if the WebSocket gateway restarts.
