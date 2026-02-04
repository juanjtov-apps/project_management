-- Migration: Add resolution tracking fields to issues table
-- This migration adds resolved_by and resolved_at columns to track who closed an issue

BEGIN;

-- Add resolved_by column (FK to users)
ALTER TABLE client_portal.issues
    ADD COLUMN IF NOT EXISTS resolved_by VARCHAR
    REFERENCES public.users(id) ON DELETE SET NULL;

-- Add resolved_at timestamp column
ALTER TABLE client_portal.issues
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- Create index for efficient queries on resolved issues
CREATE INDEX IF NOT EXISTS idx_issues_resolved_by
    ON client_portal.issues(resolved_by) WHERE resolved_by IS NOT NULL;

COMMIT;
