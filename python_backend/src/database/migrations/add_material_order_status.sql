-- Migration: Add order_status column to material_items
-- Tracks whether a material has been ordered or is pending to order

-- Add order_status column with CHECK constraint
ALTER TABLE client_portal.material_items
ADD COLUMN IF NOT EXISTS order_status varchar(20) DEFAULT 'pending_to_order';

-- Add CHECK constraint (separate statement for idempotency)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'material_items_order_status_check'
    ) THEN
        ALTER TABLE client_portal.material_items
        ADD CONSTRAINT material_items_order_status_check
        CHECK (order_status IN ('pending_to_order', 'ordered'));
    END IF;
END $$;
