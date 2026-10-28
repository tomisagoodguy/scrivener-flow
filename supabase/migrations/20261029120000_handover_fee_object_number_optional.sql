-- 遞牌費物件編號改為選填：空白一律存 null，有值則不可只有空白
-- 對應 openspec/changes/handover-fee-ledger/design.md「物件編號改為選填並以後續 migration 放寬」
-- 20261028120000_add_handover_fee_ledger.sql 已套用，故另立一檔；含 DROP，請在 SQL Editor 執行

ALTER TABLE handover_fees ALTER COLUMN object_number DROP NOT NULL;

ALTER TABLE handover_fees DROP CONSTRAINT IF EXISTS handover_fees_object_number_not_blank;

ALTER TABLE handover_fees ADD CONSTRAINT handover_fees_object_number_null_or_not_blank
    CHECK (object_number IS NULL OR length(btrim(object_number)) > 0);
