-- etf_holdings_snapshot 以 stock_code 查詢的索引（change: etf-history-storage-slimdown，需求：Snapshot lookups by stock code use an index）
-- 原因：個股頁（stock/[code]、useStockDetailData）以 stock_code 篩選，PK (etf_code, stock_code, data_date) 用不上，
--       2026-11-15 實測該表累計 seq scan 讀取 129,299,076 列，是 Disk IO 來源之一
-- 執行方式：Supabase SQL Editor 手動執行；表約 15 萬列，建立時間預估數秒（估算）

CREATE INDEX IF NOT EXISTS idx_etf_holdings_snapshot_stock_date
    ON public.etf_holdings_snapshot USING btree (stock_code, data_date DESC);

-- 驗證（預期出現 Index Scan using idx_etf_holdings_snapshot_stock_date）：
-- EXPLAIN SELECT * FROM etf_holdings_snapshot WHERE stock_code = '2330' ORDER BY data_date DESC LIMIT 1;
