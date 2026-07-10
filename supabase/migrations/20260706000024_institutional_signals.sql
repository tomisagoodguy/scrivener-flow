-- 法人訊號日清單表（market-chips-dashboard change）
-- 三種訊號：dual_buy（雙法人同買）/ consecutive_buy（連買 ≥3 交易日）/ divergence（土洋對作，雙方絕對值進當日前 50）
-- etf_cross：同日 etf_diff_logs 有 BUY/IN 則為 true；metadata 記錄判定用淨額（可稽核）
-- 每日僅數十列，長存不清理

CREATE TABLE IF NOT EXISTS institutional_signals (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_date       DATE        NOT NULL,
    signal_type     TEXT        NOT NULL CHECK (signal_type IN ('dual_buy', 'consecutive_buy', 'divergence')),
    stock_code      TEXT        NOT NULL,
    metadata        JSONB       NOT NULL DEFAULT '{}',
    etf_cross       BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (data_date, signal_type, stock_code)
);

-- RLS：authenticated 讀、service role 寫
ALTER TABLE institutional_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "institutional_signals_auth_read"
    ON institutional_signals FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "institutional_signals_service_write"
    ON institutional_signals FOR ALL
    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_institutional_signals_date_type
    ON institutional_signals (data_date DESC, signal_type);
