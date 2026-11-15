-- 一次性空間回收（change: etf-history-storage-slimdown，決策：一次性回收以手動 SQL 執行）
-- 目的：Supabase Free 方案上限 500 MB；2026-11-15 刪重複索引後實測 516 MB
--
-- 執行方式（Supabase SQL Editor）：
--   1. 在 pipeline 非執行時段執行（VACUUM FULL 會鎖表，執行期間該表無法讀寫）
--   2. 步驟 A、B 可一起執行
--   3. 步驟 C 的每一行 VACUUM FULL「各自單獨選取後執行」：VACUUM 不能在 transaction 內，
--      和其他語句一起送出可能報 "VACUUM cannot run inside a transaction block"
--   4. 最後執行步驟 D，把數字回報

-- 步驟 A：執行前大小
SELECT pg_size_pretty(pg_database_size(current_database())) AS before_size;

-- 步驟 B：舊日期屬性欄位一次性清空（與 ETF/database/sql_storage.py 的 SNAPSHOT_ATTRIBUTE_RETENTION_SQL 相同條件）
--        2026-11-15 實測影響 153,599 列，保留每支 ETF 最新 2 個日期共 2,104 列
UPDATE etf_holdings_snapshot
SET price = NULL, currency = NULL, amount = NULL, margin_ratio = NULL, change_percent = NULL,
    volatility = NULL, market_cap = NULL, is_high_5d = NULL, is_high_20d = NULL, is_high_200d = NULL,
    monthly_revenue = NULL, revenue_yoy = NULL, revenue_mom = NULL, revenue_momentum_rank = NULL,
    is_disposal = NULL
WHERE (etf_code, data_date) IN (
    SELECT etf_code, data_date FROM (
        SELECT etf_code, data_date,
               DENSE_RANK() OVER (PARTITION BY etf_code ORDER BY data_date DESC) AS date_rank
        FROM (SELECT DISTINCT etf_code, data_date FROM etf_holdings_snapshot) AS d
    ) AS ranked
    WHERE date_rank > 2
)
  AND (price IS NOT NULL OR currency IS NOT NULL OR amount IS NOT NULL OR margin_ratio IS NOT NULL
       OR change_percent IS NOT NULL OR volatility IS NOT NULL OR market_cap IS NOT NULL
       OR is_high_5d IS NOT NULL OR is_high_20d IS NOT NULL OR is_high_200d IS NOT NULL
       OR monthly_revenue IS NOT NULL OR revenue_yoy IS NOT NULL OR revenue_mom IS NOT NULL
       OR revenue_momentum_rank IS NOT NULL OR is_disposal IS NOT NULL);

-- 步驟 C：重寫表與索引、把空間還給磁碟（每行單獨執行）
VACUUM FULL ANALYZE public.etf_holdings_snapshot;
VACUUM FULL ANALYZE public.etf_position_summary;
VACUUM FULL ANALYZE public.stock_prices_daily;
VACUUM FULL ANALYZE public.stock_broker_transactions;
VACUUM FULL ANALYZE public.sector_strength_stocks;

-- 步驟 D：執行後大小（目標 < 500 MB）與各表大小
SELECT pg_size_pretty(pg_database_size(current_database())) AS after_size;
SELECT relname, pg_size_pretty(pg_total_relation_size(oid)) AS total
FROM pg_class
WHERE relname IN ('etf_holdings_snapshot', 'etf_position_summary', 'stock_prices_daily',
                  'stock_broker_transactions', 'sector_strength_stocks')
ORDER BY pg_total_relation_size(oid) DESC;
