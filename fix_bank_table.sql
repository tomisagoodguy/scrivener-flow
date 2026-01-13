-- Fix missing columns for bank_contacts
ALTER TABLE bank_contacts 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE bank_contacts 
ADD COLUMN IF NOT EXISTS last_updated_by UUID REFERENCES auth.users(id);

-- Ensure RLS is enabled just in case
ALTER TABLE bank_contacts ENABLE ROW LEVEL SECURITY;

-- Re-apply policies if they don't exist (using DO block to avoid errors if they exist is complex in raw SQL UI sometimes, 
-- but straightforward creation with diverse names or dropping first works. 
-- Since policies usually error if exist, let's just focus on columns first.)
