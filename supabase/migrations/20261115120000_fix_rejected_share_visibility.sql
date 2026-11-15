-- 修正：分享對象駁回後案件仍可見
-- 根因：20260712210000 有兩支同時間戳 migration，正式庫的 cases / milestones / financials /
-- redemption_steps SELECT policy 實際呼叫的是 is_case_shared_with(uuid, uuid)，
-- 但 20260716120000_add_case_share_rejection.sql 只在 is_case_shared_with_me(uuid) 加上
-- status = 'active'，導致駁回（status = 'rejected'）不影響可見性。
-- 做法：兩個函式都加上 status = 'active'，簽名 / SECURITY DEFINER / search_path / GRANT 不變，
-- 不論 policy 引用哪一個都會一致生效。

CREATE OR REPLACE FUNCTION public.is_case_shared_with(p_case_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.case_shares
    WHERE case_shares.case_id = p_case_id
      AND case_shares.shared_with = p_user_id
      AND case_shares.status = 'active'
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
          AND case_shares.status = 'active'
    );
$$;
