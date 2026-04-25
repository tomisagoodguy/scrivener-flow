-- ETF 訊號偵測表
-- 儲存跨 ETF 共識訊號（多基金共識、單基金超配、跨商品積累等）

CREATE TABLE IF NOT EXISTS etf_signals (
    id              BIGSERIAL   PRIMARY KEY,
    signal_type     TEXT        NOT NULL,   -- 訊號類型: multi_fund_consensus / single_fund_overweight / cross_product_accumulation / cross_etf_same_day_buy
    stock_code      TEXT        NOT NULL,
    data_date       DATE        NOT NULL,
    strength        SMALLINT    NOT NULL DEFAULT 1 CHECK (strength BETWEEN 1 AND 3),  -- 1=弱(灰) 2=中(橙) 3=強(紅)
    etf_codes       TEXT[]      NOT NULL DEFAULT '{}',   -- 涉及的 ETF 代號清單
    metadata        JSONB       NOT NULL DEFAULT '{}',   -- 訊號附加資訊（比重、變化量、說明等）
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (signal_type, stock_code, data_date)
);

-- RLS：公開讀取
ALTER TABLE etf_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "etf_signals_public_read"
    ON etf_signals FOR SELECT
    USING (true);

CREATE POLICY "etf_signals_service_write"
    ON etf_signals FOR ALL
    USING (auth.role() = 'service_role');

-- Index：常用查詢模式
CREATE INDEX IF NOT EXISTS idx_etf_signals_type_date
    ON etf_signals (signal_type, data_date DESC);

CREATE INDEX IF NOT EXISTS idx_etf_signals_stock_date
    ON etf_signals (stock_code, data_date DESC);

CREATE INDEX IF NOT EXISTS idx_etf_signals_date
    ON etf_signals (data_date DESC);
