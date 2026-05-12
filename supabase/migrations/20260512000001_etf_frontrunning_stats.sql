-- ETF 揭露日異常成交量統計表
-- 儲存主動 ETF 加碼事件在揭露日 T/T+1/T+2 的異常成交量比率

CREATE TABLE IF NOT EXISTS etf_frontrunning_stats (
    id              SERIAL PRIMARY KEY,
    etf_code        TEXT        NOT NULL,
    stock_code      TEXT        NOT NULL,
    event_date      DATE        NOT NULL,
    delta_shares    NUMERIC,                -- 加碼股數（股）
    prev_shares     NUMERIC,                -- 揭露前持股數
    cur_shares      NUMERIC,                -- 揭露後持股數
    delta_pct       NUMERIC,                -- 加碼比例（%），新倉位為 null
    is_new_position BOOLEAN,
    r_t0            NUMERIC,                -- 揭露日成交量 / baseline median
    r_t1            NUMERIC,                -- T+1
    r_t2            NUMERIC,                -- T+2
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (etf_code, stock_code, event_date)
);

ALTER TABLE etf_frontrunning_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etf_frontrunning_stats_public_read"
    ON etf_frontrunning_stats FOR SELECT
    USING (true);

CREATE POLICY "etf_frontrunning_stats_service_write"
    ON etf_frontrunning_stats FOR ALL
    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_etf_frontrunning_etf_date
    ON etf_frontrunning_stats (etf_code, event_date DESC);

CREATE INDEX IF NOT EXISTS idx_etf_frontrunning_stock_date
    ON etf_frontrunning_stats (stock_code, event_date DESC);
