-- 投資監控頁公開讀取：讓未登入訪客也能瀏覽 ETF/股票數據
-- watch_list、bare_k_snapshots 維持 user-only，不在此開放

ALTER TABLE IF EXISTS public.etf_holdings_snapshot ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "公開讀取" ON public.etf_holdings_snapshot;
CREATE POLICY "公開讀取" ON public.etf_holdings_snapshot FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.etf_diff_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "公開讀取" ON public.etf_diff_logs;
CREATE POLICY "公開讀取" ON public.etf_diff_logs FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.etf_stock_overlap ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "公開讀取" ON public.etf_stock_overlap;
CREATE POLICY "公開讀取" ON public.etf_stock_overlap FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.etf_weight_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "公開讀取" ON public.etf_weight_history;
CREATE POLICY "公開讀取" ON public.etf_weight_history FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.etf_aum ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "公開讀取" ON public.etf_aum;
CREATE POLICY "公開讀取" ON public.etf_aum FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.etf_sectors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "公開讀取" ON public.etf_sectors;
CREATE POLICY "公開讀取" ON public.etf_sectors FOR SELECT USING (true);

ALTER TABLE IF EXISTS public.stock_prices_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "公開讀取" ON public.stock_prices_daily;
CREATE POLICY "公開讀取" ON public.stock_prices_daily FOR SELECT USING (true);
