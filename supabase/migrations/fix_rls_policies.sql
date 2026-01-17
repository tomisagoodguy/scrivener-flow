-- ============================================
-- 清理並重新建立團隊知識庫
-- ============================================

-- 1. 刪除現有的 RLS 政策
DROP POLICY IF EXISTS "所有人可讀取團隊筆記" ON team_notes;
DROP POLICY IF EXISTS "已登入使用者可新增筆記" ON team_notes;
DROP POLICY IF EXISTS "作者可更新自己的筆記" ON team_notes;
DROP POLICY IF EXISTS "作者可刪除自己的筆記" ON team_notes;
DROP POLICY IF EXISTS "所有人可讀取評論" ON note_comments;
DROP POLICY IF EXISTS "已登入使用者可新增評論" ON note_comments;
DROP POLICY IF EXISTS "作者可刪除自己的評論" ON note_comments;
DROP POLICY IF EXISTS "所有人可讀取點讚" ON note_likes;
DROP POLICY IF EXISTS "已登入使用者可新增點讚" ON note_likes;
DROP POLICY IF EXISTS "使用者可刪除自己的點讚" ON note_likes;

-- 2. 重新建立 RLS 政策 - team_notes
CREATE POLICY "所有人可讀取團隊筆記"
ON team_notes FOR SELECT
USING (true);

CREATE POLICY "已登入使用者可新增筆記"
ON team_notes FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "作者可更新自己的筆記"
ON team_notes FOR UPDATE
USING (auth.uid() = author_id);

CREATE POLICY "作者可刪除自己的筆記"
ON team_notes FOR DELETE
USING (auth.uid() = author_id);

-- 3. 重新建立 RLS 政策 - note_comments
CREATE POLICY "所有人可讀取評論"
ON note_comments FOR SELECT
USING (true);

CREATE POLICY "已登入使用者可新增評論"
ON note_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "作者可刪除自己的評論"
ON note_comments FOR DELETE
USING (auth.uid() = user_id);

-- 4. 重新建立 RLS 政策 - note_likes
CREATE POLICY "所有人可讀取點讚"
ON note_likes FOR SELECT
USING (true);

CREATE POLICY "已登入使用者可新增點讚"
ON note_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "使用者可刪除自己的點讚"
ON note_likes FOR DELETE
USING (auth.uid() = user_id);
