-- Stock Broker Transactions (Top 15 Aggregate)
CREATE TABLE IF NOT EXISTS stock_broker_transactions (
    stock_code TEXT NOT NULL,
    data_date DATE NOT NULL,
    buy_amount NUMERIC,
    sell_amount NUMERIC,
    net_volume NUMERIC,
    force_metric NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (stock_code, data_date)
);

CREATE INDEX IF NOT EXISTS idx_broker_transactions_stock_date ON stock_broker_transactions(stock_code, data_date DESC);

COMMENT ON TABLE stock_broker_transactions IS '券商分點買賣超前15大匯總資料';
COMMENT ON COLUMN stock_broker_transactions.buy_amount IS '買進金額/張數';
COMMENT ON COLUMN stock_broker_transactions.sell_amount IS '賣出金額/張數';
COMMENT ON COLUMN stock_broker_transactions.net_volume IS '淨買賣超 (買-賣) * 收盤價';
COMMENT ON COLUMN stock_broker_transactions.force_metric IS '主力動能指標 (NetVol Rolling Mean/Std)';
