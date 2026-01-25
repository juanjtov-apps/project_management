-- Migration: Add issue audit log table for tracking edits and deletes
-- This table stores a complete history of changes to issues

BEGIN;

-- Create issue audit log table
CREATE TABLE IF NOT EXISTS client_portal.issue_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    issue_id UUID NOT NULL,
    project_id VARCHAR NOT NULL,
    action VARCHAR NOT NULL CHECK (action IN ('created', 'edited', 'deleted')),
    actor_id VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    changes JSONB,  -- Stores old and new values for edits
    issue_snapshot JSONB,  -- Full issue data at time of action (useful for deletes)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_issue_audit_log_issue_id
    ON client_portal.issue_audit_log(issue_id);
CREATE INDEX IF NOT EXISTS idx_issue_audit_log_project_id
    ON client_portal.issue_audit_log(project_id);
CREATE INDEX IF NOT EXISTS idx_issue_audit_log_actor_id
    ON client_portal.issue_audit_log(actor_id);
CREATE INDEX IF NOT EXISTS idx_issue_audit_log_created_at
    ON client_portal.issue_audit_log(created_at DESC);

COMMIT;
