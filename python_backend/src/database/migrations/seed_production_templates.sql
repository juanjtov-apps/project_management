-- Migration: Seed Production Database with All Project Stage Templates
-- Date: 2026-01-20
-- Type: Additive only (idempotent - safe to re-run)
-- Purpose: Populate production database with all stage templates including new Addition templates
-- Source: docs/archive/addition-project-templates.md

BEGIN;

-- =============================================================================
-- SCHEMA CREATION (IF NOT EXISTS)
-- =============================================================================

-- Stage Templates Table
CREATE TABLE IF NOT EXISTS client_portal.stage_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text,
    category text DEFAULT 'general',
    created_at timestamptz DEFAULT now()
);

-- Stage Template Items Table
CREATE TABLE IF NOT EXISTS client_portal.stage_template_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id uuid NOT NULL REFERENCES client_portal.stage_templates(id) ON DELETE CASCADE,
    order_index integer NOT NULL DEFAULT 0,
    name text NOT NULL,
    default_duration_days integer,
    default_materials_note text,
    created_at timestamptz DEFAULT now()
);

-- Material Templates Table
CREATE TABLE IF NOT EXISTS client_portal.material_templates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_template_id uuid REFERENCES client_portal.stage_templates(id) ON DELETE CASCADE,
    stage_name varchar(255) NOT NULL,
    area_name varchar(255) NOT NULL,
    material_name varchar(255) NOT NULL,
    material_category varchar(100),
    sort_order integer DEFAULT 0,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT unique_material_template UNIQUE (stage_template_id, stage_name, area_name, material_name)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stage_template_items_template ON client_portal.stage_template_items(template_id);
CREATE INDEX IF NOT EXISTS idx_material_templates_stage_template ON client_portal.material_templates(stage_template_id);
CREATE INDEX IF NOT EXISTS idx_material_templates_area ON client_portal.material_templates(area_name);

-- =============================================================================
-- STAGE TEMPLATES (11 total)
-- =============================================================================

INSERT INTO client_portal.stage_templates (name, description, category) VALUES
-- Existing templates
('Kitchen Remodel', 'Complete kitchen renovation with cabinets, counters, and appliances', 'residential'),
('Bathroom Renovation', 'Full bathroom remodel including plumbing and tile', 'residential'),
('Full Home Remodel', 'Comprehensive whole-home renovation project', 'residential'),
('Room Addition', 'Single room addition to existing structure', 'residential'),
('ADU Construction', 'Accessory Dwelling Unit build from foundation to finish', 'residential'),
('Custom', 'Start with a blank slate - add stages manually', 'general'),
-- New Addition templates
('Master Suite Addition', 'Master suite addition with bedroom, bathroom with walk-in shower, and walk-in closet (400-600 sf)', 'residential'),
('Guest Suite Addition', 'Guest suite with bedroom, bathroom, and dedicated closet (200-350 sf)', 'residential'),
('Multi-Bedroom Addition', 'Two bedrooms with shared bathroom and hallway (500-700 sf)', 'residential'),
('Family Wing Addition', 'Two bedrooms with two bathrooms for multi-generational living (700-1000 sf)', 'residential'),
('Kitchen Extension', 'Kitchen expansion with dining area and optional pantry (200-400 sf)', 'residential')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- STAGE TEMPLATE ITEMS - Existing Templates
-- =============================================================================

-- Kitchen Remodel (7 stages)
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
AND NOT EXISTS (SELECT 1 FROM client_portal.stage_template_items sti WHERE sti.template_id = t.id);

-- Bathroom Renovation (6 stages)
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
AND NOT EXISTS (SELECT 1 FROM client_portal.stage_template_items sti WHERE sti.template_id = t.id);

-- Full Home Remodel (7 stages)
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
AND NOT EXISTS (SELECT 1 FROM client_portal.stage_template_items sti WHERE sti.template_id = t.id);

-- Room Addition (7 stages)
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
AND NOT EXISTS (SELECT 1 FROM client_portal.stage_template_items sti WHERE sti.template_id = t.id);

-- ADU Construction (8 stages)
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
AND NOT EXISTS (SELECT 1 FROM client_portal.stage_template_items sti WHERE sti.template_id = t.id);

-- =============================================================================
-- STAGE TEMPLATE ITEMS - New Addition Templates
-- =============================================================================

-- Master Suite Addition (18 stages)
INSERT INTO client_portal.stage_template_items (template_id, order_index, name, default_duration_days, default_materials_note)
SELECT t.id, items.order_index, items.name, items.duration, items.note
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    -- Shared stages (0-11)
    (0, 'Drawings/Design', 14, 'Floor plans, elevations, structural calculations, Title 24, permit submission'),
    (1, 'Demolition', 3, 'Dumpsters, protect work area, demolish exterior wall and deck/patio as needed'),
    (2, 'Foundations', 7, 'Dig, rebar, pour concrete, hold downs, anchor bolts per approved plans'),
    (3, 'Framing', 14, 'Frame 400-600 sf addition: master bedroom, master bathroom, walk-in closet'),
    (4, 'Roof', 7, 'Plywood, tar paper, flashing, HD shingles with UV protection, gutters, downspouts'),
    (5, 'Windows and Doors', 5, 'Waterproofing with flashing paper, install new windows and doors'),
    (6, 'Electrical (Rough)', 5, 'GFCI outlets in bathroom, outlets/switches throughout, recessed lights, exhaust fan circuit'),
    (7, 'Plumbing (Rough)', 7, 'Drainage, water supply, air vents, shower valves, waterproof membrane, exhaust duct'),
    (8, 'Insulation', 3, 'R-value insulation on exterior walls and attic per approved plans'),
    (9, 'Drywall, Texture and Paint', 10, 'Drywall throughout, tape, texture to match, primer, two coats paint'),
    (10, 'Stucco/Siding', 7, 'Waterproof tar paper, metal lath, scratch coat, two additional coats to match'),
    (11, 'Flooring', 5, 'Hardwood/carpet/luxury vinyl throughout, new baseboards, primer and paint'),
    -- Bathroom-specific stages (12-17)
    (12, 'Shower/Tub Construction', 7, 'Curb 4" min, shower pan slope 1/4" per ft, niche, thinset, tiles, grout'),
    (13, 'Bathroom Floor Tile', 3, 'Floor tiles with grout'),
    (14, 'Vanity and Fixtures Installation', 5, 'Drywall on remaining walls, vanity cabinet, countertop, toilet, sink, faucet'),
    (15, 'Bathroom Electrical (Finish)', 2, 'Fixture light installation'),
    (16, 'Bathroom Plumbing (Finish)', 2, 'Final shower valve connection, shower head and trim'),
    (17, 'Bathroom Accessories', 2, 'Towel bars, toilet paper holder, grab bars, mirror')
) AS items(order_index, name, duration, note)
WHERE t.name = 'Master Suite Addition'
AND NOT EXISTS (SELECT 1 FROM client_portal.stage_template_items sti WHERE sti.template_id = t.id);

