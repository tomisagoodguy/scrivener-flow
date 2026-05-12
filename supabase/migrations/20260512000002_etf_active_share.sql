-- ETF 兩兩持股重疊度（Active Share）矩陣
-- 每週計算 16 支主動 ETF 兩兩 AS，以及各 ETF 對 industry-mean 的 AS

CREATE TABLE IF NOT EXISTS etf_active_share (
    id              SERIAL PRIMARY KEY,
    computed_date   DATE        NOT NULL,
    etf_a           TEXT        NOT NULL,
    etf_b           TEXT        NOT NULL,   -- etf_a < etf_b（lexicographic）
    active_share_pct NUMERIC,               -- 0~100%
    as_vs_mean_a    NUMERIC,               -- etf_a vs industry-mean AS
    as_vs_mean_b    NUMERIC,               -- etf_b vs industry-mean AS
    UNIQUE (computed_date, etf_a, etf_b),
    CHECK (etf_a < etf_b)
);

ALTER TABLE etf_active_share ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etf_active_share_public_read"
    ON etf_active_share FOR SELECT
    USING (true);

CREATE POLICY "etf_active_share_service_write"
    ON etf_active_share FOR ALL
    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_etf_active_share_date
    ON etf_active_share (computed_date DESC);
