-- Comprehensive fix for bank_contacts table columns
-- Run this in Supabase SQL Editor to ensure all columns exist

-- 1. Ensure table exists (in case it was deleted)
CREATE TABLE IF NOT EXISTS bank_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- 2. Add all required columns safely (IF NOT EXISTS)
ALTER TABLE bank_contacts ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE bank_contacts ADD COLUMN IF NOT EXISTS branch_name TEXT;
ALTER TABLE bank_contacts ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE bank_contacts ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE bank_contacts ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE bank_contacts ADD COLUMN IF NOT EXISTS loan_conditions TEXT;
ALTER TABLE bank_contacts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE bank_contacts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE bank_contacts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE bank_contacts ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES auth.users(id);

-- 3. Force schema cache reload (usually happens automatically, but this helps)
NOTIFY pgrst, 'reload config';