-- Guest Suite Addition (18 stages)
INSERT INTO client_portal.stage_template_items (template_id, order_index, name, default_duration_days, default_materials_note)
SELECT t.id, items.order_index, items.name, items.duration, items.note
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    -- Shared stages (0-11)
    (0, 'Drawings/Design', 14, 'Floor plans, elevations, structural calculations, Title 24, permit submission'),
    (1, 'Demolition', 3, 'Dumpsters, protect work area, demolish exterior wall and deck/patio as needed'),
    (2, 'Foundations', 7, 'Dig, rebar, pour concrete, hold downs, anchor bolts per approved plans'),
    (3, 'Framing', 10, 'Frame 200-350 sf addition: guest bedroom, guest bathroom, walk-in closet'),
    (4, 'Roof', 7, 'Plywood, tar paper, flashing, HD shingles with UV protection, gutters, downspouts'),
    (5, 'Windows and Doors', 5, 'Waterproofing with flashing paper, install new windows and doors'),
    (6, 'Electrical (Rough)', 5, 'GFCI outlets in bathroom, outlets/switches throughout, recessed lights, exhaust fan circuit'),
    (7, 'Plumbing (Rough)', 7, 'Drainage, water supply, air vents, shower valves, waterproof membrane, exhaust duct'),
    (8, 'Insulation', 3, 'R-value insulation on exterior walls and attic per approved plans'),
    (9, 'Drywall, Texture and Paint', 10, 'Drywall throughout, tape, texture to match, primer, two coats paint'),
    (10, 'Stucco/Siding', 7, 'Waterproof tar paper, metal lath, scratch coat, two additional coats to match'),
    (11, 'Flooring', 5, 'Hardwood/carpet/luxury vinyl throughout, new baseboards, primer and paint'),
    -- Bathroom-specific stages (12-17)
    (12, 'Shower/Tub Construction', 7, 'Mortar for tub, bathtub installation, niche, thinset, tiles around tub, grout'),
    (13, 'Bathroom Floor Tile', 3, 'Floor tiles with grout'),
    (14, 'Vanity and Fixtures Installation', 5, 'Drywall on remaining walls, vanity cabinet, countertop, toilet, sink, faucet'),
    (15, 'Bathroom Electrical (Finish)', 2, 'Fixture light installation'),
    (16, 'Bathroom Plumbing (Finish)', 2, 'Final tub/shower valve connection, tub spout/shower head and trim'),
    (17, 'Bathroom Accessories', 2, 'Towel bars, toilet paper holder, grab bars, mirror')
) AS items(order_index, name, duration, note)
WHERE t.name = 'Guest Suite Addition'
AND NOT EXISTS (SELECT 1 FROM client_portal.stage_template_items sti WHERE sti.template_id = t.id);

-- Multi-Bedroom Addition (18 stages)
INSERT INTO client_portal.stage_template_items (template_id, order_index, name, default_duration_days, default_materials_note)
SELECT t.id, items.order_index, items.name, items.duration, items.note
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    -- Shared stages (0-11)
    (0, 'Drawings/Design', 14, 'Floor plans, elevations, structural calculations, Title 24, permit submission'),
    (1, 'Demolition', 3, 'Dumpsters, protect work area, demolish exterior wall and deck/patio as needed'),
    (2, 'Foundations', 7, 'Dig, rebar, pour concrete, hold downs, anchor bolts per approved plans'),
    (3, 'Framing', 14, 'Frame 500-700 sf addition: 2 bedrooms, shared bathroom, hallway'),
    (4, 'Roof', 7, 'Plywood, tar paper, flashing, HD shingles with UV protection, gutters, downspouts'),
    (5, 'Windows and Doors', 5, 'Waterproofing with flashing paper, install new windows and doors'),
    (6, 'Electrical (Rough)', 5, 'GFCI outlets in bathroom, outlets/switches throughout, recessed lights including hallway'),
    (7, 'Plumbing (Rough)', 7, 'Drainage, water supply, air vents, shower valves, waterproof membrane, exhaust duct'),
    (8, 'Insulation', 3, 'R-value insulation on exterior walls and attic per approved plans'),
    (9, 'Drywall, Texture and Paint', 10, 'Drywall throughout, tape, texture to match, primer, two coats paint'),
    (10, 'Stucco/Siding', 7, 'Waterproof tar paper, metal lath, scratch coat, two additional coats to match'),
    (11, 'Flooring', 5, 'Hardwood/carpet/luxury vinyl throughout, new baseboards, primer and paint'),
    -- Bathroom-specific stages (12-17)
    (12, 'Shower/Tub Construction', 7, 'Mortar for tub, bathtub installation, niche, thinset, tiles around tub, grout'),
    (13, 'Bathroom Floor Tile', 3, 'Floor tiles with grout'),
    (14, 'Vanity and Fixtures Installation', 5, 'Drywall on remaining walls, vanity cabinet, countertop, toilet, sink, faucet'),
    (15, 'Bathroom Electrical (Finish)', 2, 'Fixture light installation'),
    (16, 'Bathroom Plumbing (Finish)', 2, 'Final tub valve connection, tub spout and shower head'),
    (17, 'Bathroom Accessories', 2, 'Towel bars, toilet paper holder, grab bars, mirror')
) AS items(order_index, name, duration, note)
WHERE t.name = 'Multi-Bedroom Addition'
AND NOT EXISTS (SELECT 1 FROM client_portal.stage_template_items sti WHERE sti.template_id = t.id);

