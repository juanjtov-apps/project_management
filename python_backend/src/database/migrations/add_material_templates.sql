-- Migration: Add Material Templates for Auto-Population
-- Date: 2026-01-06
-- Type: Additive only
-- Purpose: Link finish materials to stage templates for auto-population

BEGIN;

-- =============================================================================
-- MATERIAL TEMPLATES TABLE
-- Stores default materials for each project type, linked to stages
-- =============================================================================
CREATE TABLE IF NOT EXISTS client_portal.material_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_template_id uuid REFERENCES client_portal.stage_templates(id) ON DELETE CASCADE,
    stage_name varchar(255) NOT NULL,  -- Maps to stage name (e.g., "Cabinets & Counters")
    area_name varchar(255) NOT NULL,   -- Room/scope (e.g., "Kitchen", "Bathroom")
    material_name varchar(255) NOT NULL,
    material_category varchar(100),     -- Category within area (e.g., "Cabinets", "Appliances")
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_material_templates_stage_template
    ON client_portal.material_templates(stage_template_id);
CREATE INDEX IF NOT EXISTS idx_material_templates_area
    ON client_portal.material_templates(area_name);

-- =============================================================================
-- MODIFY MATERIAL_ITEMS TABLE
-- Add approval workflow columns
-- =============================================================================
ALTER TABLE client_portal.material_items
ADD COLUMN IF NOT EXISTS approval_status varchar(50) DEFAULT 'approved'
    CHECK (approval_status IN ('pending', 'approved', 'rejected'));

ALTER TABLE client_portal.material_items
ADD COLUMN IF NOT EXISTS is_from_template boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_material_items_approval
    ON client_portal.material_items(approval_status);
CREATE INDEX IF NOT EXISTS idx_material_items_template
    ON client_portal.material_items(is_from_template) WHERE is_from_template = true;

-- =============================================================================
-- MODIFY MATERIAL_AREAS TABLE
-- Add template origin tracking
-- =============================================================================
ALTER TABLE client_portal.material_areas
ADD COLUMN IF NOT EXISTS is_from_template boolean DEFAULT false;

-- =============================================================================
-- SEED MATERIAL TEMPLATES
-- =============================================================================

-- Kitchen Remodel Materials (mapped to existing stage names)
INSERT INTO client_portal.material_templates (stage_template_id, stage_name, area_name, material_name, material_category, sort_order)
SELECT t.id, items.stage_name, items.area_name, items.material_name, items.category, items.sort_order
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    -- Demo & Prep stage - no materials needed

    -- Rough Plumbing stage
    ('Rough Plumbing', 'Kitchen', 'Kitchen Sink', 'Plumbing Fixtures', 1),
    ('Rough Plumbing', 'Kitchen', 'Kitchen Faucet', 'Plumbing Fixtures', 2),

    -- Rough Electrical stage
    ('Rough Electrical', 'Kitchen', 'Recessed Lights', 'Lighting', 1),
    ('Rough Electrical', 'Kitchen', 'Undercabinet LED Lights', 'Lighting', 2),

    -- Drywall & Paint stage - no finish materials (paint selections handled separately)

    -- Cabinets & Counters stage
    ('Cabinets & Counters', 'Kitchen', 'Kitchen Cabinets', 'Cabinets', 1),
    ('Cabinets & Counters', 'Kitchen', 'Countertop Slabs', 'Countertops', 2),
    ('Cabinets & Counters', 'Kitchen', 'Cabinet Hardware', 'Hardware', 3),
    ('Cabinets & Counters', 'Kitchen', 'Toe Kicks', 'Trim', 4),
    ('Cabinets & Counters', 'Kitchen', 'Crown Molding', 'Trim', 5),

    -- Backsplash & Fixtures stage
    ('Backsplash & Fixtures', 'Kitchen', 'Backsplash Tile', 'Backsplash', 1),
    ('Backsplash & Fixtures', 'Kitchen', 'Garbage Disposal', 'Appliances', 2),

    -- Appliances & Final stage
    ('Appliances & Final', 'Kitchen', 'Cooktop', 'Appliances', 1),
    ('Appliances & Final', 'Kitchen', 'Oven', 'Appliances', 2),
    ('Appliances & Final', 'Kitchen', 'Microwave', 'Appliances', 3),
    ('Appliances & Final', 'Kitchen', 'Refrigerator', 'Appliances', 4),
    ('Appliances & Final', 'Kitchen', 'Dishwasher', 'Appliances', 5),
    ('Appliances & Final', 'Kitchen', 'Range Hood', 'Appliances', 6)
) AS items(stage_name, area_name, material_name, category, sort_order)
WHERE t.name = 'Kitchen Remodel'
ON CONFLICT DO NOTHING;

