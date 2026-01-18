ALTER TABLE cases ADD COLUMN IF NOT EXISTS is_on_hold boolean DEFAULT false;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS on_hold_reason text;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
