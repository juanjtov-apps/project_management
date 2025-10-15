-- Migration: Add Material Areas and Items (Comprehensive Materials Redesign)
-- Date: 2025-10-15
-- Type: Additive only - existing materials table untouched

BEGIN;

-- MATERIAL AREAS TABLE
-- Groups materials by area/section (e.g., "Foundation", "Framing", "Electrical")
CREATE TABLE IF NOT EXISTS client_portal.material_areas(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id varchar NOT NULL,
    name text NOT NULL,
    description text,
    sort_order integer DEFAULT 0,
    created_by varchar NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT fk_area_project FOREIGN KEY(project_id) 
        REFERENCES public.projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_area_creator FOREIGN KEY(created_by) 
        REFERENCES public.users(id) ON DELETE RESTRICT,
    CONSTRAINT unique_area_name UNIQUE(project_id, name)
);

-- MATERIAL ITEMS TABLE
-- Individual materials linked to an area
CREATE TABLE IF NOT EXISTS client_portal.material_items(
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    area_id uuid NOT NULL,
    project_id varchar NOT NULL,
    name text NOT NULL,
    spec text,
    product_link text,
    vendor text,
    quantity text,
    unit_cost numeric,
    status text DEFAULT 'pending',
    added_by varchar NOT NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT fk_item_area FOREIGN KEY(area_id) 
        REFERENCES client_portal.material_areas(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_project FOREIGN KEY(project_id) 
        REFERENCES public.projects(id) ON DELETE CASCADE,
    CONSTRAINT fk_item_user FOREIGN KEY(added_by) 
        REFERENCES public.users(id) ON DELETE RESTRICT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_material_areas_project ON client_portal.material_areas(project_id);
CREATE INDEX IF NOT EXISTS idx_material_areas_sort ON client_portal.material_areas(sort_order);
CREATE INDEX IF NOT EXISTS idx_material_items_area ON client_portal.material_items(area_id);
CREATE INDEX IF NOT EXISTS idx_material_items_project ON client_portal.material_items(project_id);
CREATE INDEX IF NOT EXISTS idx_material_items_status ON client_portal.material_items(status);

-- Update alembic version
INSERT INTO client_portal.alembic_version(version_num) 
VALUES ('add_material_areas_001')
ON CONFLICT (version_num) DO NOTHING;

COMMIT;
