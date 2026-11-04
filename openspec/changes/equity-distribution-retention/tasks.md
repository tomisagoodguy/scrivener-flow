## 1. 每日清理

- [x] 1.1 先寫會失敗的測試，描述 Keep two years of equity distribution snapshots：`cleanup_old_data` 對 `equity_distribution_stats` 恰好發出一條 `DELETE FROM`，條件含 `snapshot_date` 與 `730 days`。驗證：`uv run pytest ETF/tests/test_cleanup_old_data.py` 在實作前失敗。
- [x] 1.2 [after: 1.1] 在 `cleanup_old_data` 同一交易內刪除超過 730 天的 `equity_distribution_stats` 列並 log 筆數。驗證：`uv run pytest ETF/tests/test_cleanup_old_data.py` 通過，`uv run ruff check ETF/database/sql_storage.py ETF/tests/test_cleanup_old_data.py` 無錯誤。
- [x] 1.3 [after: 1.2] 在 `ETF/CLAUDE.md` 記錄此表保留 2 年，以及 `--force-backfill` 補回的舊期會在下次清理刪除。驗證：內容檢閱，該段落說明保留期與回補行為。

## 2. 線上一次性清理

- [ ] 2.1 [after: 1.2] 使用者在 Supabase SQL Editor 執行刪除語句與 `VACUUM FULL equity_distribution_stats;`，時段避開 pipeline。驗證：`select min(snapshot_date) from equity_distribution_stats` 不早於 730 天前，`pg_total_relation_size('equity_distribution_stats')` 低於 20 MB，結果數字寫回本任務。
