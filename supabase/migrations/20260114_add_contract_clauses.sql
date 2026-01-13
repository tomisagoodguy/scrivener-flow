-- Create contract_clauses table
CREATE TABLE IF NOT EXISTS contract_clauses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL, -- 使用情境 (Usage Scenario)
    content TEXT NOT NULL, -- 相對應條文 (Clause Content)
    category TEXT DEFAULT '一般', -- 分類 (Category)
    tags TEXT[], -- 標籤
    usage_count INTEGER DEFAULT 0, -- 使用次數 (可做熱門排序)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE contract_clauses ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all authenticated users to read/write (Shared Library)
CREATE POLICY "Allow all authenticated users to full access clauses" ON contract_clauses
    FOR ALL TO authenticated
    USING (true)
    WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_contract_clauses_modtime
    BEFORE UPDATE ON contract_clauses
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
