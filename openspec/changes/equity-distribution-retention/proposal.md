## Problem

Supabase Free Plan 的 Database Size 在裸K清理後仍為 544 MB（實測 2026-11-04），高於 0.5 GB。`equity_distribution_stats` 佔 52 MB，資料從 2016-11-04 開始累積，且持續每週增加。

## Root Cause

此表不在 `cleanup_old_data` 的清理清單內。讀取端（前端籌碼排行、`getSectorStrength`、`sync_bare_k_step`、`shareholder_signal_step`）只用最近幾期，2 年前的資料沒有功能使用。

## Proposed Solution

- 在 `cleanup_old_data` 刪除 `snapshot_date` 超過 730 天的列。
- 對線上資料執行一次相同刪除，再執行 `VACUUM FULL equity_distribution_stats`。實測可刪 91,322 / 120,296 列，保留 2024-11-08 以後的資料（使用者已於 2026-11-04 同意只留 2 年）。

## Non-Goals (optional)

- 不調整此表的索引與 schema。
- 不修改 `--backfill-history`、`--force-backfill`；它們只能手動觸發，補回的舊期會在下次清理刪除。
- 本 change 完成後 Database Size 預估約 0.53 GB，仍高於 0.5 GB（估計，以清理後 `pg_database_size` 確認），降到額度內由後續 change 處理。

## Success Criteria

- `cleanup_old_data` 對此表發出一條 730 天條件的 `DELETE`。
- 線上 `min(snapshot_date)` 不早於 730 天前，表大小低於 20 MB。
- `ETF/tests/test_cleanup_old_data.py` 通過。

## Impact

- Affected specs: 新增 `equity-distribution-retention`
- Affected code:
  - Modified: ETF/database/sql_storage.py
  - Modified: ETF/tests/test_cleanup_old_data.py
  - Modified: ETF/CLAUDE.md
- Affected data: 線上 `equity_distribution_stats` 超過 730 天的列會被刪除，可由 FinLab 以 `--backfill-history` 重新取得
