## Problem

`stock_prices_daily` 自 2026-04 起大量列的 `close` 為 NULL（2026-11-03 實測）：2026-05-01 以來 48,525 / 242,876 列。分兩類：

- **整天缺價**：6～7 月約 47% 的列為 NULL，例如 2026-05-29、06-01～06-03、06-05、06-08、06-10 當天約 1,865 / 1,960 檔全無價（連 2330 都缺）。FinLab `price:收盤價` 現在這些日期都有值（2330 於 05-29 為 2,355），資料可回補。
- **每日固定約 5%**：每天 70～100 檔。以 2026-10-30 的 89 檔實測，FinLab 當天收盤價全為 NaN（無成交，或最後有效日停在 2022、2024 的下市股）。

影響所有讀收盤價的功能：買進模式前瞻報酬與平常日基準（20 日覆蓋率因此卡在 90.55%）、ETF 持股現價補值、資金流向、持倉損益等。

## Root Cause

1. **已證實** `OhlcvService.get_ohlcv` 以 `pd.concat(axis=1)` 合併開高低收量與融資使用率、投信買賣超，後兩者缺值補 0。只要價格表當天沒有該股（尚未更新、無成交、已下市），就會產生「只有融資、沒有價格」的列。實測 NULL 列除 `margin_ratio` 外全是寫入預設值（volume 0、it_buy 0），`created_at` 都是當天 pipeline 執行時間。
2. **已證實** `Storage.save_stock_prices` 以 REST `resolution=merge-duplicates` 寫入，把 `close: None` 一併寫入；同鍵已有正確價格時也會被 NULL 覆蓋。
3. **推測（無 CI log 可證）** 之後每日重抓 30 天窗口理應覆蓋回正確價格，6～7 月的整天缺價卻從未復原。`save_stock_prices` 每 500 筆一批，批次失敗只 `logger.error` 後繼續（例如 payload 含 `Infinity`、逾時），寫入失敗不會中斷也不易察覺，是最可能的原因。

## Proposed Solution

- 寫入改走 `SQLStorage`：純函式 `build_price_records` 只保留 `close` 非 NULL 的列並把 ±inf 轉 NULL，再以 `_bulk_upsert`（execute_values、單一交易）寫入；失敗整批 rollback 並由 `SyncOHLCVStep` 記錄錯誤（輔助步驟不 raise）。刪除 REST 版 `Storage.save_stock_prices`。
- 新增一次性修復腳本 `ETF/scripts/repair_stock_prices.py --since YYYY-MM-DD [--dry-run]`：找出期間內 NULL close 的股票，向 FinLab 重抓並 upsert 有價的列，回報修復筆數與仍無價的筆數。
- 修復後重跑 `backfill_future_returns.py` 與買進模式統計重算。
- 修復後仍無價的列（無成交、下市）是否刪除，apply 時向使用者確認。

## Non-Goals

- 不處理下市股仍在同步名單的問題（另見 `cleanup-inactive-stocks` change）。
- 不改 CI 的 FinLab 快取設定；不改 30 天同步窗口。
- 不補 2026-04-01 以前的資料（3 月實測無 NULL）。

## Success Criteria

- 新寫入不再產生 `close` 為 NULL 的列：`build_price_records` 測試涵蓋 NaN close 被排除、inf 轉 NULL；`SyncOHLCVStep` 寫入失敗時記錄錯誤且不中斷 pipeline。
- 修復後 SQL 實測：2026-04-01 起 `close IS NULL` 的列中，FinLab 當天有收盤價者為 0。
- 修復並重算後，買進模式 20 日報酬覆蓋率（`event_date + 22 <= 執行日` 且事件日有收盤價的事件）由 90.55% 提升到 ≥ 98%。

## Impact

- Affected specs: stock-price-sync-integrity（新增）
- Affected code:
  - Modified: ETF/database/sql_storage.py（新增 build_price_records、upsert_stock_prices）
  - Modified: ETF/pipeline/steps/sync_ohlcv_step.py（改用 SQL 寫入、錯誤處理）
  - Modified: ETF/database/storage.py（移除 save_stock_prices）
  - Modified: ETF/CLAUDE.md（常見錯誤表新增陷阱）
  - New: ETF/scripts/repair_stock_prices.py
  - Modified: ETF/tests/test_margin_percentile.py（margin_pct_rank 的 NULL 保留測試改測新寫入函式）
  - New: ETF/tests/test_stock_price_sync.py
  - Removed: none
