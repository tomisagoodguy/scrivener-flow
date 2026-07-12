-- 訊息收回功能：加入 deleted_at 軟刪除欄位（比照 todos 軟刪除慣例）
-- 收回時只標記 deleted_at，不清空 content，保留稽核紀錄；前端依 deleted_at 是否
-- 為 null 決定顯示原內容或「訊息已收回」佔位文字。

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- messages 原本沒有 UPDATE 政策，收回訊息需要新增：僅寄件者本人可收回自己的訊息
CREATE POLICY "寄件者可收回自己的訊息" ON public.messages
  FOR UPDATE TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());
