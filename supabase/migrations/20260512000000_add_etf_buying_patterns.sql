CREATE TABLE IF NOT EXISTS etf_buying_patterns (
    id          BIGSERIAL PRIMARY KEY,
    pattern_type TEXT NOT NULL,
    stock_code   TEXT NOT NULL,
    etf_code     TEXT NOT NULL,
    event_date   DATE NOT NULL,
    future_returns JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_etf_buying_patterns
        UNIQUE (pattern_type, stock_code, etf_code, event_date)
);

CREATE INDEX IF NOT EXISTS idx_etf_buying_patterns_event_date
    ON etf_buying_patterns (event_date DESC);

CREATE INDEX IF NOT EXISTS idx_etf_buying_patterns_pattern_type
    ON etf_buying_patterns (pattern_type);
