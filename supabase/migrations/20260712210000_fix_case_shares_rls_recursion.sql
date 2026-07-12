-- 修正 case_shares 上線後 cases / case_shares 政策互相查詢造成的 RLS 無限遞迴（42P17）
-- 對應問題：cases 的 SELECT policy 查 case_shares，case_shares 的 policy 又查 cases，
-- 兩者互相觸發對方的 RLS 評估，形成遞迴迴圈導致整個查詢失敗（案件全部消失）。
--
-- 做法：用 SECURITY DEFINER 函式包住跨表判斷。函式 owner（migration 執行者）
-- 預設會繞過自己建立的 RLS（未下 FORCE ROW LEVEL SECURITY），
-- 因此政策改成互相呼叫「函式」而非互相呼叫「帶 RLS 的查詢」，藉此打破遞迴鏈。

CREATE OR REPLACE FUNCTION public.owns_case(p_case_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM cases
        WHERE cases.id = p_case_id
          AND cases.user_id = auth.uid()
    );
$$;

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
    );
$$;

GRANT EXECUTE ON FUNCTION public.owns_case(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_case_shared_with_me(uuid) TO authenticated;

-- cases SELECT
DROP POLICY IF EXISTS "Users can view own cases" ON cases;
CREATE POLICY "Users can view own cases" ON cases FOR SELECT USING (
    auth.uid() = user_id
    OR public.is_case_shared_with_me(id)
);

-- case_shares
DROP POLICY IF EXISTS "case_shares_select" ON case_shares;
CREATE POLICY "case_shares_select" ON case_shares FOR SELECT USING (
    shared_with = auth.uid()
    OR public.owns_case(case_id)
);

DROP POLICY IF EXISTS "case_shares_insert" ON case_shares;
CREATE POLICY "case_shares_insert" ON case_shares FOR INSERT WITH CHECK (
    public.owns_case(case_id)
);

DROP POLICY IF EXISTS "case_shares_delete" ON case_shares;
CREATE POLICY "case_shares_delete" ON case_shares FOR DELETE USING (
    public.owns_case(case_id)
);

-- milestones
DROP POLICY IF EXISTS "Users can view own milestones" ON milestones;
CREATE POLICY "Users can view own milestones" ON milestones FOR SELECT USING (
    public.owns_case(case_id)
    OR public.is_case_shared_with_me(case_id)
);

-- financials
DROP POLICY IF EXISTS "Users can view own financials" ON financials;
CREATE POLICY "Users can view own financials" ON financials FOR SELECT USING (
    public.owns_case(case_id)
    OR public.is_case_shared_with_me(case_id)
);

-- redemption_steps
DROP POLICY IF EXISTS "redemption_steps_select" ON redemption_steps;
CREATE POLICY "redemption_steps_select" ON redemption_steps FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_case_shared_with_me(case_id)
);
