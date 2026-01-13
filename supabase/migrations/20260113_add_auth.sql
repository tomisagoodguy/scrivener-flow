-- 1. Add user_id column
ALTER TABLE cases ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);

-- 2. Enable RLS
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE financials ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies

-- Cases
DROP POLICY IF EXISTS "Users can view own cases" ON cases;
CREATE POLICY "Users can view own cases" ON cases FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cases" ON cases;
CREATE POLICY "Users can insert own cases" ON cases FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cases" ON cases;
CREATE POLICY "Users can update own cases" ON cases FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cases" ON cases;
CREATE POLICY "Users can delete own cases" ON cases FOR DELETE USING (auth.uid() = user_id);

-- Milestones (Joined)
DROP POLICY IF EXISTS "Users can view own milestones" ON milestones;
CREATE POLICY "Users can view own milestones" ON milestones FOR SELECT USING (
    exists (select 1 from cases where cases.id = milestones.case_id and cases.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert own milestones" ON milestones;
CREATE POLICY "Users can insert own milestones" ON milestones FOR INSERT WITH CHECK (
    exists (select 1 from cases where cases.id = milestones.case_id and cases.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update own milestones" ON milestones;
CREATE POLICY "Users can update own milestones" ON milestones FOR UPDATE USING (
    exists (select 1 from cases where cases.id = milestones.case_id and cases.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete own milestones" ON milestones;
CREATE POLICY "Users can delete own milestones" ON milestones FOR DELETE USING (
    exists (select 1 from cases where cases.id = milestones.case_id and cases.user_id = auth.uid())
);

-- Financials (Joined)
DROP POLICY IF EXISTS "Users can view own financials" ON financials;
CREATE POLICY "Users can view own financials" ON financials FOR SELECT USING (
    exists (select 1 from cases where cases.id = financials.case_id and cases.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert own financials" ON financials;
CREATE POLICY "Users can insert own financials" ON financials FOR INSERT WITH CHECK (
    exists (select 1 from cases where cases.id = financials.case_id and cases.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update own financials" ON financials;
CREATE POLICY "Users can update own financials" ON financials FOR UPDATE USING (
    exists (select 1 from cases where cases.id = financials.case_id and cases.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete own financials" ON financials;
CREATE POLICY "Users can delete own financials" ON financials FOR DELETE USING (
    exists (select 1 from cases where cases.id = financials.case_id and cases.user_id = auth.uid())
);
