-- 基金雙軌訊號表（月頻，與 etf_signals 的日頻近似訊號口徑不同、分表儲存）
-- manager-fund-dual-track change：6 種訊號
--   quarterly_promotion / quarterly_latent_etf / fund_consensus /
--   consecutive_add / high_weight_cut / core_exit

CREATE TABLE IF NOT EXISTS fund_signals (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    signal_type     TEXT        NOT NULL,
    stock_code      TEXT        NOT NULL,
    period          TEXT        NOT NULL,   -- YYYYMM（月頻）
    strength        SMALLINT    NOT NULL DEFAULT 1 CHECK (strength >= 1),  -- fund_consensus 為基金檔數，無上限
    fund_names      JSONB       NOT NULL DEFAULT '[]',  -- 涉及的 fund_short 清單
    metadata        JSONB       NOT NULL DEFAULT '{}',  -- 足以重建訊號成因的附加資訊
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (signal_type, stock_code, period)
);

-- RLS：authenticated 讀、service role 寫
ALTER TABLE fund_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fund_signals_auth_read"
    ON fund_signals FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "fund_signals_service_write"
    ON fund_signals FOR ALL
    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_fund_signals_type_period
    ON fund_signals (signal_type, period DESC);

CREATE INDEX IF NOT EXISTS idx_fund_signals_stock_period
    ON fund_signals (stock_code, period DESC);
