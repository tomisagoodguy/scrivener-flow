-- 為 market_treemap_daily 新增當日成交值（turnover）欄位
-- 用途：熱力圖「資金熱度」顯示維度，方塊大小 = |change_pct| × turnover
-- 單位：元（BIGINT，全市場單股單日成交值上限遠低於 bigint 上限，無溢位風險）
-- 可為 null：上線前舊列與 FinLab 缺值者為 null，前端於 money_heat 模式退回極小正值

ALTER TABLE market_treemap_daily
    ADD COLUMN IF NOT EXISTS turnover BIGINT;

COMMENT ON COLUMN market_treemap_daily.turnover IS '當日成交值（元），來源 FinLab price:成交金額；null 表示缺值';
