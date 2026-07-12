-- 系統內建即時聊天功能：conversations / conversation_members / messages
-- 對應 openspec/changes/in-app-chat

-- ─────────────────────────────────────────────
-- 資料表
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_group boolean NOT NULL DEFAULT false,
  name text,
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.conversation_members (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
  ON public.messages (conversation_id, created_at);

CREATE INDEX IF NOT EXISTS idx_conversation_members_user_id
  ON public.conversation_members (user_id);

-- ─────────────────────────────────────────────
-- RLS：成員關係隔離（比照全公司共用單一空間的既有設計哲學）
-- ─────────────────────────────────────────────
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "成員可讀取所屬對話" ON public.conversations
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_members.conversation_id = conversations.id
        AND conversation_members.user_id = auth.uid()
    )
  );

CREATE POLICY "已登入可建立對話" ON public.conversations
  FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());

CREATE POLICY "成員可讀取同對話成員清單" ON public.conversation_members
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members AS m2
      WHERE m2.conversation_id = conversation_members.conversation_id
        AND m2.user_id = auth.uid()
    )
  );

CREATE POLICY "對話建立者或現有成員可加入成員" ON public.conversation_members
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_members.conversation_id
        AND conversations.created_by = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.conversation_members AS m2
      WHERE m2.conversation_id = conversation_members.conversation_id
        AND m2.user_id = auth.uid()
    )
  );

CREATE POLICY "本人可更新自己的已讀時間" ON public.conversation_members
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "成員可讀取對話訊息" ON public.messages
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_members.conversation_id = messages.conversation_id
        AND conversation_members.user_id = auth.uid()
    )
  );

CREATE POLICY "成員可送出訊息" ON public.messages
  FOR INSERT TO authenticated WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.conversation_members
      WHERE conversation_members.conversation_id = messages.conversation_id
        AND conversation_members.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- RPC：開新對話選擇器用，僅回傳 id/email 兩欄
-- 不回傳 encrypted_password、raw_app_meta_data 等 auth.users 敏感欄位
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.list_chat_users()
RETURNS TABLE (id uuid, email text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT au.id, au.email
  FROM auth.users AS au
  WHERE au.id <> auth.uid()
  ORDER BY au.email;
$$;

REVOKE ALL ON FUNCTION public.list_chat_users() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_chat_users() TO authenticated;
