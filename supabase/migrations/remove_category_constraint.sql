-- 移除分類的 CHECK 限制,允許使用者自由輸入分類

-- 1. 刪除舊的 CHECK 約束
ALTER TABLE team_notes DROP CONSTRAINT IF EXISTS team_notes_category_check;

-- 2. 現在 category 欄位可以接受任何文字
-- 不需要額外操作,因為 TEXT 類型本身就允許任何文字
