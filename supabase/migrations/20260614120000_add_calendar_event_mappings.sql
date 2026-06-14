-- Google 行事曆同步：一般化事件對應表 + 專用案件子行事曆設定欄位
-- 對應 change: google-calendar-milestone-sync

-- 1.1 一般化事件對應表：來源表 + 來源 id + 來源欄位 → google_event_id
CREATE TABLE IF NOT EXISTS calendar_event_mappings (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
    source_table       text NOT NULL,            -- milestones / financials / todos
    source_id          text NOT NULL,            -- case_id 或 todo id
    source_field       text NOT NULL,            -- seal_date / house_tax_deadline / sign_appointment / due_date ...
    google_event_id    text NOT NULL,
    google_calendar_id text NOT NULL,
    synced_value       text,                     -- 最後同步的日期 / 時間字串
    updated_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT calendar_event_mappings_source_unique UNIQUE (source_table, source_id, source_field)
);

CREATE INDEX IF NOT EXISTS idx_calendar_event_mappings_user
    ON calendar_event_mappings (user_id);

-- 1.2 user_settings 新增專用案件子行事曆 id 欄位
ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS case_calendar_id text;

-- 1.3 RLS：以 user_id 隔離（與其他多租戶表一致）
ALTER TABLE calendar_event_mappings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own calendar mappings" ON calendar_event_mappings;
CREATE POLICY "Users can view own calendar mappings" ON calendar_event_mappings
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own calendar mappings" ON calendar_event_mappings;
CREATE POLICY "Users can insert own calendar mappings" ON calendar_event_mappings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own calendar mappings" ON calendar_event_mappings;
CREATE POLICY "Users can update own calendar mappings" ON calendar_event_mappings
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own calendar mappings" ON calendar_event_mappings;
CREATE POLICY "Users can delete own calendar mappings" ON calendar_event_mappings
    FOR DELETE USING (auth.uid() = user_id);

-- updated_at 自動更新（沿用既有 update_updated_at_column 函式）
DROP TRIGGER IF EXISTS update_calendar_event_mappings_modtime ON calendar_event_mappings;
CREATE TRIGGER update_calendar_event_mappings_modtime
    BEFORE UPDATE ON calendar_event_mappings
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
