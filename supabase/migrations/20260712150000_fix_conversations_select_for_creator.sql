-- 修復「new row violates row-level security policy for table conversations」
-- 原因：INSERT INTO conversations ... RETURNING（前端 .insert().select().single()）
-- 在 PostgreSQL RLS 下，插入成功後還需通過 SELECT 政策才能 RETURNING 該筆資料。
-- 建立對話時，chatService.ts 先 INSERT conversations，「之後」才另外 INSERT
-- conversation_members（建立者自己的成員列），因此在 RETURNING 當下建立者尚未
-- 是任何成員，導致「成員可讀取所屬對話」政策擋下 RETURNING，回報與 INSERT
-- WITH CHECK 失敗完全相同的錯誤文字，難以區分。
-- 修復：SELECT 政策額外允許 created_by = auth.uid()，讓建立者一律能看到自己
-- 建立的對話，不受「是否已加入 conversation_members」的時序影響。

DROP POLICY IF EXISTS "成員可讀取所屬對話" ON public.conversations;
CREATE POLICY "成員可讀取所屬對話" ON public.conversations
  FOR SELECT TO authenticated USING (
    created_by = auth.uid()
    OR public.is_conversation_member(conversations.id, auth.uid())
  );
