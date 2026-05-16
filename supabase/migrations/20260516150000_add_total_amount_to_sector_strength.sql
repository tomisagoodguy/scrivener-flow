-- 族群每日總成交金額（所有成分股當日成交金額加總，單位：元）
ALTER TABLE sector_strength ADD COLUMN IF NOT EXISTS total_amount NUMERIC(20, 0);
