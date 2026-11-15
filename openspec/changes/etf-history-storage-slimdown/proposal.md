## Summary

停止刪除無法重抓的 ETF 持股歷史，並把重複存放的 `etf_weight_history` 改為由 `etf_holdings_snapshot` 即時推導的同名 view，同時清空舊日期不再被讀取的個股屬性欄位，讓資料庫回到 Supabase Free 方案 500 MB 上限以下。

## Motivation

- 2026-11-15 實測：資料庫 528 MB，已超過 Free 方案 500 MB 上限，並收到 Disk IO Budget 警告。
- `ETF/database/sql_storage.py` 的 `cleanup_old_data` 會刪除 260 天前的 `etf_holdings_snapshot`。snapshot 最早日期為 2026-03-02，2026-11-17 起開始不可逆地流失持股歷史（爬蟲只能抓當日，無法回補）。使用者決策：ETF 持股歷史永久保留。
- 實測 `etf_weight_history`（36 MB，2026-04-02 起，154,572 列）每一列的 `(etf_code, stock_code, data_date, weight, shares)` 都能在 snapshot 找到完全相同的列；它是 snapshot 的子集，額外欄位 `rank`、`stock_name` 都可由 snapshot 推導。
- snapshot 每列帶 14 個個股屬性欄位（價格、漲跌、營收等），前端與 pipeline 只讀每支 ETF 最新 2 個日期的屬性值；舊日期的值無人讀取卻持續占空間。
- snapshot 沒有以 `stock_code` 開頭的索引，個股頁以 `stock_code` 查詢時走全表掃描（實測累計讀取 129,299,076 列），是 Disk IO 來源之一。

## Proposed Solution

1. `cleanup_old_data` 不再刪除 `etf_holdings_snapshot` 的任何列（最優先，須於 2026-11-17 前上線）。
2. `cleanup_old_data` 新增例行動作：每支 ETF 最新 2 個 `data_date` 之外的列，把 14 個個股屬性欄位設為 NULL；`etf_code`、`stock_code`、`stock_name`、`data_date`、`weight`、`shares`、`updated_at` 保留。
3. 移除 pipeline 所有寫入 `etf_weight_history` 的程式（`WeightHistoryStep`、`ETFStorage.save_weight_history`、`MultiEtfStep._save_weight_history`）。
4. migration：刪除 `etf_weight_history` 實體表，建立同名 view（`security_invoker = true`），欄位 `etf_code, stock_code, stock_name, data_date, weight, shares, rank`，`rank` 以 `row_number()` 依 `weight DESC, stock_code` 於 `(etf_code, data_date)` 內計算。前端 5 個讀取點不需改動。
5. migration：snapshot 新增 `(stock_code, data_date)` 索引。
6. 一次性維運 SQL：既有舊日期屬性欄位清空、`VACUUM FULL` 回收空間，由使用者在 Supabase SQL Editor 手動執行，完成後以 `pg_database_size` 驗證低於 500 MB。

## Non-Goals (optional)

## Alternatives Considered (optional)

- 保留 `etf_weight_history` 作長期歷史、snapshot 只留短期：pipeline 的 `flow_compute_step`、`frontrunning_step`、`signal_detect_step`、`active_share_step` 與前端多處都讀 snapshot 歷史，改動面更大且仍存兩份。
- 各讀取點改查 snapshot 並在應用層算 rank：要改 5 個讀取點，且以 `stock_code` 篩選時必須另抓整支 ETF 當日持股才能算 rank；同名 view 在資料庫內完成，讀取點零改動。
- 升級付費方案：不解決重複存放與歷史流失。

## Impact

- Affected specs: etf-holdings-history-storage（新增）
- Affected code:
  - Modified: ETF/database/sql_storage.py
  - Modified: ETF/tests/test_cleanup_old_data.py
  - Modified: ETF/database/storage.py
  - Modified: ETF/pipeline/steps/multi_etf_step.py
  - Modified: ETF/pipeline/orchestrator.py
  - Modified: ETF/pipeline/steps/__init__.py
  - Modified: src/types/supabase.ts
  - Modified: .claude/rules/etf-pipeline.md
  - Modified: ETF/CLAUDE.md
  - New: supabase/migrations/20261115140000_etf_weight_history_as_view.sql
  - New: supabase/migrations/20261115150000_etf_snapshot_stock_code_index.sql
  - New: supabase/maintenance/20261115_etf_storage_reclaim.sql
  - Removed: ETF/pipeline/steps/weight_history_step.py
  - Removed: ETF/processors/weight_history_processor.py
