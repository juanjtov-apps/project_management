"""
Subcontractor Module Database Schema Initialization
Safe, additive migration that creates all subcontractor management tables.
"""

import asyncpg
from .connection import get_db_pool


async def init_subcontractor_schema():
    """Initialize subcontractor module tables in public schema."""
    pool = await get_db_pool()

    init_sql = """
    BEGIN;

    -- =============================================
    -- SUBCONTRACTOR COMPANY PROFILE
    -- =============================================
    CREATE TABLE IF NOT EXISTS public.subcontractors(
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id varchar NOT NULL,
        name text NOT NULL,
        trade text,
        contact_email varchar,
        contact_phone varchar(20),
        address text,
        license_number varchar(100),
        license_expiry date,
        insurance_provider varchar(200),
        insurance_policy_number varchar(100),
        insurance_expiry date,
        overall_performance_score numeric(5,2) DEFAULT 0,
        status text NOT NULL DEFAULT 'active',
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_sub_company FOREIGN KEY(company_id)
            REFERENCES public.companies(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_subcontractors_company ON public.subcontractors(company_id);
    CREATE INDEX IF NOT EXISTS idx_subcontractors_trade ON public.subcontractors(trade);
    CREATE INDEX IF NOT EXISTS idx_subcontractors_status ON public.subcontractors(status);

    -- =============================================
    -- ADD subcontractor_id FK TO USERS TABLE
    -- =============================================
    ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subcontractor_id varchar;
    -- Note: FK constraint added via DO block to avoid errors on repeated runs
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_user_subcontractor'
            AND table_name = 'users'
        ) THEN
            ALTER TABLE public.users
                ADD CONSTRAINT fk_user_subcontractor
                FOREIGN KEY(subcontractor_id)
                REFERENCES public.subcontractors(id) ON DELETE SET NULL;
        END IF;
    END $$;

    CREATE INDEX IF NOT EXISTS idx_users_subcontractor_id ON public.users(subcontractor_id);

    -- =============================================
    -- EXTEND subcontractor_assignments TABLE
    -- =============================================
    ALTER TABLE public.subcontractor_assignments ADD COLUMN IF NOT EXISTS contract_value numeric;
    ALTER TABLE public.subcontractor_assignments ADD COLUMN IF NOT EXISTS assignment_role text DEFAULT 'primary';
    ALTER TABLE public.subcontractor_assignments ADD COLUMN IF NOT EXISTS notes text;
    ALTER TABLE public.subcontractor_assignments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
    ALTER TABLE public.subcontractor_assignments ADD COLUMN IF NOT EXISTS sub_company_id varchar;
    -- FK for sub_company_id to subcontractors
    DO $$
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'fk_assignment_sub_company'
            AND table_name = 'subcontractor_assignments'
        ) THEN
            ALTER TABLE public.subcontractor_assignments
                ADD CONSTRAINT fk_assignment_sub_company
                FOREIGN KEY(sub_company_id)
                REFERENCES public.subcontractors(id) ON DELETE SET NULL;
        END IF;
    END $$;

    -- =============================================
    -- CHECKLIST TEMPLATES (must be before sub_checklists)
    -- =============================================
    CREATE TABLE IF NOT EXISTS public.sub_checklist_templates(
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        company_id varchar NOT NULL,
        name text NOT NULL,
        trade_category text,
        items jsonb NOT NULL DEFAULT '[]'::jsonb,
        created_by varchar NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_template_company FOREIGN KEY(company_id)
            REFERENCES public.companies(id) ON DELETE CASCADE,
        CONSTRAINT fk_template_creator FOREIGN KEY(created_by)
            REFERENCES public.users(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_sub_templates_company ON public.sub_checklist_templates(company_id);
    CREATE INDEX IF NOT EXISTS idx_sub_templates_trade ON public.sub_checklist_templates(trade_category);

    -- =============================================
    -- SUB TASKS
    -- =============================================
    CREATE TABLE IF NOT EXISTS public.sub_tasks(
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        project_id varchar NOT NULL,
        assignment_id varchar,
        assigned_to varchar,
        assigned_user_id varchar,
        name text NOT NULL,
        description text,
        instructions text,
        priority text NOT NULL DEFAULT 'medium',
        location_tag text,
        start_date timestamptz,
        end_date timestamptz,
        estimated_hours numeric,
        actual_hours numeric,
        status text NOT NULL DEFAULT 'not_started',
        completed_at timestamptz,
        created_by varchar NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_subtask_project FOREIGN KEY(project_id)
            REFERENCES public.projects(id) ON DELETE CASCADE,
        CONSTRAINT fk_subtask_assignment FOREIGN KEY(assignment_id)
            REFERENCES public.subcontractor_assignments(id) ON DELETE SET NULL,
        CONSTRAINT fk_subtask_sub FOREIGN KEY(assigned_to)
            REFERENCES public.subcontractors(id) ON DELETE SET NULL,
        CONSTRAINT fk_subtask_user FOREIGN KEY(assigned_user_id)
            REFERENCES public.users(id) ON DELETE SET NULL,
        CONSTRAINT fk_subtask_creator FOREIGN KEY(created_by)
            REFERENCES public.users(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_subtasks_project ON public.sub_tasks(project_id);
    CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_to ON public.sub_tasks(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_subtasks_status ON public.sub_tasks(status);
    CREATE INDEX IF NOT EXISTS idx_subtasks_assignment ON public.sub_tasks(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_subtasks_assigned_user ON public.sub_tasks(assigned_user_id);

    -- =============================================
    -- SUB CHECKLISTS (containers)
    -- =============================================
    CREATE TABLE IF NOT EXISTS public.sub_checklists(
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        task_id varchar NOT NULL,
        name text NOT NULL,
        template_id varchar,
        sort_order integer DEFAULT 0,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_checklist_task FOREIGN KEY(task_id)
            REFERENCES public.sub_tasks(id) ON DELETE CASCADE,
        CONSTRAINT fk_checklist_template FOREIGN KEY(template_id)
            REFERENCES public.sub_checklist_templates(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sub_checklists_task ON public.sub_checklists(task_id);

    -- =============================================
    -- SUB CHECKLIST ITEMS
    -- =============================================
    CREATE TABLE IF NOT EXISTS public.sub_checklist_items(
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        checklist_id varchar NOT NULL,
        description text NOT NULL,
        item_type text NOT NULL DEFAULT 'standard',
        sort_order integer DEFAULT 0,
        is_completed boolean DEFAULT false,
        completed_by varchar,
        completed_at timestamptz,
        notes text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_item_checklist FOREIGN KEY(checklist_id)
            REFERENCES public.sub_checklists(id) ON DELETE CASCADE,
        CONSTRAINT fk_item_completed_by FOREIGN KEY(completed_by)
            REFERENCES public.users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_sub_checklist_items_checklist ON public.sub_checklist_items(checklist_id);
    CREATE INDEX IF NOT EXISTS idx_sub_checklist_items_completed ON public.sub_checklist_items(is_completed);

    -- =============================================
    -- SUB TASK DOCUMENTS
    -- =============================================
    CREATE TABLE IF NOT EXISTS public.sub_task_documents(
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        checklist_item_id varchar NOT NULL,
        task_id varchar NOT NULL,
        file_path text NOT NULL,
        file_name text NOT NULL,
        mime_type text,
        file_size integer,
        uploaded_by varchar NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_doc_item FOREIGN KEY(checklist_item_id)
            REFERENCES public.sub_checklist_items(id) ON DELETE CASCADE,
        CONSTRAINT fk_doc_task FOREIGN KEY(task_id)
            REFERENCES public.sub_tasks(id) ON DELETE CASCADE,
        CONSTRAINT fk_doc_uploader FOREIGN KEY(uploaded_by)
            REFERENCES public.users(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_sub_task_docs_item ON public.sub_task_documents(checklist_item_id);
    CREATE INDEX IF NOT EXISTS idx_sub_task_docs_task ON public.sub_task_documents(task_id);

    -- =============================================
    -- SUB TASK REVIEWS (PM approval records)
    -- =============================================
    CREATE TABLE IF NOT EXISTS public.sub_task_reviews(
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        task_id varchar NOT NULL,
        reviewer_id varchar NOT NULL,
        decision text NOT NULL,
        feedback text,
        rejection_reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_review_task FOREIGN KEY(task_id)
            REFERENCES public.sub_tasks(id) ON DELETE CASCADE,
        CONSTRAINT fk_review_reviewer FOREIGN KEY(reviewer_id)
            REFERENCES public.users(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_sub_reviews_task ON public.sub_task_reviews(task_id);
    CREATE INDEX IF NOT EXISTS idx_sub_reviews_reviewer ON public.sub_task_reviews(reviewer_id);

    -- =============================================
    -- SUB PERFORMANCE SCORES
    -- =============================================
    CREATE TABLE IF NOT EXISTS public.sub_performance_scores(
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        subcontractor_id varchar NOT NULL,
        project_id varchar NOT NULL,
        timeliness_score numeric(5,2) DEFAULT 0,
        quality_score numeric(5,2) DEFAULT 0,
        documentation_score numeric(5,2) DEFAULT 0,
        responsiveness_score numeric(5,2) DEFAULT 0,
        safety_score numeric(5,2) DEFAULT 100,
        composite_score numeric(5,2) DEFAULT 0,
        tasks_total integer DEFAULT 0,
        tasks_on_time integer DEFAULT 0,
        tasks_approved_first_pass integer DEFAULT 0,
        calculated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_perf_sub FOREIGN KEY(subcontractor_id)
            REFERENCES public.subcontractors(id) ON DELETE CASCADE,
        CONSTRAINT fk_perf_project FOREIGN KEY(project_id)
            REFERENCES public.projects(id) ON DELETE CASCADE,
        CONSTRAINT uq_perf_sub_project UNIQUE(subcontractor_id, project_id)
    );

    CREATE INDEX IF NOT EXISTS idx_sub_perf_sub ON public.sub_performance_scores(subcontractor_id);
    CREATE INDEX IF NOT EXISTS idx_sub_perf_project ON public.sub_performance_scores(project_id);

    -- =============================================
    -- SUB PAYMENT MILESTONES
    -- =============================================
    CREATE TABLE IF NOT EXISTS public.sub_payment_milestones(
        id varchar PRIMARY KEY DEFAULT gen_random_uuid()::text,
        assignment_id varchar NOT NULL,
        name text NOT NULL,
        description text,
        amount numeric NOT NULL,
        retention_pct numeric(5,2) DEFAULT 0,
        milestone_type text DEFAULT 'fixed',
        status text NOT NULL DEFAULT 'pending',
        linked_task_ids jsonb DEFAULT '[]'::jsonb,
        paid_at timestamptz,
        paid_amount numeric,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_milestone_assignment FOREIGN KEY(assignment_id)
            REFERENCES public.subcontractor_assignments(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sub_milestones_assignment ON public.sub_payment_milestones(assignment_id);
    CREATE INDEX IF NOT EXISTS idx_sub_milestones_status ON public.sub_payment_milestones(status);

    -- =============================================
    -- SUB INVITATIONS (in client_portal schema)
    -- =============================================
    CREATE TABLE IF NOT EXISTS client_portal.sub_invitations(
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id varchar NOT NULL,
        subcontractor_id varchar NOT NULL,
        project_id varchar,
        company_id varchar NOT NULL,
        invited_by varchar NOT NULL,
        welcome_note text,
        email_sent_at timestamptz,
        first_login_at timestamptz,
        has_completed_tour boolean DEFAULT false,
        status varchar(20) NOT NULL DEFAULT 'pending',
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT fk_sub_invite_user FOREIGN KEY(user_id)
            REFERENCES public.users(id) ON DELETE CASCADE,
        CONSTRAINT fk_sub_invite_sub FOREIGN KEY(subcontractor_id)
            REFERENCES public.subcontractors(id) ON DELETE CASCADE,
        CONSTRAINT fk_sub_invite_invited_by FOREIGN KEY(invited_by)
            REFERENCES public.users(id) ON DELETE RESTRICT
    );

    CREATE INDEX IF NOT EXISTS idx_sub_invite_user ON client_portal.sub_invitations(user_id);
    CREATE INDEX IF NOT EXISTS idx_sub_invite_status ON client_portal.sub_invitations(status);

    COMMIT;
    """

    try:
        async with pool.acquire() as conn:
            await conn.execute(init_sql)
            print("✅ Subcontractor module schema initialized successfully")
            return True
    except Exception as e:
        print(f"❌ Error initializing subcontractor module schema: {e}")
        raise
