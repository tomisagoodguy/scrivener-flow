-- 擴充 etf_aum_series：新增累計淨申購與成長歸因欄位
-- 保留既有欄位（aum_100m, nav, units, inflow_100m）不變

ALTER TABLE etf_aum_series
    ADD COLUMN IF NOT EXISTS cumulative_inflow_yi    NUMERIC,   -- 累計淨申購（億元，滾動）
    ADD COLUMN IF NOT EXISTS inflow_share_of_growth  NUMERIC;   -- 申購貢獻率（0~1），AUM 未成長時為 null
