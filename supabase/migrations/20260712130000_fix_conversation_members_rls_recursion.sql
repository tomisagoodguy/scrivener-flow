-- 修復 in-app-chat RLS 無限遞迴
-- 原因：conversation_members 的 SELECT/INSERT 政策以 EXISTS 子查詢查詢
-- conversation_members 自身，觸發該表自己的 RLS 政策，造成無限遞迴
-- （PostgreSQL 錯誤：infinite recursion detected in policy for relation "conversation_members"）。
-- 修復方式：改用 SECURITY DEFINER 函式繞過 RLS 做成員資格檢查，
-- 所有引用 conversation_members 的政策（含 conversations / messages）統一改用此函式。

CREATE OR REPLACE FUNCTION public.is_conversation_member(p_conversation_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversation_members
    WHERE conversation_id = p_conversation_id AND user_id = p_user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_conversation_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_conversation_member(uuid, uuid) TO authenticated;

-- conversations：改用 is_conversation_member() 取代直接 EXISTS 查詢
DROP POLICY IF EXISTS "成員可讀取所屬對話" ON public.conversations;
CREATE POLICY "成員可讀取所屬對話" ON public.conversations
  FOR SELECT TO authenticated USING (
    public.is_conversation_member(conversations.id, auth.uid())
  );

-- conversation_members：修復自我遞迴
DROP POLICY IF EXISTS "成員可讀取同對話成員清單" ON public.conversation_members;
CREATE POLICY "成員可讀取同對話成員清單" ON public.conversation_members
  FOR SELECT TO authenticated USING (
    public.is_conversation_member(conversation_members.conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "對話建立者或現有成員可加入成員" ON public.conversation_members;
CREATE POLICY "對話建立者或現有成員可加入成員" ON public.conversation_members
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_members.conversation_id
        AND conversations.created_by = auth.uid()
    )
    OR public.is_conversation_member(conversation_members.conversation_id, auth.uid())
  );

-- messages：改用 is_conversation_member() 取代直接 EXISTS 查詢
DROP POLICY IF EXISTS "成員可讀取對話訊息" ON public.messages;
CREATE POLICY "成員可讀取對話訊息" ON public.messages
  FOR SELECT TO authenticated USING (
    public.is_conversation_member(messages.conversation_id, auth.uid())
  );

DROP POLICY IF EXISTS "成員可送出訊息" ON public.messages;
CREATE POLICY "成員可送出訊息" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND public.is_conversation_member(messages.conversation_id, auth.uid())
  );