-- Family Wing Addition (24 stages)
INSERT INTO client_portal.stage_template_items (template_id, order_index, name, default_duration_days, default_materials_note)
SELECT t.id, items.order_index, items.name, items.duration, items.note
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    -- Shared stages (0-11)
    (0, 'Drawings/Design', 14, 'Floor plans, elevations, structural calculations, Title 24, permit submission'),
    (1, 'Demolition', 3, 'Dumpsters, protect work area, demolish exterior wall and deck/patio as needed'),
    (2, 'Foundations', 10, 'Dig, rebar, pour concrete, hold downs, anchor bolts per approved plans'),
    (3, 'Framing', 14, 'Frame 700-1000 sf addition: 2 bedrooms, 2 bathrooms, hallway'),
    (4, 'Roof', 7, 'Plywood, tar paper, flashing, HD shingles with UV protection, gutters, downspouts'),
    (5, 'Windows and Doors', 5, 'Waterproofing with flashing paper, install new windows and doors'),
    (6, 'Electrical (Rough)', 7, 'GFCI outlets in 2 bathrooms, outlets/switches throughout, recessed lights, exhaust fan circuits'),
    (7, 'Plumbing (Rough)', 10, 'Drainage for 2 bathrooms, water supply, air vents, shower valves, waterproof membranes, exhaust ducts'),
    (8, 'Insulation', 3, 'R-value insulation on exterior walls and attic per approved plans'),
    (9, 'Drywall, Texture and Paint', 10, 'Drywall throughout, tape, texture to match, primer, two coats paint'),
    (10, 'Stucco/Siding', 7, 'Waterproof tar paper, metal lath, scratch coat, two additional coats to match'),
    (11, 'Flooring', 5, 'Hardwood/carpet/luxury vinyl throughout, new baseboards, primer and paint'),
    -- Bathroom 1 stages (12-17) - Walk-in shower
    (12, 'Bathroom 1 - Shower/Tub Construction', 7, 'Curb 4" min, shower pan slope 1/4" per ft, niche, thinset, tiles, grout'),
    (13, 'Bathroom 1 - Floor Tile', 3, 'Floor tiles with grout'),
    (14, 'Bathroom 1 - Vanity and Fixtures', 5, 'Drywall on remaining walls, vanity cabinet, countertop, toilet, sink, faucet'),
    (15, 'Bathroom 1 - Electrical (Finish)', 2, 'Fixture light installation'),
    (16, 'Bathroom 1 - Plumbing (Finish)', 2, 'Final shower valve connection, shower head and trim'),
    (17, 'Bathroom 1 - Accessories', 2, 'Towel bars, toilet paper holder, grab bars, mirror'),
    -- Bathroom 2 stages (18-23) - Bathtub
    (18, 'Bathroom 2 - Shower/Tub Construction', 7, 'Mortar for tub, bathtub installation, niche, thinset, tiles around tub, grout'),
    (19, 'Bathroom 2 - Floor Tile', 3, 'Floor tiles with grout'),
    (20, 'Bathroom 2 - Vanity and Fixtures', 5, 'Drywall on remaining walls, vanity cabinet, countertop, toilet, sink, faucet'),
    (21, 'Bathroom 2 - Electrical (Finish)', 2, 'Fixture light installation'),
    (22, 'Bathroom 2 - Plumbing (Finish)', 2, 'Final tub valve connection, tub spout and shower head'),
    (23, 'Bathroom 2 - Accessories', 2, 'Towel bars, toilet paper holder, grab bars, mirror')
) AS items(order_index, name, duration, note)
WHERE t.name = 'Family Wing Addition'
AND NOT EXISTS (SELECT 1 FROM client_portal.stage_template_items sti WHERE sti.template_id = t.id);

-- Kitchen Extension (18 stages)
INSERT INTO client_portal.stage_template_items (template_id, order_index, name, default_duration_days, default_materials_note)
SELECT t.id, items.order_index, items.name, items.duration, items.note
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    -- Shared stages (0-11)
    (0, 'Drawings/Design', 14, 'Floor plans, elevations, structural calculations, Title 24, permit submission'),
    (1, 'Demolition', 5, 'Dumpsters, protect work area, demolish exterior wall, existing kitchen cabinets/countertops/appliances'),
    (2, 'Foundations', 7, 'Dig, rebar, pour concrete, hold downs, anchor bolts per approved plans'),
    (3, 'Framing', 10, 'Frame 200-400 sf addition: kitchen area, dining area, optional pantry'),
    (4, 'Roof', 7, 'Plywood, tar paper, flashing, HD shingles with UV protection, gutters, downspouts'),
    (5, 'Windows and Doors', 5, 'Waterproofing with flashing paper, install new windows and doors'),
    (6, 'Electrical (Rough)', 7, 'GFCI outlets 3ft apart, switches, recessed lights, appliance circuits, undercabinet LED lights'),
    (7, 'Plumbing (Rough)', 5, 'Drainage, water supply, kitchen hood duct, air vents, insulate hot water pipes'),
    (8, 'Insulation', 3, 'R-value insulation on exterior walls and attic per approved plans'),
    (9, 'Drywall, Texture and Paint', 10, 'Drywall throughout, tape, texture to match, primer, two coats paint'),
    (10, 'Stucco/Siding', 7, 'Waterproof tar paper, metal lath, scratch coat, two additional coats to match'),
    (11, 'Flooring', 5, 'Hardwood/luxury vinyl throughout, new baseboards, primer and paint'),
    -- Kitchen-specific stages (12-17)
    (12, 'Kitchen Cabinet Installation', 5, 'Install cabinets and island, plywood prior to countertop, toe kicks, crown molding'),
    (13, 'Kitchen Countertop Installation', 3, 'Pick up slabs, cut to shape, install on kitchen and island'),
    (14, 'Kitchen Backsplash', 3, 'Stone/mosaic backsplash on kitchen walls up to cabinet'),
    (15, 'Kitchen Appliance Installation', 3, 'Install cooktop, microwave, garbage disposal, oven, fridge, dishwasher'),
    (16, 'Kitchen Finish Work', 2, 'Install sink, faucet, garbage disposal'),
    (17, 'Kitchen Hood and Ventilation', 2, 'Install kitchen hood, connect exhaust duct to exterior')
) AS items(order_index, name, duration, note)
WHERE t.name = 'Kitchen Extension'
AND NOT EXISTS (SELECT 1 FROM client_portal.stage_template_items sti WHERE sti.template_id = t.id);

-- =============================================================================
-- MATERIAL TEMPLATES - Existing Templates
-- =============================================================================

