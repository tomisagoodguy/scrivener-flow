-- ETF 持倉損益彙總表
-- 儲存每支 ETF 每日的持倉成本、市值、損益資料

CREATE TABLE IF NOT EXISTS etf_position_summary (
    etf_code        TEXT        NOT NULL,
    stock_code      TEXT        NOT NULL,
    data_date       DATE        NOT NULL,
    cost_basis      NUMERIC(18, 6),   -- 累計買入成本（億元）
    mv_now          NUMERIC(18, 6),   -- 當前市值（億元）
    pnl             NUMERIC(18, 6),   -- 未實現損益（億元）
    pnl_pct         NUMERIC(10, 4),   -- 損益率（%）
    delta_days      INTEGER,          -- 持倉天數
    first_entry_date DATE,            -- 首次進場日
    entry_price     NUMERIC(14, 4),   -- 加權平均進場價
    curr_price      NUMERIC(14, 4),   -- 當前股價
    curr_shares     NUMERIC(18, 0),   -- 當前持有張數
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,  -- 是否仍在持倉
    exit_date       DATE,             -- 出清日（is_active=false 時有值）
    realized_pnl_pct NUMERIC(10, 4),  -- 已實現損益率（出清時計算）
    PRIMARY KEY (etf_code, stock_code, data_date)
);

ALTER TABLE etf_position_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etf_position_summary_public_read"
    ON etf_position_summary FOR SELECT
    USING (true);

CREATE POLICY "etf_position_summary_service_write"
    ON etf_position_summary FOR ALL
    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_etf_position_etf_date
    ON etf_position_summary (etf_code, data_date DESC);

CREATE INDEX IF NOT EXISTS idx_etf_position_active
    ON etf_position_summary (etf_code, is_active, data_date DESC);
