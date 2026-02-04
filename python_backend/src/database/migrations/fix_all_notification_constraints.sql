-- Migration: Consolidate all notification types and source kinds
-- This fixes constraints to allow ALL notification types used in the codebase
-- Run on both DEV and PROD databases

-- Drop existing constraints
ALTER TABLE client_portal.pm_notifications
    DROP CONSTRAINT IF EXISTS pm_notifications_type_check;

ALTER TABLE client_portal.pm_notifications
    DROP CONSTRAINT IF EXISTS pm_notifications_source_kind_check;

-- Add comprehensive constraints with ALL types
ALTER TABLE client_portal.pm_notifications
    ADD CONSTRAINT pm_notifications_type_check
    CHECK (type IN (
        'issue_created',
        'message_posted',
        'material_added',
        'receipt_uploaded',
        'installment_paid'
    ));

ALTER TABLE client_portal.pm_notifications
    ADD CONSTRAINT pm_notifications_source_kind_check
    CHECK (source_kind IN (
        'issue',
        'message',
        'material',
        'receipt',
        'payment'
    ));