-- Kitchen Remodel Materials
INSERT INTO client_portal.material_templates (stage_template_id, stage_name, area_name, material_name, material_category, sort_order)
SELECT t.id, items.stage_name, items.area_name, items.material_name, items.category, items.sort_order
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    ('Rough Plumbing', 'Kitchen', 'Kitchen Sink', 'Plumbing Fixtures', 1),
    ('Rough Plumbing', 'Kitchen', 'Kitchen Faucet', 'Plumbing Fixtures', 2),
    ('Rough Electrical', 'Kitchen', 'Recessed Lights', 'Lighting', 1),
    ('Rough Electrical', 'Kitchen', 'Undercabinet LED Lights', 'Lighting', 2),
    ('Cabinets & Counters', 'Kitchen', 'Kitchen Cabinets', 'Cabinets', 1),
    ('Cabinets & Counters', 'Kitchen', 'Countertop Slabs', 'Countertops', 2),
    ('Cabinets & Counters', 'Kitchen', 'Cabinet Hardware', 'Hardware', 3),
    ('Cabinets & Counters', 'Kitchen', 'Toe Kicks', 'Trim', 4),
    ('Cabinets & Counters', 'Kitchen', 'Crown Molding', 'Trim', 5),
    ('Backsplash & Fixtures', 'Kitchen', 'Backsplash Tile', 'Backsplash', 1),
    ('Backsplash & Fixtures', 'Kitchen', 'Garbage Disposal', 'Appliances', 2),
    ('Appliances & Final', 'Kitchen', 'Cooktop', 'Appliances', 1),
    ('Appliances & Final', 'Kitchen', 'Oven', 'Appliances', 2),
    ('Appliances & Final', 'Kitchen', 'Microwave', 'Appliances', 3),
    ('Appliances & Final', 'Kitchen', 'Refrigerator', 'Appliances', 4),
    ('Appliances & Final', 'Kitchen', 'Dishwasher', 'Appliances', 5),
    ('Appliances & Final', 'Kitchen', 'Range Hood', 'Appliances', 6)
) AS items(stage_name, area_name, material_name, category, sort_order)
WHERE t.name = 'Kitchen Remodel'
AND NOT EXISTS (SELECT 1 FROM client_portal.material_templates mt WHERE mt.stage_template_id = t.id);

-- Bathroom Renovation Materials
INSERT INTO client_portal.material_templates (stage_template_id, stage_name, area_name, material_name, material_category, sort_order)
SELECT t.id, items.stage_name, items.area_name, items.material_name, items.category, items.sort_order
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    ('Tile Work', 'Bathroom', 'Floor Tile', 'Tile', 1),
    ('Tile Work', 'Bathroom', 'Wall Tile', 'Tile', 2),
    ('Tile Work', 'Bathroom', 'Shower Tile', 'Tile', 3),
    ('Tile Work', 'Bathroom', 'Tile Grout', 'Tile', 4),
    ('Fixtures & Vanity', 'Bathroom', 'Vanity Cabinet', 'Cabinets', 1),
    ('Fixtures & Vanity', 'Bathroom', 'Vanity Countertop', 'Countertops', 2),
    ('Fixtures & Vanity', 'Bathroom', 'Bathroom Sink', 'Plumbing Fixtures', 3),
    ('Fixtures & Vanity', 'Bathroom', 'Bathroom Faucet', 'Plumbing Fixtures', 4),
    ('Fixtures & Vanity', 'Bathroom', 'Toilet', 'Plumbing Fixtures', 5),
    ('Fixtures & Vanity', 'Bathroom', 'Shower Head', 'Plumbing Fixtures', 6),
    ('Fixtures & Vanity', 'Bathroom', 'Shower Valve', 'Plumbing Fixtures', 7),
    ('Final Details', 'Bathroom', 'Mirror', 'Accessories', 1),
    ('Final Details', 'Bathroom', 'Towel Bars', 'Accessories', 2),
    ('Final Details', 'Bathroom', 'Toilet Paper Holder', 'Accessories', 3),
    ('Final Details', 'Bathroom', 'Vanity Light Fixture', 'Lighting', 4),
    ('Final Details', 'Bathroom', 'Exhaust Fan', 'Ventilation', 5)
) AS items(stage_name, area_name, material_name, category, sort_order)
WHERE t.name = 'Bathroom Renovation'
AND NOT EXISTS (SELECT 1 FROM client_portal.material_templates mt WHERE mt.stage_template_id = t.id);

-- Full Home Remodel Materials
INSERT INTO client_portal.material_templates (stage_template_id, stage_name, area_name, material_name, material_category, sort_order)
SELECT t.id, items.stage_name, items.area_name, items.material_name, items.category, items.sort_order
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    ('Interior Finishes', 'General', 'Flooring Material', 'Flooring', 1),
    ('Interior Finishes', 'General', 'Baseboards', 'Trim', 2),
    ('Interior Finishes', 'General', 'Interior Paint', 'Paint', 3),
    ('Interior Finishes', 'General', 'Interior Doors', 'Doors', 4),
    ('Interior Finishes', 'General', 'Door Hardware', 'Hardware', 5),
    ('Fixtures & Trim', 'General', 'Light Fixtures', 'Lighting', 1),
    ('Fixtures & Trim', 'General', 'Ceiling Fans', 'Lighting', 2),
    ('Fixtures & Trim', 'General', 'Window Treatments', 'Window', 3)
) AS items(stage_name, area_name, material_name, category, sort_order)
WHERE t.name = 'Full Home Remodel'
AND NOT EXISTS (SELECT 1 FROM client_portal.material_templates mt WHERE mt.stage_template_id = t.id);

-- Room Addition Materials
INSERT INTO client_portal.material_templates (stage_template_id, stage_name, area_name, material_name, material_category, sort_order)
SELECT t.id, items.stage_name, items.area_name, items.material_name, items.category, items.sort_order
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    ('Framing', 'General', 'Windows', 'Windows', 1),
    ('Framing', 'General', 'Exterior Door', 'Doors', 2),
    ('Roofing & Exterior', 'General', 'Roofing Material', 'Roofing', 1),
    ('Roofing & Exterior', 'General', 'Siding', 'Exterior', 2),
    ('Roofing & Exterior', 'General', 'Gutters', 'Exterior', 3),
    ('Interior Finishes', 'General', 'Flooring Material', 'Flooring', 1),
    ('Interior Finishes', 'General', 'Interior Paint', 'Paint', 2),
    ('Interior Finishes', 'General', 'Baseboards', 'Trim', 3),
    ('Interior Finishes', 'General', 'Light Fixtures', 'Lighting', 4)
) AS items(stage_name, area_name, material_name, category, sort_order)
WHERE t.name = 'Room Addition'
AND NOT EXISTS (SELECT 1 FROM client_portal.material_templates mt WHERE mt.stage_template_id = t.id);

