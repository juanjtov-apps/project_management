-- Migration: Add new notification types and source kinds
-- Adds support for: material_added, receipt_uploaded notification types
-- Adds support for: material, receipt source kinds

BEGIN;

-- Update type constraint to include new notification types
ALTER TABLE client_portal.pm_notifications
    DROP CONSTRAINT IF EXISTS pm_notifications_type_check;

ALTER TABLE client_portal.pm_notifications
    ADD CONSTRAINT pm_notifications_type_check
    CHECK (type IN ('issue_created', 'message_posted', 'material_added', 'receipt_uploaded'));

-- Update source_kind constraint to include new source kinds
ALTER TABLE client_portal.pm_notifications
    DROP CONSTRAINT IF EXISTS pm_notifications_source_kind_check;

ALTER TABLE client_portal.pm_notifications
    ADD CONSTRAINT pm_notifications_source_kind_check
    CHECK (source_kind IN ('issue', 'message', 'material', 'receipt'));

COMMIT;
