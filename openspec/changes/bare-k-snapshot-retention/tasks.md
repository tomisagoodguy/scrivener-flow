## 1. 每日清理

- [x] 1.1 先寫會失敗的測試，描述 Keep only the latest snapshot per stock：在記憶體 SQLite 建 `bare_k_snapshots`，實際執行 `BARE_K_RETENTION_SQL`，斷言多日股票只留最新列、單列股票保留、重跑刪除 0 筆；另斷言 `cleanup_old_data` 執行了該語句。對應決策「刪除語句抽成可測試的模組常數」。驗證：`uv run pytest ETF/tests/test_cleanup_old_data.py` 在實作前失敗。
- [x] 1.2 [after: 1.1] 新增 `BARE_K_RETENTION_SQL` 並在 `cleanup_old_data` 的同一交易內執行、log 刪除筆數，落實決策「以存在更新列為刪除條件」與「保留現有 schema 不改為每檔一列的主鍵」，不動 migration 與讀取端。驗證：`uv run pytest ETF/tests/test_cleanup_old_data.py` 全數通過，`uv run ruff check ETF/database/sql_storage.py ETF/tests/test_cleanup_old_data.py` 無錯誤。
- [x] 1.3 [after: 1.2] 補測試確認 Snapshot cleanup failure does not stop the pipeline：`conn.execute` 拋例外時 `cleanup_old_data` 不往外拋，且記錄 error。驗證：`uv run pytest ETF/tests/test_cleanup_old_data.py` 通過。
- [x] 1.4 [after: 1.2] 在 `ETF/CLAUDE.md` 記錄 `bare_k_snapshots` 每檔只留最新一列，讓後續維護者知道不可依賴歷史快照。驗證：內容檢閱，該段落說明保留規則與原因。

## 2. 線上一次性清理

- [x] 2.1 [after: 1.2] 依決策「線上一次性清理由使用者在 SQL Editor 執行」，使用者在 Supabase SQL Editor 依序執行刪除語句與 `VACUUM FULL bare_k_snapshots;`，時段避開 pipeline。驗證：`select count(*), count(distinct stock_id) from bare_k_snapshots` 兩數相等，`pg_total_relation_size('bare_k_snapshots')` 低於 40 MB，結果數字寫回本任務。
- [x] 2.2 [after: 2.1] 確認清理後裸K頁面資料完整。驗證：實跑 `/investment/bare-k/2330`，圖表顯示約 240 日 K 線，結果寫回本任務。

## 實測紀錄（2026-11-04）

- 2.1：使用者在 SQL Editor 執行刪除與 `VACUUM FULL` 後查詢，`count(*)` = 617、`count(distinct stock_id)` = 617、`pg_total_relation_size('bare_k_snapshots')` = 16,965,632 bytes（16 MB，門檻 40 MB）、`pg_database_size` = 570,797,203 bytes（544 MB，清理前 695 MB）。2330 的 `ohlcv` 長度 240、日期 2026-11-03。
- 2.2：驗證目標由 `/investment/bare-k/2330` 改為 `/investment/pool-chart`。原頁面只列 `watch_list` 的股票，而該表目前 0 列，頁面顯示「1 / 0」，與本次清理無關（`bare_k_snapshots` 仍有 2330）。`/investment/pool-chart` 以 headless Chrome 實跑：HTTP 200、Server Action 200、無 page error，2330 顯示「近 240 日」、日期 2026-11-03，截圖可見 2025 年底至 2026 年 11 月完整 K 線。兩頁都是取該股最新一列，欄位相同。

