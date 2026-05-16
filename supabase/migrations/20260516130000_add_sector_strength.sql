-- sector_strength: 每日族群漲幅快照
CREATE TABLE IF NOT EXISTS sector_strength (
    id          BIGSERIAL PRIMARY KEY,
    date        DATE        NOT NULL,
    category    TEXT        NOT NULL,
    ret_1d      NUMERIC(8, 4),
    ret_5d      NUMERIC(8, 4),
    ret_20d     NUMERIC(8, 4),
    stock_count INTEGER     NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT sector_strength_date_category_key UNIQUE (date, category)
);

CREATE INDEX IF NOT EXISTS idx_sector_strength_date ON sector_strength (date DESC);

-- sector_strength_stocks: 各族群成分股當日漲幅
CREATE TABLE IF NOT EXISTS sector_strength_stocks (
    id          BIGSERIAL PRIMARY KEY,
    date        DATE        NOT NULL,
    category    TEXT        NOT NULL,
    stock_id    TEXT        NOT NULL,
    stock_name  TEXT,
    ret_1d      NUMERIC(8, 4),
    ret_5d      NUMERIC(8, 4),
    ret_20d     NUMERIC(8, 4),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT sector_strength_stocks_date_category_stock_key UNIQUE (date, category, stock_id)
);

CREATE INDEX IF NOT EXISTS idx_sector_strength_stocks_date_cat ON sector_strength_stocks (date DESC, category);

-- 允許前端匿名讀取（與其他投資資料表一致）
ALTER TABLE sector_strength ENABLE ROW LEVEL SECURITY;
ALTER TABLE sector_strength_stocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public read sector_strength"
    ON sector_strength FOR SELECT USING (true);

CREATE POLICY "public read sector_strength_stocks"
    ON sector_strength_stocks FOR SELECT USING (true);
