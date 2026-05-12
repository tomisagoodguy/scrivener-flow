-- ETF 配對實證：主動 vs 被動 ETF 同股加碼異常成交量比較

CREATE TABLE IF NOT EXISTS etf_matched_pairs (
    id               SERIAL PRIMARY KEY,
    computed_date    DATE        NOT NULL,
    stock_code       TEXT        NOT NULL,
    stock_name       TEXT,
    n_active_events  INT,                  -- 主動 ETF 加碼次數
    n_passive_events INT,                  -- 被動 ETF 加碼次數
    active_median_r  NUMERIC,             -- 主動 ETF r_t0 中位數
    passive_median_r NUMERIC,             -- 被動 ETF r_t0 中位數
    diff_median      NUMERIC,             -- active_median_r - passive_median_r
    UNIQUE (computed_date, stock_code)
);

ALTER TABLE etf_matched_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etf_matched_pairs_public_read"
    ON etf_matched_pairs FOR SELECT
    USING (true);

CREATE POLICY "etf_matched_pairs_service_write"
    ON etf_matched_pairs FOR ALL
    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_etf_matched_pairs_date
    ON etf_matched_pairs (computed_date DESC);

-- 摘要表（每日一筆）
CREATE TABLE IF NOT EXISTS etf_matched_pairs_summary (
    computed_date    DATE        PRIMARY KEY,
    n_pairs          INT,                  -- 有效配對股票數
    n_active_higher  INT,                  -- diff_median > 0 的股票數
    n_passive_higher INT,                  -- diff_median < 0 的股票數
    median_of_diffs  NUMERIC              -- 所有 diff_median 的中位數
);

ALTER TABLE etf_matched_pairs_summary ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etf_matched_pairs_summary_public_read"
    ON etf_matched_pairs_summary FOR SELECT
    USING (true);

CREATE POLICY "etf_matched_pairs_summary_service_write"
    ON etf_matched_pairs_summary FOR ALL
    USING (auth.role() = 'service_role');
