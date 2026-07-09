-- 基金雙軌四表 RLS 由 authenticated 讀改為公開讀
-- 原因：既有投資表（etf_signals 等）實際為公開讀（USING (true)），
-- /investment/manager 與其他投資頁一致支援未登入瀏覽；寫入仍限 service role。
-- 決策：2026-07-08 使用者裁決（design「比照 etf_signals」的正確詮釋）。

DROP POLICY IF EXISTS "fund_holdings_monthly_auth_read" ON fund_holdings_monthly;
CREATE POLICY "fund_holdings_monthly_public_read"
    ON fund_holdings_monthly FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "fund_holdings_quarterly_auth_read" ON fund_holdings_quarterly;
CREATE POLICY "fund_holdings_quarterly_public_read"
    ON fund_holdings_quarterly FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "fund_manager_map_auth_read" ON fund_manager_map;
CREATE POLICY "fund_manager_map_public_read"
    ON fund_manager_map FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "fund_signals_auth_read" ON fund_signals;
CREATE POLICY "fund_signals_public_read"
    ON fund_signals FOR SELECT
    USING (true);
