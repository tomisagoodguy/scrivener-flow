-- 案件分享駁回：分享對象可自行駁回分享（狀態式軟移除），擁有者可查詢駁回紀錄並重新分享
-- 對應 openspec/changes/case-share-rejection/design.md

-- 1. case_shares 新增 status / rejected_at 欄位
ALTER TABLE case_shares
    ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'rejected')),
    ADD COLUMN IF NOT EXISTS rejected_at timestamptz NULL;

-- 2. 分享對象可更新自己那筆分享的狀態（駁回）
DROP POLICY IF EXISTS "case_shares_reject_own" ON case_shares;
CREATE POLICY "case_shares_reject_own" ON case_shares
    FOR UPDATE USING (
        shared_with = auth.uid()
    ) WITH CHECK (
        shared_with = auth.uid()
    );

-- 3. 案件擁有者可更新分享狀態（重新分享），比照既有 case_shares_delete 條件
DROP POLICY IF EXISTS "case_shares_update_by_owner" ON case_shares;
CREATE POLICY "case_shares_update_by_owner" ON case_shares
    FOR UPDATE USING (
        public.owns_case(case_id)
    ) WITH CHECK (
        public.owns_case(case_id)
    );

-- 4. 可見性收斂函式加上 status = 'active' 條件
-- 簽名與 SECURITY DEFINER / GRANT EXECUTE 保持不變，cases/milestones/financials/redemption_steps
-- 的既有 policy 都呼叫這個函式，改這裡即可讓駁回的分享在全部關聯表格一起失效。
CREATE OR REPLACE FUNCTION public.is_case_shared_with_me(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM case_shares
        WHERE case_shares.case_id = p_case_id
          AND case_shares.shared_with = auth.uid()
          AND case_shares.status = 'active'
    );
$$;
