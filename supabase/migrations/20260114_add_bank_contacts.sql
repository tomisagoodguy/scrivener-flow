-- Create bank_contacts table
CREATE TABLE IF NOT EXISTS bank_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_name TEXT NOT NULL,
    branch_name TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    loan_conditions TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE bank_contacts ENABLE ROW LEVEL SECURITY;

-- Shared Access Policies (Wiki-style: Everyone can view and edit)
-- 1. View: Allow all authenticated users
CREATE POLICY "Allow all authenticated users to view banks" ON bank_contacts
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. Insert: Allow all authenticated users
CREATE POLICY "Allow all authenticated users to insert banks" ON bank_contacts
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 3. Update: Allow all authenticated users
CREATE POLICY "Allow all authenticated users to update banks" ON bank_contacts
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Delete: Allow all authenticated users (or restrict to admin? Let's allow all for now per request)
CREATE POLICY "Allow all authenticated users to delete banks" ON bank_contacts
    FOR DELETE
    TO authenticated
    USING (true);

-- Auto-update trigger for updated_at
CREATE TRIGGER update_bank_contacts_modtime
    BEFORE UPDATE ON bank_contacts
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
