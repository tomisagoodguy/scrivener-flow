-- ETF 整體損益時序表
-- 每支 ETF 每日的總市值、總成本、總損益

CREATE TABLE IF NOT EXISTS etf_pnl_series (
    etf_code        TEXT        NOT NULL,
    data_date       DATE        NOT NULL,
    total_mv        NUMERIC(18, 6),   -- 總市值（億元）
    total_cost      NUMERIC(18, 6),   -- 總買入成本（億元）
    total_pnl       NUMERIC(18, 6),   -- 總未實現損益（億元）
    total_pnl_pct   NUMERIC(10, 4),   -- 總損益率（%）
    total_shares    NUMERIC(18, 0),   -- 總持股張數
    active_count    INTEGER,          -- 當前持倉標的數
    PRIMARY KEY (etf_code, data_date)
);

ALTER TABLE etf_pnl_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etf_pnl_series_public_read"
    ON etf_pnl_series FOR SELECT
    USING (true);

CREATE POLICY "etf_pnl_series_service_write"
    ON etf_pnl_series FOR ALL
    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_etf_pnl_series_etf_date
    ON etf_pnl_series (etf_code, data_date DESC);
