-- Fix missing column issue
ALTER TABLE cases ADD COLUMN IF NOT EXISTS is_back_rent BOOLEAN DEFAULT FALSE;

-- Refresh schema cache
NOTIFY pgrst, 'reload config';
