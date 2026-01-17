-- ============================================
-- Phase 3: 團隊知識庫資料庫 Schema
-- ============================================

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

-- 4. 建立索引以提升查詢效能
CREATE INDEX IF NOT EXISTS idx_team_notes_author ON team_notes(author_id);
CREATE INDEX IF NOT EXISTS idx_team_notes_category ON team_notes(category);
CREATE INDEX IF NOT EXISTS idx_team_notes_created_at ON team_notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_notes_tags ON team_notes USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_note_comments_note ON note_comments(note_id);
CREATE INDEX IF NOT EXISTS idx_note_likes_note ON note_likes(note_id);

-- 5. 建立全文搜尋索引
CREATE INDEX IF NOT EXISTS idx_team_notes_search ON team_notes USING GIN(
    to_tsvector('simple', title || ' ' || COALESCE(content, ''))
);

-- 6. 啟用 Row Level Security (RLS)
ALTER TABLE team_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_likes ENABLE ROW LEVEL SECURITY;

-- 7. RLS 政策 - team_notes

-- 所有人可讀取團隊筆記
CREATE POLICY "所有人可讀取團隊筆記"
ON team_notes FOR SELECT
USING (true);

-- 已登入使用者可新增筆記
CREATE POLICY "已登入使用者可新增筆記"
ON team_notes FOR INSERT
WITH CHECK (auth.uid() = author_id);

-- 作者可更新自己的筆記
CREATE POLICY "作者可更新自己的筆記"
ON team_notes FOR UPDATE
USING (auth.uid() = author_id);

-- 作者可刪除自己的筆記
CREATE POLICY "作者可刪除自己的筆記"
ON team_notes FOR DELETE
USING (auth.uid() = author_id);

-- 8. RLS 政策 - note_comments

-- 所有人可讀取評論
CREATE POLICY "所有人可讀取評論"
ON note_comments FOR SELECT
USING (true);

-- 已登入使用者可新增評論
CREATE POLICY "已登入使用者可新增評論"
ON note_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 作者可刪除自己的評論
CREATE POLICY "作者可刪除自己的評論"
ON note_comments FOR DELETE
USING (auth.uid() = user_id);

-- 9. RLS 政策 - note_likes

-- 所有人可讀取點讚
CREATE POLICY "所有人可讀取點讚"
ON note_likes FOR SELECT
USING (true);

-- 已登入使用者可新增點讚
CREATE POLICY "已登入使用者可新增點讚"
ON note_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 使用者可刪除自己的點讚
CREATE POLICY "使用者可刪除自己的點讚"
ON note_likes FOR DELETE
USING (auth.uid() = user_id);

-- 10. 建立觸發器以更新 updated_at
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

-- 11. 建立觸發器以更新 view_count
CREATE OR REPLACE FUNCTION increment_view_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE team_notes
    SET view_count = view_count + 1
    WHERE id = NEW.note_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 12. 建立觸發器以更新 like_count
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

-- ============================================
-- 執行指令
-- ============================================

-- 在 Supabase SQL Editor 中執行此腳本
-- 或使用以下 Node.js 腳本執行:
-- node setup_team_notes.js
