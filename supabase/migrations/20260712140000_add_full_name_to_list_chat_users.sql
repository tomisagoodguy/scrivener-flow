-- list_chat_users() 加入姓名欄位
-- Google OAuth 登入時 Supabase Auth 會自動把姓名存進 auth.users.raw_user_meta_data
-- （對應前端 user.user_metadata.full_name，見 WelcomeHeader.tsx 既有用法），
-- 原本 RPC 只回傳 email，聊天的新對話選擇器/對話清單需要顯示姓名而非 email。

-- RETURNS TABLE 的欄位（OUT 參數）從 (id, email) 改成 (id, email, full_name)，
-- Postgres 不允許 CREATE OR REPLACE 直接變更回傳型別，須先 DROP 舊函式。
DROP FUNCTION IF EXISTS public.list_chat_users();

CREATE FUNCTION public.list_chat_users()
RETURNS TABLE (id uuid, email text, full_name text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT au.id, au.email, au.raw_user_meta_data ->> 'full_name' AS full_name
  FROM auth.users AS au
  WHERE au.id <> auth.uid()
  ORDER BY au.email;
$$;

REVOKE ALL ON FUNCTION public.list_chat_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_chat_users() TO authenticated;
