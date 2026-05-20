-- market_treemap_daily 是全市場公用資料，允許已登入用戶讀取
CREATE POLICY "authenticated users can read market_treemap_daily"
ON market_treemap_daily
FOR SELECT
TO authenticated
USING (true);
