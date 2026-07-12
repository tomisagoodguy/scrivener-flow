-- 放寬「活躍使用者」定義：原本是「近 10 天有案件活動」，改為
-- 「目前有承辦中案件（status 非 Closed/Cancelled）且該案件近 30 天內有編輯」。
-- 承辦中判斷比照 CASE_INACTIVE_STATUSES（src/lib/constants/caseConstants.ts）
-- 用排除法（NOT IN Closed/Cancelled），因 CaseStatus 欄位中英文值混用，
-- 排除法比只認 'Processing' 更保險。
-- 回傳型別未變，可直接 CREATE OR REPLACE。

CREATE OR REPLACE FUNCTION public.list_chat_users()
RETURNS TABLE (id uuid, email text, full_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT au.id, au.email, au.raw_user_meta_data ->> 'full_name' AS full_name
  FROM auth.users AS au
  WHERE au.id <> auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.user_id = au.id
        AND cases.status NOT IN ('Closed', 'Cancelled')
        AND cases.updated_at >= now() - interval '30 days'
    )
  ORDER BY au.email;
$$;

REVOKE ALL ON FUNCTION public.list_chat_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_chat_users() TO authenticated;