-- ADU Construction Materials
INSERT INTO client_portal.material_templates (stage_template_id, stage_name, area_name, material_name, material_category, sort_order)
SELECT t.id, items.stage_name, items.area_name, items.material_name, items.category, items.sort_order
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    ('Framing', 'General', 'Windows', 'Windows', 1),
    ('Framing', 'General', 'Exterior Doors', 'Doors', 2),
    ('Roofing & Siding', 'General', 'Roofing Material', 'Roofing', 1),
    ('Roofing & Siding', 'General', 'Siding Material', 'Exterior', 2),
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
    ('Flooring & Paint', 'General', 'Flooring Material', 'Flooring', 1),
    ('Flooring & Paint', 'General', 'Interior Paint', 'Paint', 2),
    ('Flooring & Paint', 'General', 'Baseboards', 'Trim', 3),
    ('Final Finishes', 'General', 'Light Fixtures', 'Lighting', 1),
    ('Final Finishes', 'General', 'Interior Doors', 'Doors', 2),
    ('Final Finishes', 'General', 'Door Hardware', 'Hardware', 3),
    ('Final Finishes', 'Kitchen', 'Backsplash Tile', 'Backsplash', 4),
    ('Final Finishes', 'Bathroom', 'Mirror', 'Accessories', 5),
    ('Final Finishes', 'Bathroom', 'Towel Bars', 'Accessories', 6)
) AS items(stage_name, area_name, material_name, category, sort_order)
WHERE t.name = 'ADU Construction'
AND NOT EXISTS (SELECT 1 FROM client_portal.material_templates mt WHERE mt.stage_template_id = t.id);

-- =============================================================================
-- MATERIAL TEMPLATES - New Addition Templates
-- =============================================================================

-- Master Suite Addition Materials
INSERT INTO client_portal.material_templates (stage_template_id, stage_name, area_name, material_name, material_category, sort_order)
SELECT t.id, items.stage_name, items.area_name, items.material_name, items.category, items.sort_order
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    -- Roof stage
    ('Roof', 'Exterior', 'HD Shingles with UV Protection', 'Roofing', 1),
    ('Roof', 'Exterior', 'Rain Gutters', 'Roofing', 2),
    ('Roof', 'Exterior', 'Downspouts', 'Roofing', 3),
    -- Stucco/Siding stage
    ('Stucco/Siding', 'Exterior', 'Stucco or Siding', 'Exterior', 1),
    -- Windows and Doors stage
    ('Windows and Doors', 'General', 'Windows', 'Windows', 1),
    ('Windows and Doors', 'General', 'Exterior Door', 'Doors', 2),
    ('Windows and Doors', 'General', 'Interior Doors', 'Doors', 3),
    -- Insulation stage
    ('Insulation', 'General', 'R-Value Insulation (Walls)', 'Insulation', 1),
    ('Insulation', 'General', 'R-Value Insulation (Attic)', 'Insulation', 2),
    -- Flooring stage
    ('Flooring', 'Bedroom', 'Hardwood/Carpet/Luxury Vinyl', 'Flooring', 1),
    ('Flooring', 'General', 'Baseboards', 'Trim', 2),
    -- Electrical (Rough) stage
    ('Electrical (Rough)', 'General', 'Recessed Lights', 'Lighting', 1),
    -- Bathroom tiles
    ('Shower/Tub Construction', 'Bathroom', 'Shower Wall Tile', 'Tile', 1),
    ('Shower/Tub Construction', 'Bathroom', 'Shower Floor Tile', 'Tile', 2),
    ('Shower/Tub Construction', 'Bathroom', 'Mosaic Tile (Niche)', 'Tile', 3),
    ('Bathroom Floor Tile', 'Bathroom', 'Floor Tile', 'Tile', 1),
    -- Vanity and Fixtures
    ('Vanity and Fixtures Installation', 'Bathroom', 'Vanity Cabinet', 'Cabinets', 1),
    ('Vanity and Fixtures Installation', 'Bathroom', 'Countertop', 'Countertops', 2),
    ('Vanity and Fixtures Installation', 'Bathroom', 'Toilet', 'Plumbing Fixtures', 3),
    ('Vanity and Fixtures Installation', 'Bathroom', 'Sink', 'Plumbing Fixtures', 4),
    ('Vanity and Fixtures Installation', 'Bathroom', 'Faucet', 'Plumbing Fixtures', 5),
    -- Bathroom Plumbing (Finish)
    ('Bathroom Plumbing (Finish)', 'Bathroom', 'Shower Valve', 'Plumbing Fixtures', 1),
    ('Bathroom Plumbing (Finish)', 'Bathroom', 'Shower Head', 'Plumbing Fixtures', 2),
    -- Bathroom Accessories
    ('Bathroom Accessories', 'Bathroom', 'Mirror', 'Accessories', 1),
    ('Bathroom Accessories', 'Bathroom', 'Towel Bars', 'Accessories', 2),
    ('Bathroom Accessories', 'Bathroom', 'Toilet Paper Holder', 'Accessories', 3),
    ('Bathroom Accessories', 'Bathroom', 'Grab Bars', 'Accessories', 4),
    -- Bathroom Electrical (Finish)
    ('Bathroom Electrical (Finish)', 'Bathroom', 'Vanity Light Fixture', 'Lighting', 1),
    -- Plumbing (Rough)
    ('Plumbing (Rough)', 'Bathroom', 'Exhaust Fan', 'Ventilation', 1)
) AS items(stage_name, area_name, material_name, category, sort_order)
WHERE t.name = 'Master Suite Addition'
AND NOT EXISTS (SELECT 1 FROM client_portal.material_templates mt WHERE mt.stage_template_id = t.id);

