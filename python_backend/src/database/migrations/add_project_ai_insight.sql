-- Add AI insight columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ai_insight_text text;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS ai_insight_updated_at timestamptz;
