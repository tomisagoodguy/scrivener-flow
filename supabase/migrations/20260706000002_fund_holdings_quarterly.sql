-- 基金季報 ≥1% 持股（SITCA IN2630）
-- manager-fund-dual-track change：經理人雙軌訊號資料層

CREATE TABLE IF NOT EXISTS fund_holdings_quarterly (
    yq              TEXT        NOT NULL,   -- 資料季（季末月 YYYYMM，如 202603）
    fund_short      TEXT        NOT NULL,   -- canonical 基金短名（對照 fund_manager_map）
    comid           TEXT        NOT NULL,   -- SITCA 投信代碼
    stock_code      TEXT        NOT NULL,
    stock_name      TEXT,
    amount          NUMERIC,                -- 金額（千元）
    pct             NUMERIC,                -- 佔淨資產比例 %
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (yq, fund_short, stock_code)
);

-- RLS：authenticated 讀、service role 寫
ALTER TABLE fund_holdings_quarterly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fund_holdings_quarterly_auth_read"
    ON fund_holdings_quarterly FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "fund_holdings_quarterly_service_write"
    ON fund_holdings_quarterly FOR ALL
    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_fund_holdings_quarterly_fund_yq
    ON fund_holdings_quarterly (fund_short, yq DESC);

CREATE INDEX IF NOT EXISTS idx_fund_holdings_quarterly_stock_yq
    ON fund_holdings_quarterly (stock_code, yq DESC);
