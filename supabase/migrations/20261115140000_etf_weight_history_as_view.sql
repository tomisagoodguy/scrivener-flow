-- etf_weight_history 改為由 etf_holdings_snapshot 推導的同名 view
-- change: etf-history-storage-slimdown（需求：Weight history is derived from the snapshot；決策：同名 view 取代 etf_weight_history 實體表）
--
-- 前提（決策：先移除寫入端再刪表）：pipeline 移除 weight history 寫入的 commit 已部署
-- 執行方式：Supabase SQL Editor 手動執行（含 DROP TABLE，不可逆）
-- 安全檢查：舊表任一列在 snapshot 找不到相同 (etf_code, stock_code, data_date, weight, shares) 就中止，不刪表
--          2026-11-15 實測 154,572 / 154,572 列相同

DO $$
DECLARE
    missing_rows bigint;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'etf_weight_history' AND c.relkind = 'r'
    ) THEN
        SELECT count(*) INTO missing_rows
        FROM public.etf_weight_history w
        WHERE NOT EXISTS (
            SELECT 1 FROM public.etf_holdings_snapshot h
            WHERE h.etf_code = w.etf_code
              AND h.stock_code = w.stock_code
              AND h.data_date = w.data_date
              AND h.weight = w.weight
              AND h.shares IS NOT DISTINCT FROM w.shares
        );

        IF missing_rows > 0 THEN
            RAISE EXCEPTION 'etf_weight_history 有 % 列不在 etf_holdings_snapshot，中止刪表', missing_rows;
        END IF;

        DROP TABLE public.etf_weight_history;
    END IF;
END $$;

-- security_invoker：讀取者套用 etf_holdings_snapshot 的 RLS（公開讀），不以 view 擁有者權限繞過
CREATE OR REPLACE VIEW public.etf_weight_history
WITH (security_invoker = true) AS
SELECT
    etf_code,
    stock_code,
    stock_name,
    data_date,
    weight,
    shares,
    row_number() OVER (PARTITION BY etf_code, data_date ORDER BY weight DESC, stock_code) AS rank
FROM public.etf_holdings_snapshot;

COMMENT ON VIEW public.etf_weight_history IS
    '由 etf_holdings_snapshot 推導的持股比重歷史；rank 為同 ETF 同日依 weight 降序（同分依 stock_code）的名次。唯讀。';

GRANT SELECT ON public.etf_weight_history TO anon, authenticated;

-- 讓 PostgREST 立即認得表→view 的變化
NOTIFY pgrst, 'reload schema';

-- 驗證：
-- SELECT table_type FROM information_schema.tables WHERE table_name = 'etf_weight_history';  -- 預期 VIEW
-- SELECT (SELECT count(*) FROM etf_weight_history) = (SELECT count(*) FROM etf_holdings_snapshot);  -- 預期 true
-- SELECT stock_code, weight, rank FROM etf_weight_history
--   WHERE etf_code = '00981A' AND data_date = (SELECT max(data_date) FROM etf_holdings_snapshot WHERE etf_code = '00981A')
--   ORDER BY rank LIMIT 5;  -- 預期 rank 1..5 對應 weight 由大到小
