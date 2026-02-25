-- =====================================================
-- Migration: 啟用 RLS 安全政策（已根據實際 Schema 修正）
-- 日期: 2026-02-25
-- =====================================================

-- ─────────────────────────────────────────────
-- 股市資料表：公開讀取，禁止寫入
-- ─────────────────────────────────────────────
ALTER TABLE public.stock_basic_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公開讀取" ON public.stock_basic_info FOR SELECT USING (true);

ALTER TABLE public.stock_revenue_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公開讀取" ON public.stock_revenue_monthly FOR SELECT USING (true);

ALTER TABLE public.stock_shareholder_weekly ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公開讀取" ON public.stock_shareholder_weekly FOR SELECT USING (true);

ALTER TABLE public.stock_broker_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公開讀取" ON public.stock_broker_transactions FOR SELECT USING (true);

-- ─────────────────────────────────────────────
-- 策略資料表：系統共用資料，公開讀取，禁止寫入
-- ─────────────────────────────────────────────
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公開讀取策略" ON public.strategies FOR SELECT USING (true);

ALTER TABLE public.strategy_daily_holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公開讀取持倉" ON public.strategy_daily_holdings FOR SELECT USING (true);

ALTER TABLE public.strategy_changes_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "公開讀取變更記錄" ON public.strategy_changes_log FOR SELECT USING (true);

-- ─────────────────────────────────────────────
-- bank_contacts：有 last_updated_by(uuid)，用登入者管控寫入
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all authenticated users to delete banks" ON public.bank_contacts;
DROP POLICY IF EXISTS "Allow all authenticated users to insert banks" ON public.bank_contacts;
DROP POLICY IF EXISTS "Allow all authenticated users to update banks" ON public.bank_contacts;

CREATE POLICY "已登入可讀取" ON public.bank_contacts FOR SELECT TO authenticated USING (true);
CREATE POLICY "已登入可新增" ON public.bank_contacts FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "已登入可更新" ON public.bank_contacts FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "已登入可刪除" ON public.bank_contacts FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- contract_clauses：共用條款庫，已登入可讀寫
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow all authenticated users to full access clauses" ON public.contract_clauses;

CREATE POLICY "已登入可讀取條款" ON public.contract_clauses FOR SELECT TO authenticated USING (true);
CREATE POLICY "已登入可寫入條款" ON public.contract_clauses FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "已登入可更新條款" ON public.contract_clauses FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL);
CREATE POLICY "已登入可刪除條款" ON public.contract_clauses FOR DELETE TO authenticated USING (auth.uid() IS NOT NULL);

-- ─────────────────────────────────────────────
-- guidelines：已登入可讀，更新須由建立者執行
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow authenticated users to update all guidelines" ON public.guidelines;

CREATE POLICY "已登入可讀取指引" ON public.guidelines FOR SELECT TO authenticated USING (true);
CREATE POLICY "已登入可新增指引" ON public.guidelines FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "已登入可更新指引" ON public.guidelines FOR UPDATE TO authenticated USING (auth.uid() = created_by);

-- ─────────────────────────────────────────────
-- case_date_logs：修正 always-true USING，改為基於 changed_by
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert logs" ON public.case_date_logs;

CREATE POLICY "透過 case 關聯讀取 logs" ON public.case_date_logs
  FOR SELECT USING (changed_by = auth.uid());
CREATE POLICY "透過 case 關聯寫入 logs" ON public.case_date_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cases
      WHERE cases.id = case_date_logs.case_id
        AND cases.user_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- 修復 Functions：固定 search_path 防止 SQL Injection
-- ─────────────────────────────────────────────
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.increment_view_count() SET search_path = public;
ALTER FUNCTION public.update_like_count() SET search_path = public;
ALTER FUNCTION public.update_modified_column() SET search_path = public;
ALTER FUNCTION public.update_redemptions_updated_at() SET search_path = public;
ALTER FUNCTION public.cleanup_old_encryption_keys() SET search_path = public;
