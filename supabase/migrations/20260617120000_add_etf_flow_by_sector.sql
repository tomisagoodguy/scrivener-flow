-- 為 etf_flow_daily 新增每日產業資金流彙總欄位（by_sector）
-- 兩層結構：母題材聚合 + children 子題材明細
-- [{sector, net_nt, in_nt, out_nt, in_count, out_count, children: [{sector, net_nt, in_nt, out_nt, in_count, out_count}]}]
-- nullable：歷史列維持 NULL（不回填），前端對 NULL 顯示「無產業資料」

ALTER TABLE etf_flow_daily
    ADD COLUMN IF NOT EXISTS by_sector JSONB;
