-- Investment Dashboard Enhancement: Financials & Chips Analysis
-- Create tables for stock revenue and shareholder distribution

-- 1. Stock Monthly Revenue Table
CREATE TABLE IF NOT EXISTS stock_revenue_monthly (
    stock_code TEXT NOT NULL,
    data_date DATE NOT NULL,
    revenue NUMERIC,
    revenue_yoy NUMERIC,
    revenue_mom NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (stock_code, data_date)
);

-- Index for faster date-range queries
CREATE INDEX IF NOT EXISTS idx_revenue_stock_date ON stock_revenue_monthly(stock_code, data_date DESC);

-- 2. Stock Shareholder Weekly Distribution Table
CREATE TABLE IF NOT EXISTS stock_shareholder_weekly (
    stock_code TEXT NOT NULL,
    data_date DATE NOT NULL,
    shareholder_tier INTEGER NOT NULL,
    holder_count INTEGER,
    shares_held NUMERIC,
    custody_ratio NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (stock_code, data_date, shareholder_tier)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_shareholder_stock_date ON stock_shareholder_weekly(stock_code, data_date DESC);
CREATE INDEX IF NOT EXISTS idx_shareholder_tier ON stock_shareholder_weekly(shareholder_tier);

-- Comments for documentation
COMMENT ON TABLE stock_revenue_monthly IS '個股月營收資料（近24個月）';
COMMENT ON TABLE stock_shareholder_weekly IS '個股股權分散週資料（近48週），依照集保分級1-17';

COMMENT ON COLUMN stock_revenue_monthly.revenue IS '當月營收';
COMMENT ON COLUMN stock_revenue_monthly.revenue_yoy IS '去年同月增減(%)';
COMMENT ON COLUMN stock_revenue_monthly.revenue_mom IS '上月比較增減(%)';

COMMENT ON COLUMN stock_shareholder_weekly.shareholder_tier IS '持股分級 (1-17)';
COMMENT ON COLUMN stock_shareholder_weekly.holder_count IS '該級距人數';
COMMENT ON COLUMN stock_shareholder_weekly.shares_held IS '該級距持有股數';
COMMENT ON COLUMN stock_shareholder_weekly.custody_ratio IS '占集保庫存數比例(%)';
