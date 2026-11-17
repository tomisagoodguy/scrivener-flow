-- etf_holdings_snapshot 新增 rank 欄位並回填（view 暫不變）
-- change: store-weight-history-rank（需求：Weight history rank is stored at write time；
--         決策：分兩支 migration，依序部署；決策：回填比對作為驗收）
--
-- 目的：etf_weight_history view 目前以視窗函式即時算 rank，依股票篩選時要先對整張表排名
--       （2026-11-15 實測 2330 每頁約 300 ms，冷啟動逾時）。先把 rank 存進 snapshot，
--       待 pipeline 寫入 rank 上線後，再由 20261116100000 把 view 改讀此欄位。
-- 規則：與 view 相同——同 etf_code、同 data_date 內依 weight 降序，同分依 stock_code 升冪，1 起算。
-- 執行方式：Supabase SQL Editor 手動執行（不含 DROP；可重複執行，只更新不一致的列）。

ALTER TABLE public.etf_holdings_snapshot
    ADD COLUMN IF NOT EXISTS rank integer;

COMMENT ON COLUMN public.etf_holdings_snapshot.rank IS
    '同 ETF 同日依 weight 降序（同分依 stock_code 升冪）的名次，1 起算；由 pipeline 寫入，永久保留。';

UPDATE public.etf_holdings_snapshot AS s
SET rank = r.rn
FROM (
    SELECT
        etf_code,
        stock_code,
        data_date,
        row_number() OVER (PARTITION BY etf_code, data_date ORDER BY weight DESC, stock_code) AS rn
    FROM public.etf_holdings_snapshot
) AS r
WHERE s.etf_code = r.etf_code
  AND s.stock_code = r.stock_code
  AND s.data_date = r.data_date
  AND s.rank IS DISTINCT FROM r.rn;

-- 驗證（預期皆為 0）：
-- SELECT count(*) AS mismatched FROM (
--     SELECT rank,
--            row_number() OVER (PARTITION BY etf_code, data_date ORDER BY weight DESC, stock_code) AS rn
--     FROM public.etf_holdings_snapshot
-- ) x WHERE rank IS DISTINCT FROM rn;
-- SELECT count(*) AS null_rank FROM public.etf_holdings_snapshot WHERE rank IS NULL;
--
-- 回收 UPDATE 產生的 dead tuples（不可包在 transaction 內，單獨執行）：
-- VACUUM public.etf_holdings_snapshot;
