-- 補上 note 欄位（原始建表時遺漏）
ALTER TABLE redemption_steps ADD COLUMN IF NOT EXISTS note text;
