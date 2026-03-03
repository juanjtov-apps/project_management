-- Migration: Add Project Stages and Templates
-- Date: 2026-01-05
-- Type: Additive only

BEGIN;

-- STAGE TEMPLATES TABLE (predefined templates)
CREATE TABLE IF NOT EXISTS client_portal.stage_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    category text DEFAULT 'general',
    created_at timestamptz DEFAULT now()
);

-- STAGE TEMPLATE ITEMS TABLE (stages within a template)
CREATE TABLE IF NOT EXISTS client_portal.stage_template_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid NOT NULL REFERENCES client_portal.stage_templates(id) ON DELETE CASCADE,
    order_index integer NOT NULL DEFAULT 0,
    name text NOT NULL,
    default_duration_days integer,
    default_materials_note text,
    created_at timestamptz DEFAULT now()
);

-- PROJECT STAGES TABLE (actual stages for a project)
CREATE TABLE IF NOT EXISTS client_portal.project_stages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id varchar NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    order_index integer NOT NULL DEFAULT 0,
    name text NOT NULL,
    status text NOT NULL DEFAULT 'NOT_STARTED' CHECK (status IN ('NOT_STARTED', 'ACTIVE', 'COMPLETE')),
    planned_start_date date,
    planned_end_date date,
    finish_materials_due_date date,
    finish_materials_note text,
    material_area_id uuid REFERENCES client_portal.material_areas(id) ON DELETE SET NULL,
    client_visible boolean NOT NULL DEFAULT true,
    created_by varchar NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT unique_stage_order UNIQUE(project_id, order_index)
);

-- Add stage_id column to existing material_items table for bidirectional linking
ALTER TABLE client_portal.material_items
ADD COLUMN IF NOT EXISTS stage_id uuid REFERENCES client_portal.project_stages(id) ON DELETE SET NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_project_stages_project ON client_portal.project_stages(project_id);
CREATE INDEX IF NOT EXISTS idx_project_stages_status ON client_portal.project_stages(status);
CREATE INDEX IF NOT EXISTS idx_project_stages_order ON client_portal.project_stages(project_id, order_index);
CREATE INDEX IF NOT EXISTS idx_stage_template_items_template ON client_portal.stage_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_material_items_stage ON client_portal.material_items(stage_id);

-- Seed default templates
INSERT INTO client_portal.stage_templates (name, description, category) VALUES
('Kitchen Remodel', 'Complete kitchen renovation with cabinets, counters, and appliances', 'residential'),
('Bathroom Renovation', 'Full bathroom remodel including plumbing and tile', 'residential'),
('Full Home Remodel', 'Comprehensive whole-home renovation project', 'residential'),
('Room Addition', 'Single room addition to existing structure', 'residential'),
('ADU Construction', 'Accessory Dwelling Unit build from foundation to finish', 'residential'),
('Custom', 'Start with a blank slate - add stages manually', 'general')
ON CONFLICT (name) DO NOTHING;

-- Seed template items for Kitchen Remodel
INSERT INTO client_portal.stage_template_items (template_id, order_index, name, default_duration_days, default_materials_note)
SELECT t.id, items.order_index, items.name, items.duration, items.note
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    (0, 'Demo & Prep', 3, 'Protect adjacent areas, remove existing cabinets and appliances'),
    (1, 'Rough Plumbing', 5, 'Sink, dishwasher, and refrigerator water line locations confirmed'),
    (2, 'Rough Electrical', 5, 'Outlet placement, under-cabinet lighting, and appliance circuits'),
    (3, 'Drywall & Paint', 7, 'Paint colors and finish selections due'),
    (4, 'Cabinets & Counters', 10, 'Cabinet style, countertop material, and hardware selections required'),
    (5, 'Backsplash & Fixtures', 5, 'Tile pattern, faucet, and sink selections due'),
    (6, 'Appliances & Final', 3, 'Appliance delivery scheduled, final hardware and accessories')
) AS items(order_index, name, duration, note)
WHERE t.name = 'Kitchen Remodel'
ON CONFLICT DO NOTHING;

