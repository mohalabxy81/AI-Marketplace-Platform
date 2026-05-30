# 8. REALTIME ARCHITECTURE

> **Status**: Approved
> **Target Audience**: Frontend Engineers, Backend Engineers
> **Document Class**: Official Backend Constitution
> **System Context**: AI-Native Multi-Tenant Marketplace Operating System

---

## 1. Realtime Infrastructure Overview

The platform uses the **Supabase Realtime** server (an Elixir/Phoenix application) to manage state synchronization across distributed clients. It acts as the WebSocket backplane for the marketplace, handling three distinct message types:
1. **Broadcast**: Ephemeral, low-latency pub/sub messages (e.g., typing indicators).
2. **Presence**: Shared state indicating who is online or viewing a specific page.
3. **Postgres Changes (CDC)**: Subscribing to database mutations (INSERT/UPDATE/DELETE) streamed from the Postgres Write-Ahead Log (WAL).

---

## 2. Channel Architecture and Tenant Isolation

Security in the Realtime layer is achieved by namespacing channels. A client subscribes to a specific "Topic".

### 2.1 The Channel Naming Convention
To enforce multi-tenant isolation, every channel topic MUST include the `tenant_id`.

**Format**: `[domain]:[tenant_id]:[entity_type]:[entity_id]`

| Use Case | Topic Example | Channel Features |
|:---|:---|:---|
| Tenant Global Notifications | `system:550e8400...` | Broadcast (Alerts), Postgres (Notifications table) |
| Order/Transaction Tracking | `monetization:550e8400...:invoice:123` | Postgres (Ledger updates) |
| Live Chat / Messages | `communication:550e8400...:chat:456` | Broadcast (Typing), Presence (Online), Postgres (New messages) |
| Collaborative Dashboard | `dashboard:550e8400...` | Presence (Who is editing) |

### 2.2 Security via RLS
When a Next.js client subscribes to a Postgres CDC channel, Supabase Realtime *does not* stream all data blindly. 
1. Realtime reads the WAL.
2. It parses the row.
3. It impersonates the user who established the WebSocket (using their JWT).
4. It evaluates the RLS policies for that specific row.
5. If the policy returns `TRUE`, the event is pushed to the client. If `FALSE`, it is dropped silently.

This guarantees that Tenant A will never receive a CDC event for Tenant B's data, even if they maliciously attempt to subscribe to `tenant:B:system`.

---

## 3. Implementation Patterns

### 3.1 Pattern 1: Ephemeral AI Agent Streaming
When a user chats with an AI Agent on a listing page, the response tokens should not be written to Postgres one-by-one (this would destroy database I/O).
- **Solution**: The Deno Edge Function orchestrating the LLM streams the raw text tokens directly to the client via a **Realtime Broadcast Channel**.
- **Finalization**: Once the LLM finishes, the *complete* message is inserted into `communication.messages` in Postgres, which fires a CDC event to confirm persistence.

### 3.2 Pattern 2: Live Inventory / Auction Bidding
If the marketplace supports auctions or highly limited inventory (e.g., tickets, exclusive datasets), users need real-time price or quantity updates.
- **Solution**: The Next.js client subscribes to Postgres Changes on `marketplace.listings` where `id = <listing_id>`. When another user completes a purchase, the `available_quantity` drops, and the UI updates instantly for everyone looking at the page without requiring a page refresh or polling.

---

## 4. Scaling Limitations & Mitigations

Supabase Realtime is highly scalable (handling millions of concurrent connections via Phoenix/BEAM), but Postgres CDC is bottlenecked by the WAL reader.

### 4.1 Publication Filtering
We do NOT publish all tables to Realtime. Publishing high-volume tables (like `analytics.events` or `ai.semantic_cache`) will overwhelm the WAL replication slot.

**Only enable publication for UI-critical tables:**
```sql
-- Enable Realtime for critical tables ONLY
ALTER PUBLICATION supabase_realtime ADD TABLE communication.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE crm.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE marketplace.listings;
```

### 4.2 Broadcast over CDC for High-Frequency Events
If an event happens more than 10 times per second (e.g., live cursor tracking on a collaborative whiteboard, or live video viewer counts), it MUST use Broadcast, not Postgres CDC.

---

## 5. Client Integration (Next.js)

Realtime connections should be established in Next.js using a singleton pattern via a Provider context, ensuring only one WebSocket connection is opened per browser tab.

```typescript
// Next.js Client Subscription Example
const channel = supabase
  .channel(`communication:${tenantId}:chat:${conversationId}`)
  .on(
    'postgres_changes',
    {
      event: 'INSERT',
      schema: 'communication',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}` // Additional safety filter
    },
    (payload) => {
      addMessageToState(payload.new);
    }
  )
  .subscribe()
```
