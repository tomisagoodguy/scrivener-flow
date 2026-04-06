-- etf_stock_overlap: 各股票被幾檔 ETF 持有的每日預計算共識分數
CREATE TABLE IF NOT EXISTS etf_stock_overlap (
    stock_code   TEXT NOT NULL,
    data_date    DATE NOT NULL,
    etf_count    INTEGER NOT NULL,        -- 持有此股的 ETF 數量
    total_weight NUMERIC(8,4) NOT NULL,   -- 各 ETF 權重合計
    etf_list     JSONB NOT NULL,          -- [{"etf_code":"00981A","weight":3.5}, ...]
    updated_at   TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (stock_code, data_date)
);

CREATE INDEX IF NOT EXISTS idx_etf_stock_overlap_date_count
    ON etf_stock_overlap (data_date, etf_count DESC);