-- Seed template items for Bathroom Renovation
INSERT INTO client_portal.stage_template_items (template_id, order_index, name, default_duration_days, default_materials_note)
SELECT t.id, items.order_index, items.name, items.duration, items.note
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    (0, 'Demo', 2, 'Remove existing fixtures, flooring, and wall coverings'),
    (1, 'Rough Plumbing', 4, 'Fixture locations confirmed - toilet, vanity, shower/tub'),
    (2, 'Waterproofing', 2, 'Shower pan and membrane installation'),
    (3, 'Tile Work', 7, 'Floor tile, wall tile, and shower tile selections required'),
    (4, 'Fixtures & Vanity', 5, 'Vanity, toilet, faucets, and showerhead selections due'),
    (5, 'Final Details', 2, 'Mirror, towel bars, toilet paper holder, and accessories')
) AS items(order_index, name, duration, note)
WHERE t.name = 'Bathroom Renovation'
ON CONFLICT DO NOTHING;

-- Seed template items for Full Home Remodel
INSERT INTO client_portal.stage_template_items (template_id, order_index, name, default_duration_days, default_materials_note)
SELECT t.id, items.order_index, items.name, items.duration, items.note
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    (0, 'Planning & Permits', 14, 'Finalize scope, obtain permits, order long-lead items'),
    (1, 'Demo & Structural', 10, 'Demolition and any structural modifications'),
    (2, 'Rough MEP', 14, 'Mechanical, electrical, and plumbing rough-in'),
    (3, 'Insulation & Drywall', 10, 'Insulation, drywall, and texture'),
    (4, 'Interior Finishes', 14, 'Flooring, cabinets, counters, paint selections due'),
    (5, 'Fixtures & Trim', 10, 'Light fixtures, plumbing fixtures, door hardware'),
    (6, 'Final Punch List', 5, 'Touch-ups, cleaning, final walkthrough')
) AS items(order_index, name, duration, note)
WHERE t.name = 'Full Home Remodel'
ON CONFLICT DO NOTHING;

-- Seed template items for Room Addition
INSERT INTO client_portal.stage_template_items (template_id, order_index, name, default_duration_days, default_materials_note)
SELECT t.id, items.order_index, items.name, items.duration, items.note
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    (0, 'Foundation', 7, 'Foundation type and specs confirmed'),
    (1, 'Framing', 10, 'Window and door selections required'),
    (2, 'Roofing & Exterior', 7, 'Roofing material and siding selections'),
    (3, 'Rough MEP', 7, 'Electrical, plumbing, and HVAC rough-in'),
    (4, 'Insulation & Drywall', 7, 'Insulation type and drywall finish'),
    (5, 'Interior Finishes', 10, 'Flooring, paint, trim selections due'),
    (6, 'Final Details', 3, 'Final connections and punch list')
) AS items(order_index, name, duration, note)
WHERE t.name = 'Room Addition'
ON CONFLICT DO NOTHING;

-- Seed template items for ADU Construction
INSERT INTO client_portal.stage_template_items (template_id, order_index, name, default_duration_days, default_materials_note)
SELECT t.id, items.order_index, items.name, items.duration, items.note
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    (0, 'Site Prep & Foundation', 14, 'Site grading, utilities, foundation type confirmed'),
    (1, 'Framing', 10, 'Window, door, and exterior finish selections'),
    (2, 'Roofing & Siding', 7, 'Roofing and siding materials selected'),
    (3, 'Rough MEP', 10, 'All mechanical, electrical, plumbing rough-in'),
    (4, 'Insulation & Drywall', 7, 'Insulation and drywall specifications'),
    (5, 'Kitchen & Bath', 14, 'All kitchen and bathroom finish selections required'),
    (6, 'Flooring & Paint', 7, 'Flooring type and paint colors due'),
    (7, 'Final Finishes', 5, 'Fixtures, hardware, appliances, final details')
) AS items(order_index, name, duration, note)
WHERE t.name = 'ADU Construction'
ON CONFLICT DO NOTHING;

-- Update alembic version tracking
INSERT INTO client_portal.alembic_version(version_num)
VALUES ('add_project_stages_001')
ON CONFLICT (version_num) DO NOTHING;

COMMIT;
