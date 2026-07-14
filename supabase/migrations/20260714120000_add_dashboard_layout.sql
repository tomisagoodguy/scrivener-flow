-- Add dashboard_layout column to user_settings for per-user widget visibility/order customization.
-- NULL means the user has never customized their layout; app code falls back to DEFAULT_DASHBOARD_LAYOUT.
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS dashboard_layout JSONB;
