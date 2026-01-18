-- 啟用 team_notes 的 RLS
ALTER TABLE team_notes ENABLE ROW LEVEL SECURITY;

-- 刪除舊的限制性政策
DROP POLICY IF EXISTS "Users can update their own notes" ON team_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON team_notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON team_notes;
DROP POLICY IF EXISTS "Notes are viewable by everyone" ON team_notes;
DROP POLICY IF EXISTS "Users can insert notes" ON team_notes;
DROP POLICY IF EXISTS "Users can update any note" ON team_notes;
DROP POLICY IF EXISTS "Users can delete any note" ON team_notes;

-- 1. 檢視政策: 所有人都可以看
CREATE POLICY "Notes are viewable by everyone" ON team_notes FOR SELECT USING (true);

-- 2. 新增政策: 已登入使用者可以新增
CREATE POLICY "Users can insert notes" ON team_notes FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 3. 更新政策: 已登入使用者可以更新任何筆記 (共筆模式)
CREATE POLICY "Users can update any note" ON team_notes FOR UPDATE USING (auth.role() = 'authenticated');

-- 4. 刪除政策: 已登入使用者可以刪除任何筆記 (共筆模式)
CREATE POLICY "Users can delete any note" ON team_notes FOR DELETE USING (auth.role() = 'authenticated');

-- Reload Schema
NOTIFY pgrst, 'reload schema';
