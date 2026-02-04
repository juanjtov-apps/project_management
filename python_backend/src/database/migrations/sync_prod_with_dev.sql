-- ============================================================================
-- PRODUCTION DATABASE MIGRATION
-- Syncs PROD schema with DEV for deployment
-- Generated: 2026-01-20
-- ============================================================================
--
-- DIFFERENCES FOUND:
--   1. users.assigned_project_id - Missing column in PROD (client portal feature)
--   2. idx_users_assigned_project_id - Missing index in PROD
--   3. projects.location - DEV allows NULL, PROD has NOT NULL
--
-- RUN THIS ON PRODUCTION DATABASE BEFORE DEPLOYING
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ADD assigned_project_id COLUMN TO users TABLE
-- ============================================================================
-- This column links client users to their assigned project for the client portal

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'assigned_project_id'
    ) THEN
        ALTER TABLE users ADD COLUMN assigned_project_id varchar NULL;
        RAISE NOTICE 'Added column: users.assigned_project_id';
    ELSE
        RAISE NOTICE 'Column users.assigned_project_id already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- 2. ADD FOREIGN KEY CONSTRAINT
-- ============================================================================
-- Links assigned_project_id to projects.id with ON DELETE SET NULL

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_users_assigned_project'
    ) THEN
        ALTER TABLE users
            ADD CONSTRAINT fk_users_assigned_project
            FOREIGN KEY (assigned_project_id)
            REFERENCES projects(id)
            ON DELETE SET NULL;
        RAISE NOTICE 'Added foreign key: fk_users_assigned_project';
    ELSE
        RAISE NOTICE 'Foreign key fk_users_assigned_project already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- 3. CREATE INDEX ON assigned_project_id
-- ============================================================================
-- Partial index for better query performance on client portal lookups

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_users_assigned_project_id'
    ) THEN
        CREATE INDEX idx_users_assigned_project_id
            ON public.users USING btree (assigned_project_id)
            WHERE (assigned_project_id IS NOT NULL);
        RAISE NOTICE 'Created index: idx_users_assigned_project_id';
    ELSE
        RAISE NOTICE 'Index idx_users_assigned_project_id already exists, skipping';
    END IF;
END $$;

-- ============================================================================
-- 4. ALTER projects.location TO ALLOW NULL
-- ============================================================================
-- Makes location optional for projects (matches DEV schema)

DO $$
DECLARE
    is_nullable text;
BEGIN
    SELECT c.is_nullable INTO is_nullable
    FROM information_schema.columns c
    WHERE c.table_name = 'projects' AND c.column_name = 'location';

    IF is_nullable = 'NO' THEN
        ALTER TABLE projects ALTER COLUMN location DROP NOT NULL;
        RAISE NOTICE 'Modified column: projects.location now allows NULL';
    ELSE
        RAISE NOTICE 'Column projects.location already allows NULL, skipping';
    END IF;
END $$;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these after migration to verify changes

SELECT 'VERIFICATION' as status;

-- Check users.assigned_project_id exists
SELECT
    'users.assigned_project_id' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'assigned_project_id'
    ) THEN 'OK' ELSE 'MISSING' END as status;

-- Check foreign key exists
SELECT
    'fk_users_assigned_project' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_users_assigned_project'
    ) THEN 'OK' ELSE 'MISSING' END as status;

-- Check index exists
SELECT
    'idx_users_assigned_project_id' as check_item,
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE indexname = 'idx_users_assigned_project_id'
    ) THEN 'OK' ELSE 'MISSING' END as status;

-- Check projects.location is nullable
SELECT
    'projects.location nullable' as check_item,
    CASE WHEN is_nullable = 'YES' THEN 'OK' ELSE 'NOT NULLABLE' END as status
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'location';

COMMIT;

-- ============================================================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================================================
-- Uncomment and run if you need to revert changes:
--
-- BEGIN;
-- DROP INDEX IF EXISTS idx_users_assigned_project_id;
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS fk_users_assigned_project;
-- ALTER TABLE users DROP COLUMN IF EXISTS assigned_project_id;
-- ALTER TABLE projects ALTER COLUMN location SET NOT NULL;
-- COMMIT;