-- Bathroom Renovation Materials (mapped to existing stage names)
INSERT INTO client_portal.material_templates (stage_template_id, stage_name, area_name, material_name, material_category, sort_order)
SELECT t.id, items.stage_name, items.area_name, items.material_name, items.category, items.sort_order
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    -- Tile Work stage
    ('Tile Work', 'Bathroom', 'Floor Tile', 'Tile', 1),
    ('Tile Work', 'Bathroom', 'Wall Tile', 'Tile', 2),
    ('Tile Work', 'Bathroom', 'Shower Tile', 'Tile', 3),
    ('Tile Work', 'Bathroom', 'Tile Grout', 'Tile', 4),

    -- Fixtures & Vanity stage
    ('Fixtures & Vanity', 'Bathroom', 'Vanity Cabinet', 'Cabinets', 1),
    ('Fixtures & Vanity', 'Bathroom', 'Vanity Countertop', 'Countertops', 2),
    ('Fixtures & Vanity', 'Bathroom', 'Bathroom Sink', 'Plumbing Fixtures', 3),
    ('Fixtures & Vanity', 'Bathroom', 'Bathroom Faucet', 'Plumbing Fixtures', 4),
    ('Fixtures & Vanity', 'Bathroom', 'Toilet', 'Plumbing Fixtures', 5),
    ('Fixtures & Vanity', 'Bathroom', 'Shower Head', 'Plumbing Fixtures', 6),
    ('Fixtures & Vanity', 'Bathroom', 'Shower Valve', 'Plumbing Fixtures', 7),

    -- Final Details stage
    ('Final Details', 'Bathroom', 'Mirror', 'Accessories', 1),
    ('Final Details', 'Bathroom', 'Towel Bars', 'Accessories', 2),
    ('Final Details', 'Bathroom', 'Toilet Paper Holder', 'Accessories', 3),
    ('Final Details', 'Bathroom', 'Vanity Light Fixture', 'Lighting', 4),
    ('Final Details', 'Bathroom', 'Exhaust Fan', 'Ventilation', 5)
) AS items(stage_name, area_name, material_name, category, sort_order)
WHERE t.name = 'Bathroom Renovation'
ON CONFLICT DO NOTHING;

-- Full Home Remodel Materials (mapped to existing stage names)
INSERT INTO client_portal.material_templates (stage_template_id, stage_name, area_name, material_name, material_category, sort_order)
SELECT t.id, items.stage_name, items.area_name, items.material_name, items.category, items.sort_order
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    -- Interior Finishes stage
    ('Interior Finishes', 'General', 'Flooring Material', 'Flooring', 1),
    ('Interior Finishes', 'General', 'Baseboards', 'Trim', 2),
    ('Interior Finishes', 'General', 'Interior Paint', 'Paint', 3),
    ('Interior Finishes', 'General', 'Interior Doors', 'Doors', 4),
    ('Interior Finishes', 'General', 'Door Hardware', 'Hardware', 5),

    -- Fixtures & Trim stage
    ('Fixtures & Trim', 'General', 'Light Fixtures', 'Lighting', 1),
    ('Fixtures & Trim', 'General', 'Ceiling Fans', 'Lighting', 2),
    ('Fixtures & Trim', 'General', 'Window Treatments', 'Window', 3)
) AS items(stage_name, area_name, material_name, category, sort_order)
WHERE t.name = 'Full Home Remodel'
ON CONFLICT DO NOTHING;

