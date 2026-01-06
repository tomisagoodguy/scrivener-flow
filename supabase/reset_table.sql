-- WARNING: This will DELETE ALL DATA in the cases table
DROP TABLE IF EXISTS cases;

-- Recreate table with all correct columns
CREATE TABLE cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Basic Info
    case_number TEXT NOT NULL,
    city_area TEXT NOT NULL,
    buyer TEXT NOT NULL,
    seller TEXT NOT NULL,
    buyer_loan_bank TEXT,
    seller_loan_bank TEXT,
    tax_type TEXT DEFAULT '一般',
    
    -- Dates
    contract_date DATE,
    seal_date DATE,
    tax_payment_date DATE,
    transfer_date DATE,
    handover_date DATE,
    
    -- Status & Notes
    status TEXT NOT NULL DEFAULT '辦理中',
    notes TEXT,
    is_back_rent BOOLEAN DEFAULT FALSE,
    
    -- Future proofing
    custom_fields JSONB DEFAULT '{}'::jsonb
);

-- Re-enable security
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read/write for all users" ON cases
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Force refresh cache
NOTIFY pgrst, 'reload config';
