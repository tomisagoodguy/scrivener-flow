-- 市場機制欄位：折溢價與 AUM 成長拆解（etf-market-mechanics）
-- close/premium_pct：ETF 收盤價與折溢價 %（close 或 nav 缺 → NULL，不估計）
-- inflow/market_pnl：當日淨申購與市值貢獻（億元，近似式：units 由 AUM/NAV 推算）
-- 註：既有 inflow_100m 為舊拆解欄位；新 inflow 採 Δunits × nav_t 口徑，兩者並存由 pipeline 維護

ALTER TABLE etf_aum_series
    ADD COLUMN IF NOT EXISTS close       NUMERIC,   -- ETF 自身收盤價（FinLab）
    ADD COLUMN IF NOT EXISTS premium_pct NUMERIC,   -- (close - nav) / nav * 100，NULL = 該日無法計算
    ADD COLUMN IF NOT EXISTS inflow      NUMERIC,   -- (units_t - units_{t-1}) * nav_t（億元），首日 NULL
    ADD COLUMN IF NOT EXISTS market_pnl  NUMERIC;   -- units_{t-1} * (nav_t - nav_{t-1})（億元），首日 NULL
