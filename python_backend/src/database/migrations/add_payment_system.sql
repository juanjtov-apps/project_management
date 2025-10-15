-- Migration: Add comprehensive payment system to client_portal schema
-- This is an additive migration - does not modify existing tables

BEGIN;

-- Create payment_schedules table
CREATE TABLE IF NOT EXISTS client_portal.payment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    notes TEXT,
    created_by VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    updated_by VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_schedules_project 
    ON client_portal.payment_schedules(project_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_schedules_unique_title 
    ON client_portal.payment_schedules(project_id, LOWER(title));

-- Create payment_installments table
CREATE TABLE IF NOT EXISTS client_portal.payment_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
    schedule_id UUID NOT NULL REFERENCES client_portal.payment_schedules(id) ON DELETE RESTRICT,
    name TEXT NOT NULL,
    description TEXT,
    amount NUMERIC NOT NULL CHECK (amount >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    due_date DATE,
    status TEXT NOT NULL CHECK (status IN ('planned', 'payable', 'paid')),
    next_milestone BOOLEAN NOT NULL DEFAULT FALSE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_by VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    updated_by VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_installments_project 
    ON client_portal.payment_installments(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_schedule 
    ON client_portal.payment_installments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_payment_installments_status 
    ON client_portal.payment_installments(status);
CREATE INDEX IF NOT EXISTS idx_payment_installments_due_date 
    ON client_portal.payment_installments(due_date);
CREATE INDEX IF NOT EXISTS idx_payment_installments_display_order 
    ON client_portal.payment_installments(display_order);

-- Unique constraint: at most one next_milestone per project where status is not 'paid'
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_installments_next_milestone 
    ON client_portal.payment_installments(project_id, next_milestone) 
    WHERE next_milestone = TRUE AND status != 'paid';

-- Create payment_documents table
CREATE TABLE IF NOT EXISTS client_portal.payment_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
    schedule_id UUID REFERENCES client_portal.payment_schedules(id) ON DELETE RESTRICT,
    title TEXT NOT NULL,
    file_id UUID NOT NULL,
    uploaded_by VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_documents_project 
    ON client_portal.payment_documents(project_id, created_at);

-- Create payment_receipts table
CREATE TABLE IF NOT EXISTS client_portal.payment_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
    installment_id UUID NOT NULL REFERENCES client_portal.payment_installments(id) ON DELETE RESTRICT,
    receipt_type TEXT NOT NULL,
    reference_no TEXT,
    payment_date DATE,
    file_id UUID NOT NULL,
    uploaded_by VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_receipts_project 
    ON client_portal.payment_receipts(project_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_installment 
    ON client_portal.payment_receipts(installment_id);

-- Create invoices table
CREATE TABLE IF NOT EXISTS client_portal.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
    installment_id UUID NOT NULL REFERENCES client_portal.payment_installments(id) ON DELETE RESTRICT,
    invoice_no TEXT NOT NULL,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    subtotal NUMERIC NOT NULL CHECK (subtotal >= 0),
    tax NUMERIC DEFAULT 0 CHECK (tax >= 0),
    total NUMERIC NOT NULL CHECK (total >= 0),
    currency TEXT NOT NULL DEFAULT 'USD',
    pdf_file_id UUID NOT NULL,
    created_by VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(project_id, invoice_no)
);

CREATE INDEX IF NOT EXISTS idx_invoices_project 
    ON client_portal.invoices(project_id, created_at);
CREATE INDEX IF NOT EXISTS idx_invoices_installment 
    ON client_portal.invoices(installment_id);

-- Create payment_events table for audit trail
CREATE TABLE IF NOT EXISTS client_portal.payment_events (
    id BIGSERIAL PRIMARY KEY,
    project_id VARCHAR NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
    actor_id VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    action TEXT NOT NULL,
    diff JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_events_project 
    ON client_portal.payment_events(project_id, created_at);

COMMIT;
