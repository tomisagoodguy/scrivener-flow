-- 遞牌費新增「自己遞牌」紀錄：不需付款人/收款人、不追蹤收款，可記件數與選填金額
-- 含 DROP NOT NULL，請在 SQL Editor 執行；須在部署新版程式碼之前執行
-- distinct_parties、amount_positive 與兩條複合外鍵遇到 NULL 皆通過，保留不動

ALTER TABLE handover_fees
    ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'exchange',
    ADD COLUMN IF NOT EXISTS case_count integer NOT NULL DEFAULT 1;

ALTER TABLE handover_fees ALTER COLUMN payer_scrivener_id DROP NOT NULL;
ALTER TABLE handover_fees ALTER COLUMN payee_scrivener_id DROP NOT NULL;
ALTER TABLE handover_fees ALTER COLUMN amount DROP NOT NULL;

ALTER TABLE handover_fees ADD CONSTRAINT handover_fees_entry_type_valid
    CHECK (entry_type IN ('exchange', 'solo'));

ALTER TABLE handover_fees ADD CONSTRAINT handover_fees_case_count_positive
    CHECK (case_count > 0);

ALTER TABLE handover_fees ADD CONSTRAINT handover_fees_entry_shape CHECK (
    (entry_type = 'exchange'
        AND payer_scrivener_id IS NOT NULL
        AND payee_scrivener_id IS NOT NULL
        AND amount IS NOT NULL
        AND case_count = 1)
    OR (entry_type = 'solo'
        AND payer_scrivener_id IS NULL
        AND payee_scrivener_id IS NULL
        AND paid_at IS NULL)
);
