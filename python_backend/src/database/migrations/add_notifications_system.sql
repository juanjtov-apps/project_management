-- Migration: Add comprehensive notifications system to client_portal schema
-- This is an additive migration - does not modify existing tables
-- Note: Using pm_notifications table name to avoid conflict with existing notifications table

BEGIN;

-- Create pm_notifications table (PM = Project Manager notifications)
CREATE TABLE IF NOT EXISTS client_portal.pm_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id VARCHAR NOT NULL REFERENCES public.projects(id) ON DELETE RESTRICT,
    recipient_user_id VARCHAR NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    type TEXT NOT NULL CHECK (type IN ('issue_created', 'message_posted')),
    source_kind TEXT NOT NULL CHECK (source_kind IN ('issue', 'message')),
    source_id UUID NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pm_notifications_recipient_read_created 
    ON client_portal.pm_notifications(recipient_user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pm_notifications_project_created 
    ON client_portal.pm_notifications(project_id, created_at DESC);

-- Create pm_notification_prefs table for per-user preferences
CREATE TABLE IF NOT EXISTS client_portal.pm_notification_prefs (
    recipient_user_id VARCHAR PRIMARY KEY REFERENCES public.users(id) ON DELETE RESTRICT,
    email_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    push_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    realtime_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
