CREATE TABLE IF NOT EXISTS etf_stock_divergence (
    id           bigserial   PRIMARY KEY,
    data_date    date        NOT NULL,
    stock_code   text        NOT NULL,
    stock_name   text,
    buy_etfs     jsonb       NOT NULL DEFAULT '[]',
    sell_etfs    jsonb       NOT NULL DEFAULT '[]',
    buy_count    int         NOT NULL DEFAULT 0,
    sell_count   int         NOT NULL DEFAULT 0,
    created_at   timestamptz NOT NULL DEFAULT now(),
    UNIQUE (data_date, stock_code)
);
