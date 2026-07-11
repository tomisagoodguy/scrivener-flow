-- ETF 配息記錄表（etf-market-mechanics）
-- 每檔 ETF 的配息記錄：期別、每單位金額、除息日、發放日、殖利率
-- 同步：每日 pipeline 尾端輔助步驟冪等 upsert（etf_dividend_scraper.py）

CREATE TABLE IF NOT EXISTS etf_dividend_records (
    etf_code      TEXT        NOT NULL,
    period        TEXT        NOT NULL,             -- 期別（如 2026/06、2026Q2，依來源格式）
    cash_per_unit NUMERIC     NOT NULL,             -- 每單位配息金額（元）
    ex_date       DATE        NOT NULL,             -- 除息日
    pay_date      DATE,                             -- 發放日（來源未提供時 NULL）
    yield_pct     NUMERIC,                          -- 殖利率 %（來源未提供時 NULL）
    source        TEXT        NOT NULL,             -- 資料來源標記（如 twse_openapi）
    ingested_at   TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (etf_code, period)
);

-- RLS：比照 etf_aum_series（公開讀取，service role 寫入）
ALTER TABLE etf_dividend_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etf_dividend_records_public_read"
    ON etf_dividend_records FOR SELECT
    USING (true);

CREATE POLICY "etf_dividend_records_service_write"
    ON etf_dividend_records FOR ALL
    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_etf_dividend_records_etf_ex_date
    ON etf_dividend_records (etf_code, ex_date DESC);
