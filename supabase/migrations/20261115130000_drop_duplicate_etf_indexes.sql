-- 刪除 ETF 相關表的重複／幾乎未使用索引（Free 方案 500 MB 上限，2026-11-15 實測 528 MB）
-- 依據：pg_stat_user_indexes 與 pg_get_indexdef 實測；程式碼與 migration 均無依賴這些索引名（僅依賴 PK / uq 約束）
-- 執行方式：Supabase SQL Editor 手動執行；只刪索引，不動資料

-- etf_weight_history：與 idx_etf_weight_history_etf_code 定義完全相同 (etf_code, data_date DESC)
DROP INDEX IF EXISTS public.idx_ewh_etf_date;

-- etf_weight_history：與 UNIQUE 約束 uq_etf_weight_history 欄位相同 (etf_code, stock_code, data_date)
DROP INDEX IF EXISTS public.idx_ewh_stock_date;

-- etf_holdings_snapshot：與 idx_etf_holdings_snapshot_etf_code 重複 (etf_code)，累計僅 9 次掃描
DROP INDEX IF EXISTS public.idx_etf_snapshot_code;

-- etf_position_summary：累計僅 4 次掃描，PK 與 idx_etf_position_etf_date 已涵蓋查詢
DROP INDEX IF EXISTS public.idx_etf_position_active;
