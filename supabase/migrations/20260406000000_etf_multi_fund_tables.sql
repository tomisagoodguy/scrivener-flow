-- =====================================================================
-- ETF 多基金擴展：新增 etf_aum 和 etf_sectors 資料表
-- 支援 00980A (野村)、00981A (統一)、00991A (復華) 三支主動型 ETF
-- =====================================================================

-- ETF AUM 歷史追蹤表
CREATE TABLE IF NOT EXISTS etf_aum (
    id            BIGSERIAL PRIMARY KEY,
    etf_code      TEXT        NOT NULL,
    aum_100m_twd  DECIMAL(12, 2),   -- 億元台幣
    snapshot_date DATE        NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_etf_aum_unique
    ON etf_aum (etf_code, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_etf_aum_date
    ON etf_aum (snapshot_date DESC);

-- ETF 產業分布歷史表
CREATE TABLE IF NOT EXISTS etf_sectors (
    id            BIGSERIAL PRIMARY KEY,
    etf_code      TEXT        NOT NULL,
    sector_name   TEXT        NOT NULL,
    weight        DECIMAL(6, 3),    -- 百分比，如 15.230
    snapshot_date DATE        NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_etf_sectors_unique
    ON etf_sectors (etf_code, sector_name, snapshot_date);

CREATE INDEX IF NOT EXISTS idx_etf_sectors_date
    ON etf_sectors (snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_etf_sectors_etf_date
    ON etf_sectors (etf_code, snapshot_date DESC);

-- 確保 etf_holdings_snapshot 的 etf_code 欄位有索引
CREATE INDEX IF NOT EXISTS idx_etf_holdings_snapshot_etf_code
    ON etf_holdings_snapshot (etf_code);

-- 確保 etf_weight_history 的 etf_code 欄位有索引（若表存在）
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'etf_weight_history'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_etf_weight_history_etf_code
            ON etf_weight_history (etf_code, data_date DESC);
    END IF;
END $$;

-- 確保 etf_diff_logs 的 etf_code 欄位有索引
CREATE INDEX IF NOT EXISTS idx_etf_diff_logs_etf_code
    ON etf_diff_logs (etf_code, data_date DESC);
