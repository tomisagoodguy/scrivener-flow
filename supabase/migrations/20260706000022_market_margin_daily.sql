-- 市場融資融券餘額日表（market-chips-dashboard change）
-- TWSE MI_MARGN（selectType=MS 市場合計）：融資餘額（仟元）、融券餘額（張）與日變化

CREATE TABLE IF NOT EXISTS market_margin_daily (
    data_date       DATE        PRIMARY KEY,
    margin_balance  NUMERIC     NOT NULL,   -- 融資金額今日餘額（仟元）
    margin_change   NUMERIC     NOT NULL,   -- 融資金額日變化（仟元）
    short_balance   NUMERIC     NOT NULL,   -- 融券今日餘額（張）
    short_change    NUMERIC     NOT NULL,   -- 融券日變化（張）
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- RLS：authenticated 讀、service role 寫
ALTER TABLE market_margin_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "market_margin_daily_auth_read"
    ON market_margin_daily FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "market_margin_daily_service_write"
    ON market_margin_daily FOR ALL
    USING (auth.role() = 'service_role');
