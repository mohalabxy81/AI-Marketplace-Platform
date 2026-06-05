-- Fix function_search_path_mutable
CREATE OR REPLACE FUNCTION agents.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION agents.audit_agent_registry()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
    INSERT INTO public.audit_logs (
        action,
        entity_type,
        entity_id,
        metadata,
        created_at
    ) VALUES (
        TG_OP,
        'agents.agent_registry',
        COALESCE(NEW.id, OLD.id),
        jsonb_build_object('old', CASE WHEN TG_OP != 'INSERT' THEN to_jsonb(OLD) ELSE NULL END, 'new', CASE WHEN TG_OP != 'DELETE' THEN to_jsonb(NEW) ELSE NULL END),
        NOW()
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION agents.get_agent(p_company_id UUID, p_slug TEXT)
RETURNS agents.agent_registry
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT *
    FROM agents.agent_registry
    WHERE
        (company_id = p_company_id OR company_id IS NULL)
        AND slug = p_slug
        AND status = 'active'
        AND deleted_at IS NULL
    ORDER BY company_id NULLS LAST
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION agents.list_active_agents(p_company_id UUID)
RETURNS SETOF agents.agent_registry
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
    SELECT *
    FROM agents.agent_registry
    WHERE
        (company_id = p_company_id OR company_id IS NULL)
        AND status = 'active'
        AND deleted_at IS NULL
    ORDER BY type, name;
$$;

-- Fix unindexed_foreign_keys in agents schema
CREATE INDEX IF NOT EXISTS idx_agent_context_session_id ON agents.agent_context(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_event_handlers_subscription_id ON agents.agent_event_handlers(subscription_id);
CREATE INDEX IF NOT EXISTS idx_agent_events_company_id ON agents.agent_events(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_failures_agent_id ON agents.agent_failures(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_failures_task_id ON agents.agent_failures(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_identities_role_id ON agents.agent_identities(role_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_agent_id ON agents.agent_knowledge(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_knowledge_company_id ON agents.agent_knowledge(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_session_id ON agents.agent_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_task_id ON agents.agent_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_registry_owner_id ON agents.agent_registry(owner_id);
CREATE INDEX IF NOT EXISTS idx_agent_schedules_agent_id ON agents.agent_schedules(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_agent_id ON agents.agent_sessions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_company_id ON agents.agent_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_agent_sessions_user_id ON agents.agent_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_agent_id ON agents.agent_tasks(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_tasks_session_id ON agents.agent_tasks(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_workflows_agent_id ON agents.agent_workflows(agent_id);
CREATE INDEX IF NOT EXISTS idx_goal_engine_session_id ON agents.goal_engine(session_id);
CREATE INDEX IF NOT EXISTS idx_orchestrator_sessions_company_id ON agents.orchestrator_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_orchestrator_sessions_created_by ON agents.orchestrator_sessions(created_by);
CREATE INDEX IF NOT EXISTS idx_policy_engine_company_id ON agents.policy_engine(company_id);
CREATE INDEX IF NOT EXISTS idx_task_planner_agent_id ON agents.task_planner(agent_id);
CREATE INDEX IF NOT EXISTS idx_task_planner_assigned_task ON agents.task_planner(assigned_task);
CREATE INDEX IF NOT EXISTS idx_task_planner_parent_task_id ON agents.task_planner(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_planner_session_id ON agents.task_planner(session_id);
