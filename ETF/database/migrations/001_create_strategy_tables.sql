-- Migration: Create Strategy Tables
-- Date: 2026-02-09
-- Description: 建立量化策略相關的資料表

-- 1. 策略定義表
CREATE TABLE IF NOT EXISTS strategies (
    strategy_id SERIAL PRIMARY KEY,
    strategy_code VARCHAR(50) UNIQUE NOT NULL,
    strategy_name VARCHAR(100) NOT NULL,
    description TEXT,
    max_holdings INT DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 每日選股結果表
CREATE TABLE IF NOT EXISTS strategy_daily_holdings (
    id SERIAL PRIMARY KEY,
    strategy_code VARCHAR(50) NOT NULL,
    data_date DATE NOT NULL,
    stock_code VARCHAR(10) NOT NULL,
    rank_position INT NOT NULL,
    
    -- 選股當日的關鍵指標快照
    close_price NUMERIC(10, 2),
    revenue_yoy NUMERIC(10, 2),
    revenue_mom NUMERIC(10, 2),
    amount NUMERIC(15, 2),
    natr NUMERIC(10, 4),
    rs_rank NUMERIC(10, 4),
    price_to_high_pct NUMERIC(10, 2),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(strategy_code, data_date, stock_code)
);

-- 3. 選股異動記錄表
CREATE TABLE IF NOT EXISTS strategy_changes_log (
    id SERIAL PRIMARY KEY,
    strategy_code VARCHAR(50) NOT NULL,
    data_date DATE NOT NULL,
    change_type VARCHAR(10) NOT NULL,
    stock_code VARCHAR(10) NOT NULL,
    stock_name VARCHAR(50),
    prev_rank INT,
    new_rank INT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 建立索引
CREATE INDEX IF NOT EXISTS idx_strategy_daily_date 
    ON strategy_daily_holdings(strategy_code, data_date DESC);

CREATE INDEX IF NOT EXISTS idx_strategy_changes_date 
    ON strategy_changes_log(strategy_code, data_date DESC);

-- 插入預設策略定義
INSERT INTO strategies (strategy_code, strategy_name, description, max_holdings)
VALUES (
    'low_vol_alpha_yoy',
    '低波動率營收成長策略',
    '基於營收成長、低波動與技術面篩選的量化選股策略，選出符合多項條件的Top 10股票',
    10
)
ON CONFLICT (strategy_code) DO NOTHING;

COMMENT ON TABLE strategies IS '量化策略定義表';
COMMENT ON TABLE strategy_daily_holdings IS '策略每日選股結果與指標快照';
COMMENT ON TABLE strategy_changes_log IS '策略持股異動記錄';
