-- Add missing columns to 'cases' table
ALTER TABLE cases ADD COLUMN IF NOT EXISTS todos JSONB DEFAULT '{}'::jsonb;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS buyer_phone TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS seller_phone TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS has_keyed_overtime BOOLEAN DEFAULT FALSE;

-- Add missing columns to 'milestones' table
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS contract_amount NUMERIC;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS contract_method TEXT;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS sign_diff_amount NUMERIC;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS sign_diff_date DATE;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS seal_amount NUMERIC;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS seal_method TEXT;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS tax_amount NUMERIC;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS tax_method TEXT;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS balance_amount NUMERIC;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS balance_method TEXT;
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS transfer_note TEXT;
