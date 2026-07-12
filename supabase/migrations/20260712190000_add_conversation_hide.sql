-- 刪除對話（僅從自己的清單隱藏，比照 Gmail 刪除信件語意）：
-- 加 conversation_members.hidden_at，隱藏後若對話有新訊息（含自己再次發言）
-- 則視為重新變成活躍對話，前端查詢時自動恢復顯示，不需要額外「取消隱藏」操作。
-- 不影響其他成員：他們的 conversation_members 列完全不受影響。
-- 沿用既有 UPDATE 政策「本人可更新自己的已讀時間」（USING/WITH CHECK 皆為
-- user_id = auth.uid()，未限制欄位），故不需新增 RLS 政策。

ALTER TABLE public.conversation_members ADD COLUMN IF NOT EXISTS hidden_at timestamptz;
