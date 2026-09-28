-- 案件列表買方/賣方加班費登打狀態：與蓋印章待辦完全脫鉤的獨立手動勾選旗標
-- 對應 openspec/changes/case-overtime-claim-toggle/design.md

ALTER TABLE cases
    ADD COLUMN IF NOT EXISTS buyer_overtime_claimed boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS seller_overtime_claimed boolean NOT NULL DEFAULT false;
