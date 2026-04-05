-- ETF 持股權重走勢表
-- 每日快照結束後從 etf_holdings_snapshot 聚合而來，
-- 供前端 Dashboard 繪製各成分股歷史權重走勢圖（對齊 kevin12596 的 history.py 功能）

CREATE TABLE IF NOT EXISTS etf_weight_history (
    id             BIGSERIAL PRIMARY KEY,
    etf_code       TEXT        NOT NULL,
    stock_code     TEXT        NOT NULL,
    stock_name     TEXT,
    data_date      DATE        NOT NULL,
    weight         NUMERIC(8, 4) NOT NULL,    -- 當日持倉權重 %
    shares         BIGINT,                    -- 當日持股股數
    rank           SMALLINT,                  -- 當日持倉排名（按權重降序，1 = 最大）
    created_at     TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_etf_weight_history UNIQUE (etf_code, stock_code, data_date)
);

-- 查詢走勢圖時的常用索引
CREATE INDEX IF NOT EXISTS idx_ewh_etf_date
    ON etf_weight_history (etf_code, data_date DESC);

CREATE INDEX IF NOT EXISTS idx_ewh_stock_date
    ON etf_weight_history (etf_code, stock_code, data_date DESC);

-- 同時補強 etf_diff_logs，加入 prev_weight / curr_weight / is_significant 欄位
ALTER TABLE etf_diff_logs
    ADD COLUMN IF NOT EXISTS prev_shares     BIGINT,
    ADD COLUMN IF NOT EXISTS curr_shares     BIGINT,
    ADD COLUMN IF NOT EXISTS prev_weight     NUMERIC(8, 4),
    ADD COLUMN IF NOT EXISTS curr_weight     NUMERIC(8, 4),
    ADD COLUMN IF NOT EXISTS is_significant  BOOLEAN DEFAULT TRUE;

-- CLOSE 是新的 change_type，不需要修改約束（欄位為 TEXT）

COMMENT ON TABLE etf_weight_history IS
    'ETF 各成分股歷史持倉權重走勢，每日 pipeline 結束後 upsert';

COMMENT ON COLUMN etf_weight_history.rank IS
    '當日持倉排名，1 = 權重最大。前端可依 rank <= N 篩選 Top5/10/15/全部';
