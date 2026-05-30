# PRD 21 — REALTIME PLATFORM

> **Status**: Approved
> **Target Audience**: Engineering, DevOps, Product
> **Domain**: Realtime Infrastructure

## 1. Executive Summary
The Realtime Platform is the connective tissue that makes the marketplace feel alive and responsive. Moving beyond traditional request/response HTTP patterns, this domain establishes persistent, bidirectional WebSocket connections with clients. It manages presence, live event broadcasting (e.g., new messages, status changes), and multiplexing topics (channels) so that users receive instant feedback without needing to refresh their browsers.

## 2. Business Objectives
- **User Experience**: Provide a modern, app-like experience where data updates instantly, increasing user satisfaction and reducing cognitive load.
- **Operational Efficiency**: Reduce the load on the primary API and database by eliminating aggressive client-side polling.
- **Sales Velocity**: Ensure sellers receive lead notifications instantly, directly improving response times and conversion rates.

## 3. Strategic Goals
- Establish and maintain up to 100,000 concurrent WebSocket connections.
- Ensure end-to-end message delivery latency from backend event emission to client rendering is < 200ms globally.
- Maintain seamless reconnection logic so users don't miss events if they briefly lose network connectivity (e.g., riding a subway).

## 4. User Personas
- **Buyer**: Receives live updates if a listing they are viewing changes price or status.
- **Seller**: Receives live CRM messages, new lead alerts, and moderation status changes.
- **Infrastructure Engineer**: Manages the WebSocket gateway clusters and pub/sub backplane (Redis).

## 5. Stakeholders
- **CRM / Communications Team**: Relies entirely on this system for real-time chat.
- **Frontend Team**: Consumes the real-time events to optimistically update local UI state.

## 6. User Stories
- As a **Seller**, when I am looking at my dashboard, I want to see a new message pop up instantly without having to click refresh.
- As a **Buyer**, if I have a listing open and another buyer purchases or rents it, I want to see a banner immediately saying "This item is no longer available" so I don't waste time.
- As an **Infrastructure Engineer**, I want the WebSocket servers to automatically scale out during traffic spikes so we don't drop connections.

## 7. Functional Requirements
- **FR-RTP-01 (Connection Management)**: Handle WebSocket handshakes, authentication (via JWT), and ping/pong heartbeats to prune dead connections.
- **FR-RTP-02 (Channel Multiplexing)**: Allow a single WebSocket connection to subscribe to multiple channels (e.g., `user:<id>`, `tenant:<id>`, `listing:<id>`).
- **FR-RTP-03 (Pub/Sub Backplane)**: Utilize Redis Pub/Sub so that any backend microservice can publish an event that reaches the correct WebSocket gateway node holding the client connection.
- **FR-RTP-04 (Presence)**: Track online/offline status of users (V2).
- **FR-RTP-05 (Reconnection History)**: Buffer events for disconnected clients for a short window (e.g., 60 seconds) so they receive missed events upon rapid reconnection.

## 8. Non-Functional Requirements
- **Scalability**: WebSockets are stateful; the architecture must support horizontal scaling with a centralized Redis backplane.
- **Security**: Prevent unauthorized subscription to channels (e.g., User A cannot subscribe to `tenant:<User B's Tenant>`).

## 9. User Workflows
- **Connection Flow**: Client authenticates → Requests WS connection with JWT → Gateway validates token → Upgrades to WebSocket → Client sends `SUBSCRIBE tenant:123` message → Gateway authorizes subscription → Gateway binds client to Redis topic.
- **Message Delivery Flow**: Notification Service publishes payload to Redis `tenant:123` → Redis broadcasts to all Gateway Nodes → Node containing the active connection pushes payload down the socket → Client receives and updates UI.

## 10. State Machines
- **Connection State**: `CONNECTING` → `CONNECTED` → `DISCONNECTED` → `RECONNECTING`.

## 11. Business Rules
- Connections lacking a valid JWT or an expired JWT are forcefully disconnected.
- A user can only subscribe to channels related to their own User ID or their active Tenant ID.
- Global announcements (`platform:broadcast`) are pushed to all active connections regardless of subscriptions.

## 12. Permissions
- Handled at the channel level. The Gateway inspects the JWT claims to determine if a `SUBSCRIBE` command is valid.

## 13. Events Generated
- `realtime.client_connected`
- `realtime.client_disconnected`

## 14. Events Consumed
- The Realtime Platform acts as a dumb pipe; it consumes almost any event published to its Redis backplane and forwards it to subscribed clients.

## 15. Analytics Requirements
- Track Peak Concurrent Connections.
- Measure Connection Drop Rate (unexpected disconnects vs. clean closes).
- Track average connection duration.

## 16. KPIs
- Concurrent Connections.
- P99 Delivery Latency.

## 17. Success Metrics
- 0 incidents of "split brain" where a client misses a critical notification due to being connected to the wrong gateway node.
- Backend load from HTTP polling is reduced to 0.

## 18. Edge Cases
- **Thundering Herd**: If a WebSocket node crashes, 10,000 clients will simultaneously attempt to reconnect. Implement client-side exponential backoff and randomized jitter to prevent crushing the remaining nodes.

## 19. Failure Scenarios
- **WebSocket Gateway Outage**: If WebSockets completely fail, the frontend must fall back gracefully to standard HTTP requests and long-polling for critical paths (like the CRM inbox).

## 20. Compliance Requirements
- Data transmitted over WebSockets must be encrypted via TLS (WSS).

## 21. Realtime Requirements
- This entire domain is the definition of the platform's real-time capabilities.

## 22. AI Requirements
- N/A.

## 23. MVP Scope
- Secure WSS connection establishment.
- Redis Pub/Sub integration.
- Standard routing to `user:<id>` channels.

## 24. V1 Scope
- Channel multiplexing (`tenant:<id>`, `listing:<id>`).
- Auto-reconnect with Jitter on the frontend client.

## 25. V2 Scope
- Presence tracking (Online/Offline/Typing indicators).
- Short-term event buffering for rapid reconnections.

## 26. Future Enhancements
- WebRTC integration for direct peer-to-peer audio/video calling.

## 27. Acceptance Criteria
- [ ] A client can successfully connect to the WebSocket endpoint using a valid JWT.
- [ ] Attempting to connect without a token or with an invalid token drops the connection.
- [ ] When a backend service publishes a message to a user's channel via Redis, the client receives it in < 200ms.
- [ ] Attempting to subscribe to an unauthorized channel (e.g., another user's channel) results in an error and the subscription is denied.
