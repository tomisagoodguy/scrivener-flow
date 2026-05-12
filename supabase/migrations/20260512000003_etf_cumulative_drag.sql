-- ETF 年化隱成本（Cumulative Manager Drag）
-- 衡量主動 ETF 加碼行為造成的超額成交量與經理人拖累成本

CREATE TABLE IF NOT EXISTS etf_cumulative_drag (
    id              SERIAL PRIMARY KEY,
    etf_code        TEXT        NOT NULL,
    computed_date   DATE        NOT NULL,
    n_events        INT,                              -- 分析期間內加碼事件數
    days_span       INT,                              -- 資料跨度（日）
    events_per_year NUMERIC,                          -- 年化事件頻率
    annual_excess_volume_kshares_per_yi NUMERIC,      -- 年化超額成交量（千股/億元AUM）
    annual_manager_drag_kshares_per_yi  NUMERIC,      -- 年化經理人拖累（千股/億元AUM）
    UNIQUE (etf_code, computed_date)
);

ALTER TABLE etf_cumulative_drag ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etf_cumulative_drag_public_read"
    ON etf_cumulative_drag FOR SELECT
    USING (true);

CREATE POLICY "etf_cumulative_drag_service_write"
    ON etf_cumulative_drag FOR ALL
    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_etf_cumulative_drag_etf_date
    ON etf_cumulative_drag (etf_code, computed_date DESC);
