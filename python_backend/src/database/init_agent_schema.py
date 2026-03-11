"""
Agent AI Database Schema Initialization
Safe, additive migration that creates agent schema and tables for the Agentic AI Engine.
"""

import asyncpg
from .connection import get_db_pool


async def init_agent_schema():
    """Initialize agent schema with all required tables."""
    pool = await get_db_pool()

    # SQL to create schema and tables
    init_sql = """
    -- Start transaction
    BEGIN;

    -- Create schema if it doesn't exist
    CREATE SCHEMA IF NOT EXISTS agent;

    -- Migration tracking table
    CREATE TABLE IF NOT EXISTS agent.alembic_version(
        version_num text PRIMARY KEY
    );

    -- CONVERSATIONS TABLE
    -- Tracks conversation sessions between users and the AI agent
    CREATE TABLE IF NOT EXISTS agent.conversations(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        company_id varchar NOT NULL,
        project_id varchar,
        title text,
        status text NOT NULL DEFAULT 'active',
        metadata jsonb DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_conversation_status CHECK (status IN ('active', 'archived')),
        CONSTRAINT fk_conversation_user FOREIGN KEY(user_id)
            REFERENCES public.users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_conversation_company FOREIGN KEY(company_id)
            REFERENCES public.companies(id) ON DELETE RESTRICT,
        CONSTRAINT fk_conversation_project FOREIGN KEY(project_id)
            REFERENCES public.projects(id) ON DELETE SET NULL
    );

    -- MESSAGES TABLE
    -- Individual messages in a conversation (user, assistant, system)
    CREATE TABLE IF NOT EXISTS agent.messages(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id uuid NOT NULL,
        role text NOT NULL,
        content text NOT NULL,
        tool_calls jsonb,
        tool_results jsonb,
        model_used text,
        token_count integer,
        latency_ms integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_message_role CHECK (role IN ('user', 'assistant', 'system')),
        CONSTRAINT fk_message_conversation FOREIGN KEY(conversation_id)
            REFERENCES agent.conversations(id) ON DELETE CASCADE
    );

    -- TOOL CALLS TABLE
    -- Audit log of every tool invocation by the AI agent
    CREATE TABLE IF NOT EXISTS agent.tool_calls(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id uuid NOT NULL,
        conversation_id uuid NOT NULL,
        user_id varchar NOT NULL,
        project_id varchar,
        tool_name text NOT NULL,
        tool_input jsonb NOT NULL,
        tool_output jsonb,
        safety_level text NOT NULL,
        execution_status text NOT NULL,
        confirmation_required boolean DEFAULT false,
        confirmed_by varchar,
        confirmed_at timestamptz,
        error_message text,
        execution_time_ms integer,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_tool_safety_level CHECK (safety_level IN (
            'read_only', 'audit_logged', 'requires_review',
            'requires_confirmation', 'prohibited'
        )),
        CONSTRAINT chk_tool_exec_status CHECK (execution_status IN (
            'pending', 'executing', 'success', 'failed',
            'cancelled', 'confirmed', 'rejected'
        )),
        CONSTRAINT fk_tool_message FOREIGN KEY(message_id)
            REFERENCES agent.messages(id) ON DELETE CASCADE,
        CONSTRAINT fk_tool_conversation FOREIGN KEY(conversation_id)
            REFERENCES agent.conversations(id) ON DELETE CASCADE,
        CONSTRAINT fk_tool_user FOREIGN KEY(user_id)
            REFERENCES public.users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_tool_project FOREIGN KEY(project_id)
            REFERENCES public.projects(id) ON DELETE SET NULL,
        CONSTRAINT fk_tool_confirmed_by FOREIGN KEY(confirmed_by)
            REFERENCES public.users(id) ON DELETE SET NULL
    );

    -- PENDING CONFIRMATIONS TABLE
    -- Operations awaiting user confirmation before execution
    CREATE TABLE IF NOT EXISTS agent.pending_confirmations(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tool_call_id uuid NOT NULL,
        conversation_id uuid NOT NULL,
        user_id varchar NOT NULL,
        tool_name text NOT NULL,
        operation_summary text NOT NULL,
        impact_assessment text,
        expires_at timestamptz NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_confirmation_status CHECK (status IN (
            'pending', 'confirmed', 'rejected', 'expired'
        )),
        CONSTRAINT fk_confirmation_tool_call FOREIGN KEY(tool_call_id)
            REFERENCES agent.tool_calls(id) ON DELETE CASCADE,
        CONSTRAINT fk_confirmation_conversation FOREIGN KEY(conversation_id)
            REFERENCES agent.conversations(id) ON DELETE CASCADE,
        CONSTRAINT fk_confirmation_user FOREIGN KEY(user_id)
            REFERENCES public.users(id) ON DELETE RESTRICT
    );

    -- FEEDBACK TABLE
    -- User feedback on agent responses for learning and improvement
    CREATE TABLE IF NOT EXISTS agent.feedback(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id uuid NOT NULL,
        conversation_id uuid NOT NULL,
        user_id varchar NOT NULL,
        company_id varchar NOT NULL,
        is_positive boolean NOT NULL,
        notes text,
        user_query text NOT NULL,
        assistant_response text NOT NULL,
        tool_calls_used jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_feedback_message FOREIGN KEY(message_id)
            REFERENCES agent.messages(id) ON DELETE CASCADE,
        CONSTRAINT fk_feedback_conversation FOREIGN KEY(conversation_id)
            REFERENCES agent.conversations(id) ON DELETE CASCADE,
        CONSTRAINT fk_feedback_user FOREIGN KEY(user_id)
            REFERENCES public.users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_feedback_company FOREIGN KEY(company_id)
            REFERENCES public.companies(id) ON DELETE RESTRICT
    );

    -- METRICS TABLE
    -- Success tracking and analytics (visible to ROOT users only)
    CREATE TABLE IF NOT EXISTS agent.metrics(
        id bigserial PRIMARY KEY,
        company_id varchar NOT NULL,
        user_id varchar,
        metric_type text NOT NULL,
        metric_value numeric NOT NULL,
        metric_date date NOT NULL DEFAULT CURRENT_DATE,
        dimension_1 text,
        dimension_2 text,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_metrics_company FOREIGN KEY(company_id)
            REFERENCES public.companies(id) ON DELETE RESTRICT,
        CONSTRAINT fk_metrics_user FOREIGN KEY(user_id)
            REFERENCES public.users(id) ON DELETE SET NULL
    );

    -- SCHEDULED JOBS TABLE
    -- For proactive behaviors (Phase 4)
    CREATE TABLE IF NOT EXISTS agent.scheduled_jobs(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        company_id varchar NOT NULL,
        job_type text NOT NULL,
        schedule_cron text NOT NULL,
        config jsonb DEFAULT '{}',
        last_run_at timestamptz,
        next_run_at timestamptz,
        status text NOT NULL DEFAULT 'active',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT chk_job_status CHECK (status IN ('active', 'paused', 'disabled')),
        CONSTRAINT fk_job_company FOREIGN KEY(company_id)
            REFERENCES public.companies(id) ON DELETE RESTRICT
    );

    -- METRIC EVENTS TABLE
    -- Detailed JSONB event store for observability dashboard
    CREATE TABLE IF NOT EXISTS agent.metric_events(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type text NOT NULL,
        user_id varchar,
        company_id varchar,
        conversation_id uuid,
        event_data jsonb NOT NULL DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now()
    );

    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_conversations_user ON agent.conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_company ON agent.conversations(company_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_project ON agent.conversations(project_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_status ON agent.conversations(status);
    CREATE INDEX IF NOT EXISTS idx_messages_conversation ON agent.messages(conversation_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_tool_calls_conversation ON agent.tool_calls(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_tool_calls_message ON agent.tool_calls(message_id);
    CREATE INDEX IF NOT EXISTS idx_tool_calls_user ON agent.tool_calls(user_id);
    CREATE INDEX IF NOT EXISTS idx_tool_calls_tool_name ON agent.tool_calls(tool_name);
    CREATE INDEX IF NOT EXISTS idx_tool_calls_status ON agent.tool_calls(execution_status);
    CREATE INDEX IF NOT EXISTS idx_pending_confirmations_user ON agent.pending_confirmations(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_pending_confirmations_conversation ON agent.pending_confirmations(conversation_id);
    CREATE INDEX IF NOT EXISTS idx_metrics_company_date ON agent.metrics(company_id, metric_date);
    CREATE INDEX IF NOT EXISTS idx_metrics_type ON agent.metrics(metric_type, metric_date);
    CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_company ON agent.scheduled_jobs(company_id);
    CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_next_run ON agent.scheduled_jobs(next_run_at)
        WHERE status = 'active';
    CREATE INDEX IF NOT EXISTS idx_feedback_company ON agent.feedback(company_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_message ON agent.feedback(message_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_positive ON agent.feedback(company_id, is_positive);
    CREATE INDEX IF NOT EXISTS idx_feedback_user ON agent.feedback(user_id);

    CREATE INDEX IF NOT EXISTS idx_metric_events_type ON agent.metric_events(event_type, created_at);
    CREATE INDEX IF NOT EXISTS idx_metric_events_created ON agent.metric_events(created_at);
    CREATE INDEX IF NOT EXISTS idx_metric_events_company ON agent.metric_events(company_id);
    CREATE INDEX IF NOT EXISTS idx_metric_events_conversation ON agent.metric_events(conversation_id);

    -- Partial index for efficient failed tool call queries (troubleshooting page)
    CREATE INDEX IF NOT EXISTS idx_tool_calls_failed
        ON agent.tool_calls(created_at DESC) WHERE execution_status = 'failed';

    -- Commit transaction
    COMMIT;
    """

    try:
        async with pool.acquire() as conn:
            await conn.execute(init_sql)
            print("✅ Agent schema initialized successfully")
            return True
    except Exception as e:
        print(f"❌ Error initializing agent schema: {e}")
        raise


async def drop_agent_schema():
    """Drop agent schema and all tables (use with caution!)."""
    pool = await get_db_pool()

    drop_sql = """
    DROP SCHEMA IF EXISTS agent CASCADE;
    """

    try:
        async with pool.acquire() as conn:
            await conn.execute(drop_sql)
            print("✅ Agent schema dropped successfully")
            return True
    except Exception as e:
        print(f"❌ Error dropping agent schema: {e}")
        raise