-- Guest Suite Addition Materials
INSERT INTO client_portal.material_templates (stage_template_id, stage_name, area_name, material_name, material_category, sort_order)
SELECT t.id, items.stage_name, items.area_name, items.material_name, items.category, items.sort_order
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    -- Roof stage
    ('Roof', 'Exterior', 'HD Shingles with UV Protection', 'Roofing', 1),
    ('Roof', 'Exterior', 'Rain Gutters', 'Roofing', 2),
    ('Roof', 'Exterior', 'Downspouts', 'Roofing', 3),
    -- Stucco/Siding stage
    ('Stucco/Siding', 'Exterior', 'Stucco or Siding', 'Exterior', 1),
    -- Windows and Doors stage
    ('Windows and Doors', 'General', 'Windows', 'Windows', 1),
    ('Windows and Doors', 'General', 'Exterior Door', 'Doors', 2),
    ('Windows and Doors', 'General', 'Interior Doors', 'Doors', 3),
    -- Insulation stage
    ('Insulation', 'General', 'R-Value Insulation (Walls)', 'Insulation', 1),
    ('Insulation', 'General', 'R-Value Insulation (Attic)', 'Insulation', 2),
    -- Flooring stage
    ('Flooring', 'Bedroom', 'Hardwood/Carpet/Luxury Vinyl', 'Flooring', 1),
    ('Flooring', 'General', 'Baseboards', 'Trim', 2),
    -- Electrical (Rough) stage
    ('Electrical (Rough)', 'General', 'Recessed Lights', 'Lighting', 1),
    -- Bathroom tiles
    ('Shower/Tub Construction', 'Bathroom', 'Tub/Shower Wall Tile', 'Tile', 1),
    ('Shower/Tub Construction', 'Bathroom', 'Mosaic Tile (Niche)', 'Tile', 2),
    ('Bathroom Floor Tile', 'Bathroom', 'Floor Tile', 'Tile', 1),
    -- Vanity and Fixtures
    ('Vanity and Fixtures Installation', 'Bathroom', 'Vanity Cabinet', 'Cabinets', 1),
    ('Vanity and Fixtures Installation', 'Bathroom', 'Countertop', 'Countertops', 2),
    ('Vanity and Fixtures Installation', 'Bathroom', 'Toilet', 'Plumbing Fixtures', 3),
    ('Vanity and Fixtures Installation', 'Bathroom', 'Sink', 'Plumbing Fixtures', 4),
    ('Vanity and Fixtures Installation', 'Bathroom', 'Faucet', 'Plumbing Fixtures', 5),
    ('Vanity and Fixtures Installation', 'Bathroom', 'Bathtub', 'Plumbing Fixtures', 6),
    -- Bathroom Plumbing (Finish)
    ('Bathroom Plumbing (Finish)', 'Bathroom', 'Tub/Shower Valve', 'Plumbing Fixtures', 1),
    ('Bathroom Plumbing (Finish)', 'Bathroom', 'Tub Spout/Shower Head', 'Plumbing Fixtures', 2),
    -- Bathroom Accessories
    ('Bathroom Accessories', 'Bathroom', 'Mirror', 'Accessories', 1),
    ('Bathroom Accessories', 'Bathroom', 'Towel Bars', 'Accessories', 2),
    ('Bathroom Accessories', 'Bathroom', 'Toilet Paper Holder', 'Accessories', 3),
    ('Bathroom Accessories', 'Bathroom', 'Grab Bars', 'Accessories', 4),
    -- Bathroom Electrical (Finish)
    ('Bathroom Electrical (Finish)', 'Bathroom', 'Vanity Light Fixture', 'Lighting', 1),
    -- Plumbing (Rough)
    ('Plumbing (Rough)', 'Bathroom', 'Exhaust Fan', 'Ventilation', 1)
) AS items(stage_name, area_name, material_name, category, sort_order)
WHERE t.name = 'Guest Suite Addition'
AND NOT EXISTS (SELECT 1 FROM client_portal.material_templates mt WHERE mt.stage_template_id = t.id);

-- Multi-Bedroom Addition Materials
INSERT INTO client_portal.material_templates (stage_template_id, stage_name, area_name, material_name, material_category, sort_order)
SELECT t.id, items.stage_name, items.area_name, items.material_name, items.category, items.sort_order
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    -- Roof stage
    ('Roof', 'Exterior', 'HD Shingles with UV Protection', 'Roofing', 1),
    ('Roof', 'Exterior', 'Rain Gutters', 'Roofing', 2),
    ('Roof', 'Exterior', 'Downspouts', 'Roofing', 3),
    -- Stucco/Siding stage
    ('Stucco/Siding', 'Exterior', 'Stucco or Siding', 'Exterior', 1),
    -- Windows and Doors stage
    ('Windows and Doors', 'General', 'Windows', 'Windows', 1),
    ('Windows and Doors', 'General', 'Exterior Door', 'Doors', 2),
    ('Windows and Doors', 'General', 'Interior Doors', 'Doors', 3),
    -- Insulation stage
    ('Insulation', 'General', 'R-Value Insulation (Walls)', 'Insulation', 1),
    ('Insulation', 'General', 'R-Value Insulation (Attic)', 'Insulation', 2),
    -- Flooring stage
    ('Flooring', 'Bedroom', 'Hardwood/Carpet/Luxury Vinyl', 'Flooring', 1),
    ('Flooring', 'General', 'Baseboards', 'Trim', 2),
    -- Electrical (Rough) stage
    ('Electrical (Rough)', 'General', 'Recessed Lights', 'Lighting', 1),
    -- Bathroom tiles
    ('Shower/Tub Construction', 'Bathroom', 'Tub Wall Tile', 'Tile', 1),
    ('Shower/Tub Construction', 'Bathroom', 'Mosaic Tile (Niche)', 'Tile', 2),
    ('Bathroom Floor Tile', 'Bathroom', 'Floor Tile', 'Tile', 1),
    -- Vanity and Fixtures
    ('Vanity and Fixtures Installation', 'Bathroom', 'Vanity Cabinet', 'Cabinets', 1),
    ('Vanity and Fixtures Installation', 'Bathroom', 'Countertop', 'Countertops', 2),
    ('Vanity and Fixtures Installation', 'Bathroom', 'Toilet', 'Plumbing Fixtures', 3),
    ('Vanity and Fixtures Installation', 'Bathroom', 'Sink', 'Plumbing Fixtures', 4),
    ('Vanity and Fixtures Installation', 'Bathroom', 'Faucet', 'Plumbing Fixtures', 5),
    ('Vanity and Fixtures Installation', 'Bathroom', 'Bathtub', 'Plumbing Fixtures', 6),
    -- Bathroom Plumbing (Finish)
    ('Bathroom Plumbing (Finish)', 'Bathroom', 'Tub Valve', 'Plumbing Fixtures', 1),
    ('Bathroom Plumbing (Finish)', 'Bathroom', 'Tub Spout', 'Plumbing Fixtures', 2),
    ('Bathroom Plumbing (Finish)', 'Bathroom', 'Shower Head', 'Plumbing Fixtures', 3),
    -- Bathroom Accessories
    ('Bathroom Accessories', 'Bathroom', 'Mirror', 'Accessories', 1),
    ('Bathroom Accessories', 'Bathroom', 'Towel Bars', 'Accessories', 2),
    ('Bathroom Accessories', 'Bathroom', 'Toilet Paper Holder', 'Accessories', 3),
    ('Bathroom Accessories', 'Bathroom', 'Grab Bars', 'Accessories', 4),
    -- Bathroom Electrical (Finish)
    ('Bathroom Electrical (Finish)', 'Bathroom', 'Vanity Light Fixture', 'Lighting', 1),
    -- Plumbing (Rough)
    ('Plumbing (Rough)', 'Bathroom', 'Exhaust Fan', 'Ventilation', 1)
) AS items(stage_name, area_name, material_name, category, sort_order)
WHERE t.name = 'Multi-Bedroom Addition'
AND NOT EXISTS (SELECT 1 FROM client_portal.material_templates mt WHERE mt.stage_template_id = t.id);

