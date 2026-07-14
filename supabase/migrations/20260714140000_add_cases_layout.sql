-- Add cases_layout column to user_settings for per-user /cases page widget visibility/order customization.
-- NULL means the user has never customized their layout; app code falls back to DEFAULT_CASES_LAYOUT.
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cases_layout JSONB;
