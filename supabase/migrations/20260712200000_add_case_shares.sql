-- 案件唯讀分享：新增 case_shares 表記錄分享關係，並擴充既有 SELECT Policy
-- 對應 openspec/changes/case-readonly-share/design.md

-- 1. case_shares 表
CREATE TABLE IF NOT EXISTS case_shares (
    id          uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id     uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    shared_with uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_by   uuid NOT NULL REFERENCES auth.users(id),
    created_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT case_shares_case_user_unique UNIQUE (case_id, shared_with)
);

CREATE INDEX IF NOT EXISTS idx_case_shares_case_id ON case_shares(case_id);
CREATE INDEX IF NOT EXISTS idx_case_shares_shared_with ON case_shares(shared_with);

-- 2. case_shares 自身的 RLS
ALTER TABLE case_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case_shares_select" ON case_shares
    FOR SELECT USING (
        shared_with = auth.uid()
        OR EXISTS (SELECT 1 FROM cases WHERE cases.id = case_shares.case_id AND cases.user_id = auth.uid())
    );

CREATE POLICY "case_shares_insert" ON case_shares
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM cases WHERE cases.id = case_shares.case_id AND cases.user_id = auth.uid())
    );

CREATE POLICY "case_shares_delete" ON case_shares
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM cases WHERE cases.id = case_shares.case_id AND cases.user_id = auth.uid())
    );

-- 3. 擴充 cases 的 SELECT Policy，讓被分享者可讀取（INSERT/UPDATE/DELETE 維持不動）
DROP POLICY IF EXISTS "Users can view own cases" ON cases;
CREATE POLICY "Users can view own cases" ON cases FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM case_shares WHERE case_shares.case_id = cases.id AND case_shares.shared_with = auth.uid())
);

-- 4. 擴充 milestones 的 SELECT Policy
DROP POLICY IF EXISTS "Users can view own milestones" ON milestones;
CREATE POLICY "Users can view own milestones" ON milestones FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = milestones.case_id AND cases.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM case_shares WHERE case_shares.case_id = milestones.case_id AND case_shares.shared_with = auth.uid())
);

-- 5. 擴充 financials 的 SELECT Policy
DROP POLICY IF EXISTS "Users can view own financials" ON financials;
CREATE POLICY "Users can view own financials" ON financials FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = financials.case_id AND cases.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM case_shares WHERE case_shares.case_id = financials.case_id AND case_shares.shared_with = auth.uid())
);

-- 6. 擴充 redemption_steps 的 SELECT Policy
-- 注意：redemption_steps 原本以自身的 user_id 欄位判斷（非透過 cases join），
-- 分享情境下改以 case_id 對照 case_shares。
DROP POLICY IF EXISTS "redemption_steps_select" ON redemption_steps;
CREATE POLICY "redemption_steps_select" ON redemption_steps FOR SELECT USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM case_shares WHERE case_shares.case_id = redemption_steps.case_id AND case_shares.shared_with = auth.uid())
);