-- Family Wing Addition Materials (2 bathrooms)
INSERT INTO client_portal.material_templates (stage_template_id, stage_name, area_name, material_name, material_category, sort_order)
SELECT t.id, items.stage_name, items.area_name, items.material_name, items.category, items.sort_order
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    -- Roof stage
    ('Roof', 'Exterior', 'HD Shingles with UV Protection', 'Roofing', 1),
    ('Roof', 'Exterior', 'Rain Gutters', 'Roofing', 2),
    ('Roof', 'Exterior', 'Downspouts', 'Roofing', 3),
    -- Stucco/Siding stage
    ('Stucco/Siding', 'Exterior', 'Stucco or Siding', 'Exterior', 1),
    -- Windows and Doors stage
    ('Windows and Doors', 'General', 'Windows', 'Windows', 1),
    ('Windows and Doors', 'General', 'Exterior Door', 'Doors', 2),
    ('Windows and Doors', 'General', 'Interior Doors', 'Doors', 3),
    -- Insulation stage
    ('Insulation', 'General', 'R-Value Insulation (Walls)', 'Insulation', 1),
    ('Insulation', 'General', 'R-Value Insulation (Attic)', 'Insulation', 2),
    -- Flooring stage
    ('Flooring', 'Bedroom', 'Hardwood/Carpet/Luxury Vinyl', 'Flooring', 1),
    ('Flooring', 'General', 'Baseboards', 'Trim', 2),
    -- Electrical (Rough) stage
    ('Electrical (Rough)', 'General', 'Recessed Lights', 'Lighting', 1),
    -- Bathroom 1 tiles (walk-in shower)
    ('Bathroom 1 - Shower/Tub Construction', 'Bathroom 1', 'Shower Wall Tile', 'Tile', 1),
    ('Bathroom 1 - Shower/Tub Construction', 'Bathroom 1', 'Shower Floor Tile', 'Tile', 2),
    ('Bathroom 1 - Shower/Tub Construction', 'Bathroom 1', 'Mosaic Tile (Niche)', 'Tile', 3),
    ('Bathroom 1 - Floor Tile', 'Bathroom 1', 'Floor Tile', 'Tile', 1),
    -- Bathroom 1 Vanity and Fixtures
    ('Bathroom 1 - Vanity and Fixtures', 'Bathroom 1', 'Vanity Cabinet', 'Cabinets', 1),
    ('Bathroom 1 - Vanity and Fixtures', 'Bathroom 1', 'Countertop', 'Countertops', 2),
    ('Bathroom 1 - Vanity and Fixtures', 'Bathroom 1', 'Toilet', 'Plumbing Fixtures', 3),
    ('Bathroom 1 - Vanity and Fixtures', 'Bathroom 1', 'Sink', 'Plumbing Fixtures', 4),
    ('Bathroom 1 - Vanity and Fixtures', 'Bathroom 1', 'Faucet', 'Plumbing Fixtures', 5),
    -- Bathroom 1 Plumbing (Finish)
    ('Bathroom 1 - Plumbing (Finish)', 'Bathroom 1', 'Shower Valve', 'Plumbing Fixtures', 1),
    ('Bathroom 1 - Plumbing (Finish)', 'Bathroom 1', 'Shower Head', 'Plumbing Fixtures', 2),
    -- Bathroom 1 Accessories
    ('Bathroom 1 - Accessories', 'Bathroom 1', 'Mirror', 'Accessories', 1),
    ('Bathroom 1 - Accessories', 'Bathroom 1', 'Towel Bars', 'Accessories', 2),
    ('Bathroom 1 - Accessories', 'Bathroom 1', 'Toilet Paper Holder', 'Accessories', 3),
    ('Bathroom 1 - Accessories', 'Bathroom 1', 'Grab Bars', 'Accessories', 4),
    -- Bathroom 1 Electrical (Finish)
    ('Bathroom 1 - Electrical (Finish)', 'Bathroom 1', 'Vanity Light Fixture', 'Lighting', 1),
    -- Bathroom 2 tiles (bathtub)
    ('Bathroom 2 - Shower/Tub Construction', 'Bathroom 2', 'Tub Wall Tile', 'Tile', 1),
    ('Bathroom 2 - Shower/Tub Construction', 'Bathroom 2', 'Mosaic Tile (Niche)', 'Tile', 2),
    ('Bathroom 2 - Shower/Tub Construction', 'Bathroom 2', 'Bathtub', 'Plumbing Fixtures', 3),
    ('Bathroom 2 - Floor Tile', 'Bathroom 2', 'Floor Tile', 'Tile', 1),
    -- Bathroom 2 Vanity and Fixtures
    ('Bathroom 2 - Vanity and Fixtures', 'Bathroom 2', 'Vanity Cabinet', 'Cabinets', 1),
    ('Bathroom 2 - Vanity and Fixtures', 'Bathroom 2', 'Countertop', 'Countertops', 2),
    ('Bathroom 2 - Vanity and Fixtures', 'Bathroom 2', 'Toilet', 'Plumbing Fixtures', 3),
    ('Bathroom 2 - Vanity and Fixtures', 'Bathroom 2', 'Sink', 'Plumbing Fixtures', 4),
    ('Bathroom 2 - Vanity and Fixtures', 'Bathroom 2', 'Faucet', 'Plumbing Fixtures', 5),
    -- Bathroom 2 Plumbing (Finish)
    ('Bathroom 2 - Plumbing (Finish)', 'Bathroom 2', 'Tub Valve', 'Plumbing Fixtures', 1),
    ('Bathroom 2 - Plumbing (Finish)', 'Bathroom 2', 'Tub Spout', 'Plumbing Fixtures', 2),
    ('Bathroom 2 - Plumbing (Finish)', 'Bathroom 2', 'Shower Head', 'Plumbing Fixtures', 3),
    -- Bathroom 2 Accessories
    ('Bathroom 2 - Accessories', 'Bathroom 2', 'Mirror', 'Accessories', 1),
    ('Bathroom 2 - Accessories', 'Bathroom 2', 'Towel Bars', 'Accessories', 2),
    ('Bathroom 2 - Accessories', 'Bathroom 2', 'Toilet Paper Holder', 'Accessories', 3),
    ('Bathroom 2 - Accessories', 'Bathroom 2', 'Grab Bars', 'Accessories', 4),
    -- Bathroom 2 Electrical (Finish)
    ('Bathroom 2 - Electrical (Finish)', 'Bathroom 2', 'Vanity Light Fixture', 'Lighting', 1),
    -- Plumbing (Rough) - both bathrooms
    ('Plumbing (Rough)', 'Bathroom 1', 'Exhaust Fan', 'Ventilation', 1),
    ('Plumbing (Rough)', 'Bathroom 2', 'Exhaust Fan', 'Ventilation', 2)
) AS items(stage_name, area_name, material_name, category, sort_order)
WHERE t.name = 'Family Wing Addition'
AND NOT EXISTS (SELECT 1 FROM client_portal.material_templates mt WHERE mt.stage_template_id = t.id);

