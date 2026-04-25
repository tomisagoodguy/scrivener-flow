-- ETF AUM 時序資料表
-- 儲存每支 ETF 每日的 AUM、NAV、流通單位、淨申購資料

CREATE TABLE IF NOT EXISTS etf_aum_series (
    etf_code    TEXT        NOT NULL,
    data_date   DATE        NOT NULL,
    aum_100m    NUMERIC(14, 6),   -- AUM（億元）
    nav         NUMERIC(10, 4),   -- 每單位淨值
    units       NUMERIC(14, 6),   -- 流通單位數（億份）
    inflow_100m NUMERIC(14, 6),   -- 當日淨申購（億元，負值為贖回）
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (etf_code, data_date)
);

-- RLS：公開讀取（投資儀表板前端無登入也可讀）
ALTER TABLE etf_aum_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etf_aum_series_public_read"
    ON etf_aum_series FOR SELECT
    USING (true);

CREATE POLICY "etf_aum_series_service_write"
    ON etf_aum_series FOR ALL
    USING (auth.role() = 'service_role');

-- Index：常用查詢模式
CREATE INDEX IF NOT EXISTS idx_etf_aum_series_etf_date
    ON etf_aum_series (etf_code, data_date DESC);

CREATE INDEX IF NOT EXISTS idx_etf_aum_series_date
    ON etf_aum_series (data_date DESC);
