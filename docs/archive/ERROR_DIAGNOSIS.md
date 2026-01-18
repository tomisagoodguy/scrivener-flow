# 🔍 錯誤診斷指南

## ❌ **錯誤**: Error loading note: {}

這個錯誤表示資料庫查詢失敗,但錯誤訊息是空的。

---

## 🔧 **可能的原因**

### 1. 資料庫表不存在

最可能的原因是 `team_notes` 表還沒有建立。

### 2. RLS 政策問題

Row Level Security 政策可能阻止了查詢。

### 3. 沒有資料

資料庫是空的,沒有任何筆記。

---

## ✅ **解決步驟**

### Step 1: 檢查資料庫表是否存在

1. 打開 **Supabase Dashboard**
2. 進入 **Table Editor**
3. 檢查是否有以下表:
   - [ ] `team_notes`
   - [ ] `note_comments`
   - [ ] `note_likes`

**如果沒有這些表,請執行 Step 2**

---

### Step 2: 建立資料庫表

在 Supabase Dashboard → SQL Editor 執行以下 SQL:

\`\`\`sql
-- 1. 建立團隊筆記表
CREATE TABLE IF NOT EXISTS team_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT,
    category TEXT,
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
DROP POLICY IF EXISTS "所有人可讀取團隊筆記" ON team_notes;
CREATE POLICY "所有人可讀取團隊筆記"
ON team_notes FOR SELECT
USING (true);

DROP POLICY IF EXISTS "已登入使用者可新增筆記" ON team_notes;
CREATE POLICY "已登入使用者可新增筆記"
ON team_notes FOR INSERT
WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "作者可更新自己的筆記" ON team_notes;
CREATE POLICY "作者可更新自己的筆記"
ON team_notes FOR UPDATE
USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "作者可刪除自己的筆記" ON team_notes;
CREATE POLICY "作者可刪除自己的筆記"
ON team_notes FOR DELETE
USING (auth.uid() = author_id);

-- 7. RLS 政策 - note_comments
DROP POLICY IF EXISTS "所有人可讀取評論" ON note_comments;
CREATE POLICY "所有人可讀取評論"
ON note_comments FOR SELECT
USING (true);

DROP POLICY IF EXISTS "已登入使用者可新增評論" ON note_comments;
CREATE POLICY "已登入使用者可新增評論"
ON note_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "作者可刪除自己的評論" ON note_comments;
CREATE POLICY "作者可刪除自己的評論"
ON note_comments FOR DELETE
USING (auth.uid() = user_id);

-- 8. RLS 政策 - note_likes
DROP POLICY IF EXISTS "所有人可讀取點讚" ON note_likes;
CREATE POLICY "所有人可讀取點讚"
ON note_likes FOR SELECT
USING (true);

DROP POLICY IF EXISTS "已登入使用者可新增點讚" ON note_likes;
CREATE POLICY "已登入使用者可新增點讚"
ON note_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "使用者可刪除自己的點讚" ON note_likes;
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

DROP TRIGGER IF EXISTS update_team_notes_updated_at ON team_notes;
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

DROP TRIGGER IF EXISTS update_like_count_on_insert ON note_likes;
CREATE TRIGGER update_like_count_on_insert
    AFTER INSERT ON note_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_like_count();

DROP TRIGGER IF EXISTS update_like_count_on_delete ON note_likes;
CREATE TRIGGER update_like_count_on_delete
    AFTER DELETE ON note_likes
    FOR EACH ROW
    EXECUTE FUNCTION update_like_count();
\`\`\`

---

### Step 3: 驗證

執行完成後:

1. 回到 **Table Editor**
2. 確認看到 3 個表:
   - ✅ `team_notes`
   - ✅ `note_comments`
   - ✅ `note_likes`

---

### Step 4: 測試

1. **重新載入頁面** (Ctrl + Shift + R)

2. **訪問共筆**
   \`\`\`
   http://localhost:3001/knowledge
   \`\`\`

3. **應該看到**:
   - ✅ 「還沒有筆記」的空狀態
   - ✅ 沒有錯誤訊息

4. **新增筆記**:
   - 點擊「+ 新增筆記」
   - 輸入標題
   - 輸入分類
   - 撰寫內容
   - 發布

5. **查看詳情**:
   - 點擊筆記卡片
   - 應該可以正常顯示
   - 不會有錯誤

---

## 🐛 **如果還是有錯誤**

### 檢查瀏覽器控制台

1. 按 **F12** 打開開發者工具
2. 切換到 **Console** 標籤
3. 查看是否有更詳細的錯誤訊息
4. 複製完整的錯誤訊息給我

### 檢查 Supabase 連線

確認 \`.env.local\` 中有正確的設定:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
\`\`\`

---

## 📋 **快速檢查清單**

- [ ] Supabase Dashboard 中有 \`team_notes\` 表
- [ ] Supabase Dashboard 中有 \`note_comments\` 表
- [ ] Supabase Dashboard 中有 \`note_likes\` 表
- [ ] RLS 政策已啟用
- [ ] \`.env.local\` 設定正確
- [ ] 已重新載入頁面

---

請按照步驟執行,然後告訴我結果! 🚀
