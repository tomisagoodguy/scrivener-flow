-- 期貨籌碼日表（market-chips-dashboard change）
-- TAIFEX futContractsDate：三契約（TX/MXF/TMF）× 三法人（dealer/trust/foreign）未平倉部位
-- 散戶多空比存於 contract 層彙總列（institution='retail_summary'，long_oi/short_oi 為推導散戶值）
-- retail_ls_ratio = (retail_long − retail_short) / market_oi × 100，只算 MXF/TMF

CREATE TABLE IF NOT EXISTS futures_institutional_daily (
    id              BIGINT      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    data_date       DATE        NOT NULL,
    contract        TEXT        NOT NULL CHECK (contract IN ('TX', 'MXF', 'TMF')),
    institution     TEXT        NOT NULL CHECK (institution IN ('dealer', 'trust', 'foreign', 'retail_summary')),
    long_oi         INTEGER     NOT NULL,
    short_oi        INTEGER     NOT NULL,
    net_oi          INTEGER     NOT NULL,
    market_oi       INTEGER,                -- 全市場未沖銷契約量（僅 retail_summary 列必填）
    retail_ls_ratio NUMERIC,                -- 僅 retail_summary 列有值；TX 不計算
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (data_date, contract, institution)
);

-- RLS：authenticated 讀、service role 寫
ALTER TABLE futures_institutional_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "futures_institutional_daily_auth_read"
    ON futures_institutional_daily FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "futures_institutional_daily_service_write"
    ON futures_institutional_daily FOR ALL
    USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_futures_institutional_date
    ON futures_institutional_daily (data_date DESC, contract);
