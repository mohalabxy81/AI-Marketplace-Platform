# Database Changes Report

## Migration Summary
To establish the Agent Platform without disrupting existing application features, a completely new schema (`agents`) was introduced. A total of 9 sequential migrations were applied.

## Executed Migrations

1. **`20260605000010_phase_at_p2_agent_registry.sql`**
   - Created `agents.agent_registry` table.
   - Configured standard RLS policies and cross-schema audit triggers to `public.audit_logs`.

2. **`20260605000020_phase_at_p3_agent_identities.sql`**
   - Created `agent_roles`, `agent_scopes`, and `agent_identities`.
   - Defined capability mappings for agents.

3. **`20260605000030_phase_at_p4_agent_memory.sql`**
   - Implemented `agent_sessions`, `agent_context`, and `agent_knowledge`.
   - Leveraged `pgvector` for semantic knowledge embedding storage.

4. **`20260605000040_phase_at_p5_agent_event_bus.sql`**
   - Built the asynchronous messaging backbone: `agent_events`, `agent_event_subscriptions`, `agent_event_handlers`.

5. **`20260605000050_phase_at_p6_agent_runtime.sql`**
   - Introduced execution tables: `agent_tasks`, `agent_workflows`, and `agent_schedules`.

6. **`20260605000060_phase_at_p7_agent_observability.sql`**
   - Added `agent_logs`, `agent_metrics`, `agent_traces`, and `agent_failures` for deep monitoring.

7. **`20260605000070_phase_at_p8_first_gen_agents.sql`**
   - Seeded the core platform agents: Content Moderation, Fraud Detection, Recommendation, User Support, and Trust & Safety.

8. **`20260605000080_phase_at_p9_orchestration.sql`**
   - Built higher-order control planes: `orchestrator_sessions`, `task_planner`, `goal_engine`, `policy_engine`.

9. **`20260605000090_phase_at_p10_advisors_fixes.sql`**
   - Applied performance (indexing) and security (`search_path`) hardening.

## Structural Paradigms
- **Audit Compliance**: Every table modification triggers a cross-schema event logging to `public.audit_logs`.
- **Soft Deletes**: `deleted_at` fields are utilized across all critical records to ensure recoverability.
