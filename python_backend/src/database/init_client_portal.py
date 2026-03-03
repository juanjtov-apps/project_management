"""
Client Portal Database Schema Initialization
Safe, additive migration that creates client_portal schema and tables.
"""

import asyncpg
from .connection import get_db_pool

async def init_client_portal_schema():
    """Initialize client_portal schema with all required tables."""
    pool = await get_db_pool()
    
    # SQL to create schema and tables
    init_sql = """
    -- Start transaction
    BEGIN;
    
    -- Create schema if it doesn't exist
    CREATE SCHEMA IF NOT EXISTS client_portal;
    
    -- Migration tracking table
    CREATE TABLE IF NOT EXISTS client_portal.alembic_version(
        version_num text PRIMARY KEY
    );
    
    -- ISSUES TABLE
    CREATE TABLE IF NOT EXISTS client_portal.issues(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id varchar NOT NULL,
        created_by varchar NOT NULL,
        assigned_to varchar,
        title text NOT NULL,
        description text,
        category text,
        priority text,
        status text NOT NULL DEFAULT 'open',
        due_date date,
        visibility text NOT NULL DEFAULT 'client',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_issue_project FOREIGN KEY(project_id) 
            REFERENCES public.projects(id) ON DELETE RESTRICT,
        CONSTRAINT fk_issue_creator FOREIGN KEY(created_by) 
            REFERENCES public.users(id) ON DELETE RESTRICT,
        CONSTRAINT fk_issue_assignee FOREIGN KEY(assigned_to) 
            REFERENCES public.users(id) ON DELETE SET NULL
    );
    
    -- ISSUE COMMENTS TABLE
    CREATE TABLE IF NOT EXISTS client_portal.issue_comments(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        issue_id uuid NOT NULL,
        author_id varchar NOT NULL,
        body text NOT NULL,
        created_at timestamptz DEFAULT now(),
        CONSTRAINT fk_comment_issue FOREIGN KEY(issue_id) 
            REFERENCES client_portal.issues(id) ON DELETE CASCADE,
        CONSTRAINT fk_comment_author FOREIGN KEY(author_id) 
            REFERENCES public.users(id) ON DELETE RESTRICT
    );
    
    -- ISSUE ATTACHMENTS TABLE
    CREATE TABLE IF NOT EXISTS client_portal.issue_attachments(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        issue_id uuid NOT NULL,
        url text NOT NULL,
        mime text,
        uploaded_by varchar NOT NULL,
        created_at timestamptz DEFAULT now(),
        CONSTRAINT fk_attach_issue FOREIGN KEY(issue_id) 
            REFERENCES client_portal.issues(id) ON DELETE CASCADE,
        CONSTRAINT fk_attach_user FOREIGN KEY(uploaded_by) 
            REFERENCES public.users(id) ON DELETE RESTRICT
    );
    
    -- FORUM THREADS TABLE
    CREATE TABLE IF NOT EXISTS client_portal.forum_threads(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id varchar NOT NULL,
        title text NOT NULL,
        created_by varchar NOT NULL,
        pinned boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        CONSTRAINT fk_thread_project FOREIGN KEY(project_id) 
            REFERENCES public.projects(id) ON DELETE RESTRICT,
        CONSTRAINT fk_thread_creator FOREIGN KEY(created_by) 
            REFERENCES public.users(id) ON DELETE RESTRICT
    );
    
    -- FORUM MESSAGES TABLE
    CREATE TABLE IF NOT EXISTS client_portal.forum_messages(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id uuid NOT NULL,
        parent_message_id uuid,
        author_id varchar NOT NULL,
        body text NOT NULL,
        created_at timestamptz DEFAULT now(),
        CONSTRAINT fk_message_thread FOREIGN KEY(thread_id) 
            REFERENCES client_portal.forum_threads(id) ON DELETE CASCADE,
        CONSTRAINT fk_message_parent FOREIGN KEY(parent_message_id) 
            REFERENCES client_portal.forum_messages(id) ON DELETE SET NULL,
        CONSTRAINT fk_message_author FOREIGN KEY(author_id) 
            REFERENCES public.users(id) ON DELETE RESTRICT
    );
    
    -- FORUM MESSAGE ATTACHMENTS TABLE
    CREATE TABLE IF NOT EXISTS client_portal.forum_attachments(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id uuid NOT NULL,
        url text NOT NULL,
        mime text,
        uploaded_by varchar NOT NULL,
        created_at timestamptz DEFAULT now(),
        CONSTRAINT fk_forum_attach_message FOREIGN KEY(message_id) 
            REFERENCES client_portal.forum_messages(id) ON DELETE CASCADE,
        CONSTRAINT fk_forum_attach_user FOREIGN KEY(uploaded_by) 
            REFERENCES public.users(id) ON DELETE RESTRICT
    );
    
    -- MATERIALS TABLE
    CREATE TABLE IF NOT EXISTS client_portal.materials(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id varchar NOT NULL,
        added_by varchar NOT NULL,
        name text NOT NULL,
        spec text,
        link text,
        vendor text,
        unit text,
        qty numeric,
        unit_price numeric,
        needed_by date,
        status text DEFAULT 'pending',
        created_at timestamptz DEFAULT now(),
        CONSTRAINT fk_material_project FOREIGN KEY(project_id) 
            REFERENCES public.projects(id) ON DELETE RESTRICT,
        CONSTRAINT fk_material_user FOREIGN KEY(added_by) 
            REFERENCES public.users(id) ON DELETE RESTRICT
    );
    
    -- INSTALLMENTS TABLE
    CREATE TABLE IF NOT EXISTS client_portal.installments(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id varchar NOT NULL,
        label text NOT NULL,
        due_date date NOT NULL,
        amount numeric NOT NULL,
        status text DEFAULT 'scheduled',
        method text,
        reference text,
        created_at timestamptz DEFAULT now(),
        CONSTRAINT fk_installment_project FOREIGN KEY(project_id) 
            REFERENCES public.projects(id) ON DELETE RESTRICT
    );
    
    -- INSTALLMENT FILES TABLE
    CREATE TABLE IF NOT EXISTS client_portal.installment_files(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        installment_id uuid NOT NULL,
        url text NOT NULL,
        kind text,
        uploaded_by varchar NOT NULL,
        created_at timestamptz DEFAULT now(),
        CONSTRAINT fk_install_file FOREIGN KEY(installment_id) 
            REFERENCES client_portal.installments(id) ON DELETE CASCADE,
        CONSTRAINT fk_install_user FOREIGN KEY(uploaded_by) 
            REFERENCES public.users(id) ON DELETE RESTRICT
    );
    
    -- NOTIFICATION SETTINGS TABLE
    CREATE TABLE IF NOT EXISTS client_portal.notification_settings(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id varchar NOT NULL,
        user_id varchar NOT NULL,
        channel text NOT NULL,
        event text NOT NULL,
        cadence text NOT NULL,
        CONSTRAINT unique_setting UNIQUE(project_id, user_id, event, channel),
        CONSTRAINT fk_notif_set_project FOREIGN KEY(project_id) 
            REFERENCES public.projects(id) ON DELETE RESTRICT,
        CONSTRAINT fk_notif_set_user FOREIGN KEY(user_id) 
            REFERENCES public.users(id) ON DELETE RESTRICT
    );
    
    -- NOTIFICATIONS TABLE
    CREATE TABLE IF NOT EXISTS client_portal.notifications(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        project_id varchar NOT NULL,
        user_id varchar NOT NULL,
        event text NOT NULL,
        payload jsonb DEFAULT '{}'::jsonb,
        read boolean DEFAULT false,
        created_at timestamptz DEFAULT now(),
        CONSTRAINT fk_notif_project FOREIGN KEY(project_id) 
            REFERENCES public.projects(id) ON DELETE RESTRICT,
        CONSTRAINT fk_notif_user FOREIGN KEY(user_id) 
            REFERENCES public.users(id) ON DELETE RESTRICT
    );
    
    -- Create indexes for better performance
    CREATE INDEX IF NOT EXISTS idx_issues_project ON client_portal.issues(project_id);
    CREATE INDEX IF NOT EXISTS idx_issues_status ON client_portal.issues(status);
    CREATE INDEX IF NOT EXISTS idx_issue_comments_issue ON client_portal.issue_comments(issue_id);
    CREATE INDEX IF NOT EXISTS idx_forum_threads_project ON client_portal.forum_threads(project_id);
    CREATE INDEX IF NOT EXISTS idx_forum_messages_thread ON client_portal.forum_messages(thread_id);
    CREATE INDEX IF NOT EXISTS idx_materials_project ON client_portal.materials(project_id);
    CREATE INDEX IF NOT EXISTS idx_installments_project ON client_portal.installments(project_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON client_portal.notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON client_portal.notifications(read);
    
    -- Commit transaction
    COMMIT;
    """
    
    try:
        async with pool.acquire() as conn:
            await conn.execute(init_sql)
            print("✅ Client Portal schema initialized successfully")
            return True
    except Exception as e:
        print(f"❌ Error initializing client portal schema: {e}")
        raise
