-- 每日跨 ETF 資金流向彙總表
-- 儲存每日買入/賣出個股清單與各 ETF 小計

CREATE TABLE IF NOT EXISTS etf_flow_daily (
    data_date       DATE        NOT NULL PRIMARY KEY,
    etfs_covered    TEXT[]      NOT NULL DEFAULT '{}',   -- 當日有揭露資料的 ETF 清單
    etfs_lagging    TEXT[]      NOT NULL DEFAULT '{}',   -- 延遲揭露的 ETF 清單
    inflow          JSONB       NOT NULL DEFAULT '[]',   -- 買入個股 [{stock_code, stock_name, total_nt, delta_shares, etf_count, by_etf}]
    outflow         JSONB       NOT NULL DEFAULT '[]',   -- 賣出個股 [{...}]
    by_etf          JSONB       NOT NULL DEFAULT '{}',   -- 各 ETF 小計 {etf_code: {net_flow, buy_count, sell_count}}
    totals          JSONB       NOT NULL DEFAULT '{}',   -- 匯總 {total_in_nt, total_out_nt, net_nt, stocks_count}
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE etf_flow_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etf_flow_daily_public_read"
    ON etf_flow_daily FOR SELECT
    USING (true);

CREATE POLICY "etf_flow_daily_service_write"
    ON etf_flow_daily FOR ALL
    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_etf_flow_daily_date
    ON etf_flow_daily (data_date DESC);
