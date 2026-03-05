-- Migration: Add task_submitted notification type and task source_kind

ALTER TABLE client_portal.pm_notifications
    DROP CONSTRAINT IF EXISTS pm_notifications_type_check;

ALTER TABLE client_portal.pm_notifications
    ADD CONSTRAINT pm_notifications_type_check
    CHECK (type IN (
        'issue_created',
        'message_posted',
        'material_added',
        'receipt_uploaded',
        'installment_paid',
        'task_submitted'
    ));

ALTER TABLE client_portal.pm_notifications
    DROP CONSTRAINT IF EXISTS pm_notifications_source_kind_check;

ALTER TABLE client_portal.pm_notifications
    ADD CONSTRAINT pm_notifications_source_kind_check
    CHECK (source_kind IN (
        'issue',
        'message',
        'material',
        'receipt',
        'payment',
        'task'
    ));