-- Room Addition Materials (mapped to existing stage names)
INSERT INTO client_portal.material_templates (stage_template_id, stage_name, area_name, material_name, material_category, sort_order)
SELECT t.id, items.stage_name, items.area_name, items.material_name, items.category, items.sort_order
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    -- Framing stage
    ('Framing', 'General', 'Windows', 'Windows', 1),
    ('Framing', 'General', 'Exterior Door', 'Doors', 2),

    -- Roofing & Exterior stage
    ('Roofing & Exterior', 'General', 'Roofing Material', 'Roofing', 1),
    ('Roofing & Exterior', 'General', 'Siding', 'Exterior', 2),
    ('Roofing & Exterior', 'General', 'Gutters', 'Exterior', 3),

    -- Interior Finishes stage
    ('Interior Finishes', 'General', 'Flooring Material', 'Flooring', 1),
    ('Interior Finishes', 'General', 'Interior Paint', 'Paint', 2),
    ('Interior Finishes', 'General', 'Baseboards', 'Trim', 3),
    ('Interior Finishes', 'General', 'Light Fixtures', 'Lighting', 4)
) AS items(stage_name, area_name, material_name, category, sort_order)
WHERE t.name = 'Room Addition'
ON CONFLICT DO NOTHING;

-- ADU Construction Materials (mapped to existing stage names)
INSERT INTO client_portal.material_templates (stage_template_id, stage_name, area_name, material_name, material_category, sort_order)
SELECT t.id, items.stage_name, items.area_name, items.material_name, items.category, items.sort_order
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    -- Framing stage
    ('Framing', 'General', 'Windows', 'Windows', 1),
    ('Framing', 'General', 'Exterior Doors', 'Doors', 2),

    -- Roofing & Siding stage
    ('Roofing & Siding', 'General', 'Roofing Material', 'Roofing', 1),
    ('Roofing & Siding', 'General', 'Siding Material', 'Exterior', 2),

    -- Kitchen & Bath stage (ADU has combined kitchen and bathroom)
    ('Kitchen & Bath', 'Kitchen', 'Kitchen Cabinets', 'Cabinets', 1),
    ('Kitchen & Bath', 'Kitchen', 'Kitchen Countertop', 'Countertops', 2),
    ('Kitchen & Bath', 'Kitchen', 'Kitchen Sink', 'Plumbing Fixtures', 3),
    ('Kitchen & Bath', 'Kitchen', 'Kitchen Faucet', 'Plumbing Fixtures', 4),
    ('Kitchen & Bath', 'Kitchen', 'Cooktop', 'Appliances', 5),
    ('Kitchen & Bath', 'Kitchen', 'Refrigerator', 'Appliances', 6),
    ('Kitchen & Bath', 'Kitchen', 'Microwave', 'Appliances', 7),
    ('Kitchen & Bath', 'Kitchen', 'Range Hood', 'Appliances', 8),
    ('Kitchen & Bath', 'Bathroom', 'Vanity Cabinet', 'Cabinets', 9),
    ('Kitchen & Bath', 'Bathroom', 'Vanity Countertop', 'Countertops', 10),
    ('Kitchen & Bath', 'Bathroom', 'Toilet', 'Plumbing Fixtures', 11),
    ('Kitchen & Bath', 'Bathroom', 'Shower Tile', 'Tile', 12),
    ('Kitchen & Bath', 'Bathroom', 'Floor Tile', 'Tile', 13),

    -- Flooring & Paint stage
    ('Flooring & Paint', 'General', 'Flooring Material', 'Flooring', 1),
    ('Flooring & Paint', 'General', 'Interior Paint', 'Paint', 2),
    ('Flooring & Paint', 'General', 'Baseboards', 'Trim', 3),

    -- Final Finishes stage
    ('Final Finishes', 'General', 'Light Fixtures', 'Lighting', 1),
    ('Final Finishes', 'General', 'Interior Doors', 'Doors', 2),
    ('Final Finishes', 'General', 'Door Hardware', 'Hardware', 3),
    ('Final Finishes', 'Kitchen', 'Backsplash Tile', 'Backsplash', 4),
    ('Final Finishes', 'Bathroom', 'Mirror', 'Accessories', 5),
    ('Final Finishes', 'Bathroom', 'Towel Bars', 'Accessories', 6)
) AS items(stage_name, area_name, material_name, category, sort_order)
WHERE t.name = 'ADU Construction'
ON CONFLICT DO NOTHING;

-- Update alembic version tracking
INSERT INTO client_portal.alembic_version(version_num)
VALUES ('add_material_templates_001')
ON CONFLICT (version_num) DO NOTHING;

COMMIT;
