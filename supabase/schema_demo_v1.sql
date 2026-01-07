-- Demo Schema based on SCHEMA_DISCUSSION.md (v1.0)

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
    status TEXT NOT NULL CHECK (status IN ('Processing', 'Closed', 'Cancelled', 'Pending')),
    handler TEXT, -- e.g., "子翔"
    
    -- 1.2 People
    buyer_name TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    agent_name TEXT,
    
    -- 1.3 Property Info
    city TEXT NOT NULL,
    district TEXT NOT NULL,
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
    bank_contact_notes TEXT
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
    sign_diff_days INTEGER,
    redemption_date DATE,
    tax_filing_date DATE
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
    vat_type TEXT CHECK (vat_type IN ('General', 'Self_Use', 'Inheritance')),
    tax_house_land BOOLEAN DEFAULT FALSE,
    tax_repurchase BOOLEAN DEFAULT FALSE,
    
    -- 3.3 Loans (merged here as per discussion notes 3.3)
    buyer_bank TEXT, -- Could reference bank_contacts(id) in future but keeping as text for now
    buyer_loan_amount NUMERIC,
    seller_bank TEXT,
    seller_redemption_amount NUMERIC
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

-- Insert Dummy Data for Demo
INSERT INTO bank_contacts (bank_name, branch_name, contact_person, phone, note) 
VALUES ('華南銀行', '士林分行', '王大明', '0912345678', '核貸快');

DO $$
DECLARE
    new_case_id UUID;
BEGIN
    INSERT INTO cases (
        case_number, status, handler,
        buyer_name, seller_name, agent_name,
        city, district, address, property_type, build_type,
        notes
    ) VALUES (
        'DEMO-2024001', 'Processing', 'DemoUser',
        '張三 (買)', '李四 (賣)', '王五 (仲)',
        '台北市', '大安區', '信義路三段100號', 'Building', 'New_System',
        '這是一筆測試案件'
    ) RETURNING id INTO new_case_id;

    INSERT INTO milestones (case_id, contract_date, sign_diff_days)
    VALUES (new_case_id, '2024-01-01', 3);

    INSERT INTO financials (case_id, total_price, vat_type, buyer_bank, buyer_loan_amount)
    VALUES (new_case_id, 25000000, 'Self_Use', '華南銀行', 20000000);
END $$;
