-- Migration: Make location field nullable in projects table
-- Date: 2026-01-07

ALTER TABLE projects ALTER COLUMN location DROP NOT NULL;
