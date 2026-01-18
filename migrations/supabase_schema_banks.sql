-- Create the Banks table to store loan conditions and redemption info
CREATE TABLE IF NOT EXISTS public.banks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    -- Basic Info
    name TEXT NOT NULL,         -- 銀行名稱 (e.g. 富邦)
    branch TEXT,               -- 分行 (e.g. 內科)
    
    -- Loan Conditions (The core request: Multi-line text for rules)
    loan_conditions TEXT,       -- 放款條件/規則 (1. ... 2. ...)
    
    -- Redemption Guide (Combined from previous JSON fields)
    redemption_phone TEXT,          -- 客服電話
    redemption_account TEXT,        -- 匯款專戶
    redemption_days TEXT,           -- 領取天數
    redemption_location TEXT,       -- 領取地點
    redemption_note TEXT,           -- 備註 (雙證件等)

    -- Contacts (Stored as JSONB array for flexibility)
    -- Structure: [{ name: "JS", email: "...", phone: "..." }]
    contacts JSONB DEFAULT '[]'::jsonb,

    -- Metadata
    user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;

-- Policies (Open for all authenticated users to read/write for now - Team Knowledge Base)
CREATE POLICY "Enable read access for all users" ON public.banks FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.banks FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.banks FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.banks FOR DELETE USING (auth.role() = 'authenticated');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banks TO authenticated;
GRANT SELECT ON public.banks TO anon;
