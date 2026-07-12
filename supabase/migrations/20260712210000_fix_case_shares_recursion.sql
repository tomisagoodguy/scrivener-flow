-- 修復 20260712200000_add_case_shares.sql 造成的 RLS 無限遞迴：
-- cases 的 SELECT policy 引用 case_shares，case_shares 的 policy 又引用 cases，
-- 兩者互相引用導致查詢 case_shares（或命中「非本人擁有」分支的 cases 查詢）時
-- 觸發 infinite recursion（Postgres 42P17）。
--
-- 修法比照既有 is_conversation_member() 的作法：用 SECURITY DEFINER 函式
-- 繞過 RLS 做跨表檢查，打斷互相引用的迴圈。

CREATE OR REPLACE FUNCTION public.is_case_owner(p_case_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.cases WHERE cases.id = p_case_id AND cases.user_id = p_user_id);
$$;

REVOKE ALL ON FUNCTION public.is_case_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_case_owner(uuid, uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.is_case_shared_with(p_case_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public.case_shares WHERE case_shares.case_id = p_case_id AND case_shares.shared_with = p_user_id);
$$;

REVOKE ALL ON FUNCTION public.is_case_shared_with(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_case_shared_with(uuid, uuid) TO authenticated;

-- cases：SELECT policy 改用 is_case_shared_with()，不再直接查 case_shares
DROP POLICY IF EXISTS "Users can view own cases" ON cases;
CREATE POLICY "Users can view own cases" ON cases FOR SELECT USING (
    auth.uid() = user_id OR public.is_case_shared_with(cases.id, auth.uid())
);

-- case_shares：SELECT/INSERT/DELETE policy 改用 is_case_owner()，不再直接查 cases
DROP POLICY IF EXISTS "case_shares_select" ON case_shares;
CREATE POLICY "case_shares_select" ON case_shares FOR SELECT USING (
    shared_with = auth.uid() OR public.is_case_owner(case_shares.case_id, auth.uid())
);

DROP POLICY IF EXISTS "case_shares_insert" ON case_shares;
CREATE POLICY "case_shares_insert" ON case_shares FOR INSERT WITH CHECK (
    public.is_case_owner(case_shares.case_id, auth.uid())
);

DROP POLICY IF EXISTS "case_shares_delete" ON case_shares;
CREATE POLICY "case_shares_delete" ON case_shares FOR DELETE USING (
    public.is_case_owner(case_shares.case_id, auth.uid())
);

-- milestones / financials / redemption_steps：分享分支改用 is_case_shared_with()
-- （不是遞迴源頭，但一併改用同一函式，行為一致且避免每次都間接觸發 case_shares RLS）
DROP POLICY IF EXISTS "Users can view own milestones" ON milestones;
CREATE POLICY "Users can view own milestones" ON milestones FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = milestones.case_id AND cases.user_id = auth.uid())
    OR public.is_case_shared_with(milestones.case_id, auth.uid())
);

DROP POLICY IF EXISTS "Users can view own financials" ON financials;
CREATE POLICY "Users can view own financials" ON financials FOR SELECT USING (
    EXISTS (SELECT 1 FROM cases WHERE cases.id = financials.case_id AND cases.user_id = auth.uid())
    OR public.is_case_shared_with(financials.case_id, auth.uid())
);

DROP POLICY IF EXISTS "redemption_steps_select" ON redemption_steps;
CREATE POLICY "redemption_steps_select" ON redemption_steps FOR SELECT USING (
    user_id = auth.uid() OR public.is_case_shared_with(redemption_steps.case_id, auth.uid())
);