-- Kitchen Extension Materials
INSERT INTO client_portal.material_templates (stage_template_id, stage_name, area_name, material_name, material_category, sort_order)
SELECT t.id, items.stage_name, items.area_name, items.material_name, items.category, items.sort_order
FROM client_portal.stage_templates t
CROSS JOIN (VALUES
    -- Roof stage
    ('Roof', 'Exterior', 'HD Shingles with UV Protection', 'Roofing', 1),
    ('Roof', 'Exterior', 'Rain Gutters', 'Roofing', 2),
    ('Roof', 'Exterior', 'Downspouts', 'Roofing', 3),
    -- Stucco/Siding stage
    ('Stucco/Siding', 'Exterior', 'Stucco or Siding', 'Exterior', 1),
    -- Windows and Doors stage
    ('Windows and Doors', 'General', 'Windows', 'Windows', 1),
    ('Windows and Doors', 'General', 'Exterior Door', 'Doors', 2),
    ('Windows and Doors', 'General', 'Sliding Door', 'Doors', 3),
    -- Insulation stage
    ('Insulation', 'General', 'R-Value Insulation (Walls)', 'Insulation', 1),
    ('Insulation', 'General', 'R-Value Insulation (Attic)', 'Insulation', 2),
    -- Flooring stage
    ('Flooring', 'Kitchen', 'Hardwood/Engineered Wood/Luxury Vinyl', 'Flooring', 1),
    ('Flooring', 'General', 'Baseboards', 'Trim', 2),
    -- Electrical (Rough) stage
    ('Electrical (Rough)', 'Kitchen', 'Recessed Lights (6")', 'Lighting', 1),
    ('Electrical (Rough)', 'Kitchen', 'Undercabinet LED Lights', 'Lighting', 2),
    -- Kitchen Cabinet Installation
    ('Kitchen Cabinet Installation', 'Kitchen', 'Kitchen Cabinets', 'Cabinets', 1),
    ('Kitchen Cabinet Installation', 'Kitchen', 'Island Cabinets', 'Cabinets', 2),
    ('Kitchen Cabinet Installation', 'Kitchen', 'Toe Kicks', 'Trim', 3),
    ('Kitchen Cabinet Installation', 'Kitchen', 'Crown Molding', 'Trim', 4),
    -- Kitchen Countertop Installation
    ('Kitchen Countertop Installation', 'Kitchen', 'Countertop Slabs (Granite/Quartz/Marble)', 'Countertops', 1),
    -- Kitchen Backsplash
    ('Kitchen Backsplash', 'Kitchen', 'Backsplash Tile (Stone/Mosaic)', 'Backsplash', 1),
    -- Kitchen Appliance Installation
    ('Kitchen Appliance Installation', 'Kitchen', 'Cooktop', 'Appliances', 1),
    ('Kitchen Appliance Installation', 'Kitchen', 'Microwave', 'Appliances', 2),
    ('Kitchen Appliance Installation', 'Kitchen', 'Garbage Disposal', 'Appliances', 3),
    ('Kitchen Appliance Installation', 'Kitchen', 'Oven', 'Appliances', 4),
    ('Kitchen Appliance Installation', 'Kitchen', 'Refrigerator', 'Appliances', 5),
    ('Kitchen Appliance Installation', 'Kitchen', 'Dishwasher', 'Appliances', 6),
    -- Kitchen Finish Work
    ('Kitchen Finish Work', 'Kitchen', 'Kitchen Sink', 'Plumbing Fixtures', 1),
    ('Kitchen Finish Work', 'Kitchen', 'Kitchen Faucet', 'Plumbing Fixtures', 2),
    -- Kitchen Hood and Ventilation
    ('Kitchen Hood and Ventilation', 'Kitchen', 'Range Hood', 'Appliances', 1)
) AS items(stage_name, area_name, material_name, category, sort_order)
WHERE t.name = 'Kitchen Extension'
AND NOT EXISTS (SELECT 1 FROM client_portal.material_templates mt WHERE mt.stage_template_id = t.id);

-- =============================================================================
-- VERSION TRACKING
-- =============================================================================

-- Create alembic_version table if it doesn't exist
CREATE TABLE IF NOT EXISTS client_portal.alembic_version (
    version_num VARCHAR(255) NOT NULL PRIMARY KEY
);

INSERT INTO client_portal.alembic_version(version_num)
VALUES ('seed_production_templates_001')
ON CONFLICT (version_num) DO NOTHING;

COMMIT;
