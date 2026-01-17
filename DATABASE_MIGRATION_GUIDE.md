# 🚀 快速修復:執行資料庫遷移

## ❌ **錯誤原因**

`Error fetching notes: {}` 表示 `team_notes` 表還不存在。

---

## ✅ **解決方法**

### Step 1: 打開 Supabase Dashboard

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇您的專案

### Step 2: 執行 SQL

1. 點擊左側選單的 **SQL Editor**
2. 點擊 **New Query**
3. 複製以下完整 SQL 並貼上:

\`\`\`sql
-- 1. 建立團隊筆記表
CREATE TABLE IF NOT EXISTS team_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT,
    category TEXT CHECK (category IN ('經驗分享', '最佳實踐', '常見問題', '法規更新', '其他')),
    tags TEXT[] DEFAULT '{}',
    author_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_pinned BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    like_count INTEGER DEFAULT 0
);

-- 2. 建立評論表
CREATE TABLE IF NOT EXISTS note_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID REFERENCES team_notes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 建立點讚表
CREATE TABLE IF NOT EXISTS note_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    note_id UUID REFERENCES team_notes(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(note_id, user_id)
);

-- 4. 建立索引
CREATE INDEX IF NOT EXISTS idx_team_notes_author ON team_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_team_notes_category ON team_notes(category);
CREATE INDEX IF NOT EXISTS idx_team_notes_created_at ON team_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_notes_tags ON team_notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_note_comments_note ON note_comments(note_id);
CREATE INDEX IF NOT EXISTS idx_note_likes_note ON note_likes(note_id);

-- 5. 啟用 RLS
ALTER TABLE team_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_likes ENABLE ROW LEVEL SECURITY;

-- 6. RLS 政策 - team_notes
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

-- 7. RLS 政策 - note_comments
CREATE POLICY "所有人可讀取評論"
ON note_comments FOR SELECT
USING (true);

CREATE POLICY "已登入使用者可新增評論"
ON note_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "作者可刪除自己的評論"
ON note_comments FOR DELETE
USING (auth.uid() = user_id);

-- 8. RLS 政策 - note_likes
CREATE POLICY "所有人可讀取點讚"
ON note_likes FOR SELECT
USING (true);

CREATE POLICY "已登入使用者可新增點讚"
ON note_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "使用者可刪除自己的點讚"
ON note_likes FOR DELETE
USING (auth.uid() = user_id);

-- 9. 觸發器 - updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_team_notes_updated_at
    BEFORE UPDATE ON team_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. 觸發器 - like_count
CREATE OR REPLACE FUNCTION update_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE team_notes
        SET like_count = like_count + 1
        WHERE id = NEW.note_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE team_notes
        SET like_count = like_count - 1
        WHERE id = OLD.note_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_like_count_on_insert
    AFTER INSERT ON note_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_like_count();

CREATE TRIGGER update_like_count_on_delete
    AFTER DELETE ON note_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_like_count();
\`\`\`

4. 點擊 **Run** 按鈕執行

### Step 3: 驗證

執行後應該看到:
- ✅ Success (無錯誤訊息)

### Step 4: 重新載入頁面

回到瀏覽器,重新載入:
\`\`\`
http://localhost:3001/knowledge
\`\`\`

應該會看到「還沒有筆記」的空狀態,而不是錯誤訊息。

---

## 🎯 **快速測試**

執行完成後:

1. 訪問 `http://localhost:3001/knowledge`
2. 點擊「+ 新增筆記」
3. 填寫標題和內容
4. 發布

---

## 🐛 **如果還是有錯誤**

### 檢查 Supabase 連線

確認 `.env.local` 中有正確的 Supabase 設定:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
\`\`\`

### 檢查表是否建立成功

在 Supabase Dashboard:
1. 點擊 **Table Editor**
2. 應該看到 `team_notes`, `note_comments`, `note_likes` 三個表

---

執行完成後告訴我結果! 🚀
