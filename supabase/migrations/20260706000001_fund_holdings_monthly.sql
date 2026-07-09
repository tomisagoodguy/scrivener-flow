-- 基金月報 Top 10 持股（SITCA IN2629 為主、MOPS t78sb39_q3 回補歷史）
-- manager-fund-dual-track change：經理人雙軌訊號資料層

CREATE TABLE IF NOT EXISTS fund_holdings_monthly (
    ym              TEXT        NOT NULL,   -- 資料月份 YYYYMM
    fund_short      TEXT        NOT NULL,   -- canonical 基金短名（對照 fund_manager_map）
    comid           TEXT        NOT NULL,   -- SITCA 投信代碼（A0009 等）
    rank            INTEGER,                -- 月報名次 1-10（MOPS 為 1-5）
    stock_code      TEXT        NOT NULL,
    stock_name      TEXT,
    amount          NUMERIC,                -- 金額（千元）
    pct             NUMERIC,                -- 佔淨資產比例 %
    source          TEXT        NOT NULL CHECK (source IN ('sitca', 'mops')),
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (ym, fund_short, stock_code, source)
);

-- RLS：authenticated 讀、service role 寫
ALTER TABLE fund_holdings_monthly ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fund_holdings_monthly_auth_read"
    ON fund_holdings_monthly FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "fund_holdings_monthly_service_write"
    ON fund_holdings_monthly FOR ALL
    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_fund_holdings_monthly_fund_ym
    ON fund_holdings_monthly (fund_short, ym DESC);

CREATE INDEX IF NOT EXISTS idx_fund_holdings_monthly_stock_ym
    ON fund_holdings_monthly (stock_code, ym DESC);
