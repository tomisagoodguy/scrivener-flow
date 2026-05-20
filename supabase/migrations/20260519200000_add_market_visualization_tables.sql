-- market_treemap_daily: 全市場個股當日快照（Treemap 用）
CREATE TABLE IF NOT EXISTS market_treemap_daily (
    date        DATE    NOT NULL,
    stock_code  TEXT    NOT NULL,
    stock_name  TEXT,
    industry    TEXT,
    market_cap  BIGINT,
    close       NUMERIC,
    change_pct  NUMERIC,
    PRIMARY KEY (date, stock_code)
);

CREATE INDEX IF NOT EXISTS idx_market_treemap_daily_date
    ON market_treemap_daily (date);

-- market_breadth_daily: 大盤騰落指標（ADL/ADR）
CREATE TABLE IF NOT EXISTS market_breadth_daily (
    date        DATE    PRIMARY KEY,
    ups         INT,
    downs       INT,
    net         INT,
    adl         NUMERIC,
    adr         NUMERIC,
    adl_ma5     NUMERIC,
    adl_ma60    NUMERIC,
    adr_ma5     NUMERIC,
    adr_ma60    NUMERIC
);
