## Problem

Supabase Free Plan 的 Database Size 已達 0.744 / 0.5 GB（149%，2026-11-04 dashboard 實測）。其中最大的表是 `bare_k_snapshots`，佔 167 MB（實測），而且持續成長：2026-10-28 選股池納入同步後，每日增量從約 1.2 MB 升到約 7 MB（實測）；達到 `MAX_STOCKS = 400` 上限時約 9.5 MB／日（估計，以每列約 24 kB 乘 400 檔計算，可由上限達成後的每日新增量確認）。

## Root Cause

`bare_k_snapshots` 每一列已含約 240 個交易日的 K 線與指標，卻以 `(stock_id, date)` 每日新增一列，同一段歷史被重複儲存；且此表不在 `cleanup_old_data` 的清理清單內，舊列永遠不會被刪除。

讀取端只用每檔股票最新一列：`getStrategySnapshots`、`bare-k` 頁面與 API 都是 `order date desc limit 1`，`watch-list` 頁面撈多列後也只取每檔最新的名稱。實測 6,458 列中，每檔最新的 617 列約 14 MB，其餘 5,841 列約 135 MB 沒有任何功能使用。

## Proposed Solution

- 在 `cleanup_old_data` 新增一條刪除語句，刪除「同一 `stock_id` 已有更新日期」的列，讓每檔股票只留最新一列。
- 以「存在更新的列才刪」為條件，而不是以固定日期為條件，因此當日同步失敗或股票退出同步名單時，該股最新一列仍會保留。
- 對線上資料執行一次相同的刪除，再執行 `VACUUM FULL bare_k_snapshots`，因為 `DELETE` 只把空間標記為可重用，不會降低 Database Size。

## Non-Goals (optional)

留待 design.md 記錄。

## Success Criteria

- `cleanup_old_data` 執行後，`bare_k_snapshots` 中每個 `stock_id` 恰好一列，且為該股最新日期。
- 線上清理與 `VACUUM FULL` 完成後，`pg_total_relation_size('bare_k_snapshots')` 低於 40 MB。
- `ETF/tests/test_cleanup_old_data.py` 通過，且涵蓋裸K清理語句。
- 清理後 `/investment/bare-k/[code]` 仍能顯示完整約 240 日 K 線。

## Impact

- Affected specs: 新增 `bare-k-snapshot-retention`
- Affected code:
  - Modified: ETF/database/sql_storage.py
  - Modified: ETF/tests/test_cleanup_old_data.py
  - Modified: ETF/CLAUDE.md
- Affected data: 線上 `bare_k_snapshots` 的舊列會被永久刪除（使用者已於 2026-11-04 同意）
