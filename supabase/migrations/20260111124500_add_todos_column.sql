-- Migration to add todos column to cases table
ALTER TABLE cases ADD COLUMN IF NOT EXISTS todos JSONB DEFAULT '{}'::jsonb;

-- Optional: Initialize existing rows if needed
-- UPDATE cases SET todos = '{"買方蓋印章": false, "賣方蓋印章": false, "用印款": false, "完稅款": false, "權狀印鑑": false, "授權": false, "解約排除": false, "規費": false, "設定": false, "稅單": false, "差額": false, "整過戶": false}'::jsonb WHERE todos IS NULL OR todos = '{}'::jsonb;
