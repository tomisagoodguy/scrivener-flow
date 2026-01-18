-- Clean up existing tables if they exist
DROP TABLE IF EXISTS bank_contacts CASCADE;
DROP TABLE IF EXISTS financials CASCADE;
DROP TABLE IF EXISTS milestones CASCADE;
DROP TABLE IF EXISTS cases CASCADE;

-- 1. Reference Tables
CREATE TABLE bank_contacts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bank_name TEXT NOT NULL,
    branch_name TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Main Cases Table
CREATE TABLE cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 1.1 Identity & Status
    case_number TEXT NOT NULL UNIQUE, -- e.g., "AA12345678"
    legacy_id TEXT, -- e.g., for migration
    status TEXT NOT NULL CHECK (status IN ('辦理中', '結案', '解約', 'Processing', 'Closed', 'Cancelled', 'Pending')),
    handler TEXT, -- e.g., "子翔"
    
    -- 1.2 People
    buyer_name TEXT NOT NULL,
    buyer_phone TEXT,
    seller_name TEXT NOT NULL,
    seller_phone TEXT,
    agent_name TEXT,
    
    -- 1.3 Property Info
    city TEXT NOT NULL,
    district TEXT,
    address TEXT,
    property_type TEXT CHECK (property_type IN ('Apartment', 'Building', 'Land', 'Parking')),
    build_type TEXT CHECK (build_type IN ('New_System', 'Old_System', 'Old_System_No_Household')),
    
    -- 4. Logics & Checks (Boolean Flags & Notes)
    -- 4.1 Flags
    is_back_rent BOOLEAN DEFAULT FALSE,
    has_tenant BOOLEAN DEFAULT FALSE,
    is_radiation_check BOOLEAN DEFAULT FALSE,
    is_sea_sand_check BOOLEAN DEFAULT FALSE,
    
    -- 4.2 Legal Checks
    check_priority_purchase BOOLEAN DEFAULT FALSE,
    check_second_mortgage BOOLEAN DEFAULT FALSE,
    check_seal_certificate BOOLEAN DEFAULT FALSE,
    
    -- 4.3 Notes
    notes TEXT,
    pending_tasks TEXT,
    bank_contact_notes TEXT,

    -- Legacy/Frontend compatibility columns (if needed directly in cases)
    tax_type TEXT, 
    buyer_loan_bank TEXT, 
    seller_loan_bank TEXT
);

-- 3. Milestones Table (1:1 with Cases)
CREATE TABLE milestones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    
    -- 2.1 The Big 5
    contract_date DATE,
    seal_date DATE,
    tax_payment_date DATE,
    transfer_date DATE,
    handover_date DATE,
    
    -- 2.2 Operational Dates
    balance_payment_date DATE, -- Added this missing one
    sign_diff_days INTEGER,
    redemption_date DATE,
    tax_filing_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Financials Table (1:1 with Cases)
CREATE TABLE financials (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    
    -- 3.1 Transaction Amounts
    total_price NUMERIC, -- Decimal
    pre_collected_fee NUMERIC,
    balance_payment NUMERIC,
    
    -- 3.2 Tax Settings
    vat_type TEXT CHECK (vat_type IN ('General', 'Self_Use', 'Inheritance', '一般', '自用', '繼承')),
    tax_house_land BOOLEAN DEFAULT FALSE,
    tax_repurchase BOOLEAN DEFAULT FALSE,
    
    -- 3.3 Loans (merged here as per discussion notes 3.3)
    buyer_bank TEXT, -- Could reference bank_contacts(id) in future but keeping as text for now
    buyer_loan_amount NUMERIC,
    seller_bank TEXT,
    seller_redemption_amount NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bank_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE financials ENABLE ROW LEVEL SECURITY;

-- Simple Policies for Demo
CREATE POLICY "Public Read/Write BankContacts" ON bank_contacts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Cases" ON cases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Milestones" ON milestones FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public Read/Write Financials" ON financials FOR ALL USING (true) WITH CHECK (true);
