-- 個股三大法人日淨額表（market-chips-dashboard change）
-- TWSE T86（上市）＋ TPEx insti/dailyTrade（上櫃），單位：股
-- 90 天滾動保留（cleanup_step 清理）；訊號結果表 institutional_signals 長存

CREATE TABLE IF NOT EXISTS institutional_stock_daily (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_date       DATE        NOT NULL,
    stock_code      TEXT        NOT NULL,
    foreign_net     BIGINT      NOT NULL,   -- 外資買賣超（股）
    trust_net       BIGINT      NOT NULL,   -- 投信買賣超（股）
    dealer_net      BIGINT      NOT NULL,   -- 自營商買賣超（股）
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (data_date, stock_code)
);

-- RLS：authenticated 讀、service role 寫
ALTER TABLE institutional_stock_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "institutional_stock_daily_auth_read"
    ON institutional_stock_daily FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "institutional_stock_daily_service_write"
    ON institutional_stock_daily FOR ALL
    USING (auth.role() = 'service_role');

-- 90 天滾動清理與訊號計算（近 N 交易日窗口）都以 data_date 篩選
CREATE INDEX IF NOT EXISTS idx_institutional_stock_date
    ON institutional_stock_daily (data_date DESC);

CREATE INDEX IF NOT EXISTS idx_institutional_stock_code_date
    ON institutional_stock_daily (stock_code, data_date DESC);
