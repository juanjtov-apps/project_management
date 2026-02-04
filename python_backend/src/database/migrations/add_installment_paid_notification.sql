-- Migration: Add 'installment_paid' notification type and 'payment' source_kind
-- This allows the notification system to handle payment-related notifications

-- Drop existing constraints if they exist (idempotent)
ALTER TABLE client_portal.pm_notifications
    DROP CONSTRAINT IF EXISTS pm_notifications_type_check;

ALTER TABLE client_portal.pm_notifications
    DROP CONSTRAINT IF EXISTS pm_notifications_source_kind_check;

-- Add updated constraints with new values
ALTER TABLE client_portal.pm_notifications
    ADD CONSTRAINT pm_notifications_type_check
    CHECK (type IN ('issue_created', 'message_posted', 'installment_paid'));

ALTER TABLE client_portal.pm_notifications
    ADD CONSTRAINT pm_notifications_source_kind_check
    CHECK (source_kind IN ('issue', 'message', 'material', 'receipt', 'payment'));
