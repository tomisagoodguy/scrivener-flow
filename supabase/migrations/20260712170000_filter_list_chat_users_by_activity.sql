-- 新對話選擇器只列出「最近有在用系統」的使用者：定義為近 10 天內有
-- 建立或更新過案件（cases.updated_at）的使用者。沒有案件活動的帳號
-- （單純登入過但沒實際使用）視為訪客/殭屍帳戶，不出現在聊天對象清單。
-- 回傳型別（id, email, full_name）維持不變，僅加過濾條件，故可直接
-- CREATE OR REPLACE（不需要先 DROP FUNCTION）。

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
        AND cases.updated_at >= now() - interval '10 days'
    )
  ORDER BY au.email;
$$;

REVOKE ALL ON FUNCTION public.list_chat_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_chat_users() TO authenticated;
