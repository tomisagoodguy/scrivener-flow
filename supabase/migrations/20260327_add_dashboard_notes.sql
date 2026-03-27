ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS dashboard_notes JSONB DEFAULT '[]'::jsonb;
