-- 首頁艾森豪四象限矩陣：個人化分類保存欄位
-- 結構：{ "placements": { "<case_id>:buyer": "q1", ... }, "labels": { "q1": "自訂標題", ... } }
ALTER TABLE user_settings
    ADD COLUMN IF NOT EXISTS eisenhower_matrix JSONB DEFAULT '{}'::jsonb;
