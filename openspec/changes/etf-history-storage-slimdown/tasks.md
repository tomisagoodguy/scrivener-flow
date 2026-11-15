## 1. 緊急：停止刪除 ETF 持股歷史（須 2026-11-17 前上線）

- [x] 1.1 `SQLStorage.cleanup_old_data` 不再執行任何刪除 `etf_holdings_snapshot` 的語句，其他表保留規則不變（需求：ETF holdings snapshot is retained permanently；決策：停用 snapshot 的 260 天刪除）。驗證：`ETF/tests/test_cleanup_old_data.py` 新增測試斷言擷取到的 SQL 沒有任何 `DELETE FROM etf_holdings_snapshot`，並斷言 `stock_prices_daily`、`stock_broker_transactions` 仍含 `260 days`；`uv run pytest ETF/tests/test_cleanup_old_data.py` 與 `uv run ruff check ETF/database/sql_storage.py` 通過。
- [x] 1.2 [after: 1.1] 把 1.1 單獨 commit 並 push 到 main，讓 GitHub Actions 的下一次排程使用新版清理（決策：停用 snapshot 的 260 天刪除）。驗證：`git log origin/main -1` 包含此 commit；把 commit hash 記到本任務下方。
  - 已推送：`1c2b8850`（origin/master，2026-11-15），早於 2026-11-17 排程。

## 2. 例行清空舊日期屬性欄位

- [x] 2.1 [after: 1.1] 新增模組常數 `SNAPSHOT_ATTRIBUTE_RETENTION_SQL`，以 `DENSE_RANK() OVER (PARTITION BY etf_code ORDER BY data_date DESC)` 把每支 ETF 第 3 個以後日期的 14 個屬性欄位設為 NULL（`is_disposal` 為 NOT NULL，不清空），只更新至少一個屬性欄位非 NULL 的列；`cleanup_old_data` 執行它（需求：Stock attribute columns are cleared outside the latest two dates per ETF；決策：屬性欄位以每支 ETF 最新 2 日為界清空）。驗證：在記憶體 SQLite 實際執行該語句的新測試涵蓋三種情況：最新 2 日屬性保留且舊日屬性清空、`weight`/`shares` 不變；兩支 ETF 最新日期不同時逐支判斷；第二次執行更新 0 列。另斷言 `cleanup_old_data` 有執行該語句。`uv run pytest ETF/tests/test_cleanup_old_data.py` 通過。
  - 實測（2026-11-15）：SQLite 測試 4 項 RED→GREEN；Postgres `EXPLAIN` 通過；首次執行影響 153,599 列（保留 2,104 列）。**上線限制：此 commit 須在 4.3 回收 SQL 執行後才 push**，否則首次排程一次 UPDATE 15 萬列會先讓資料庫膨脹。
  - 修正（2026-11-15）：回收 SQL 實際執行時 `is_disposal` 違反 NOT NULL 約束（整條回滾，資料未變）。已將 `is_disposal` 移出 `SNAPSHOT_ATTRIBUTE_COLUMNS`；SQLite 測試表改照正式約束建 `is_disposal NOT NULL`，新增 `test_snapshot_attribute_columns_exclude_not_null_is_disposal`（RED→GREEN）；正式 DB 以 BEGIN…ROLLBACK 對 00981A 2026-04-01 試跑 50 列成功且回滾後資料不變。

## 3. 移除 pipeline 的 weight history 寫入

- [x] 3.1 pipeline 不再寫入 `etf_weight_history`：刪除 `WeightHistoryStep`（`ETF/pipeline/steps/weight_history_step.py`）與 `WeightHistoryProcessor`（`ETF/processors/weight_history_processor.py`），從 `ETF/pipeline/steps/__init__.py` 匯出與 `ETF/pipeline/orchestrator.py` 步驟清單移除；刪除 `ETFStorage.save_weight_history`；刪除 `MultiEtfStep._save_weight_history` 及主流程、gap-fill 的兩個呼叫（需求：Pipeline does not write weight history；決策：先移除寫入端再刪表）。驗證：`git grep -n "etf_weight_history" -- ETF/` 只剩註解或文件、沒有 INSERT／REST 寫入；`git grep -n "WeightHistoryStep\|save_weight_history" -- ETF/` 無結果；`uv run pytest ETF/` 與 `uv run ruff check ETF/` 通過。
- [x] 3.2 [after: 3.1] 更新文件：`.claude/rules/etf-pipeline.md` 輔助步驟表移除 `weight_history_step.py`，並註明 `etf_weight_history` 是由 snapshot 推導的 view、snapshot 永久保留；`ETF/CLAUDE.md` 相同敘述同步（決策：同名 view 取代 etf_weight_history 實體表）。驗證：派 fresh agent read-back 兩檔，回報敘述一致、無殘留「weight_history_step」步驟說明。

## 4. 資料庫 migration 與維運 SQL（檔案由 agent 撰寫，使用者手動執行）

- [x] 4.1 [after: 3.1] 撰寫 `supabase/migrations/20261115140000_etf_weight_history_as_view.sql`：先以 DO 區塊檢查舊表每列都在 snapshot 有相同 `(etf_code, stock_code, data_date, weight, shares)`，不符就 `RAISE EXCEPTION` 中止；通過後 DROP 實體表，建立 `security_invoker = true` 的同名 view（`rank` 為 `row_number()` 依 `weight DESC, stock_code`），並 `GRANT SELECT` 給 `anon`、`authenticated`（需求：Weight history is derived from the snapshot；決策：同名 view 取代 etf_weight_history 實體表）。驗證：使用者執行後以 SQL 確認 `information_schema.views` 有 `etf_weight_history`、view 列數等於 snapshot 列數、`rank` 示例（同分以 stock_code 決定）正確；把結果數字記到本任務下方。
  - 實測（2026-11-15，使用者已執行）：`etf_weight_history` table_type=VIEW、reloptions `{security_invoker=true}`、anon SELECT=true；view 155,703 列 = snapshot 155,703 列；00981A 最新日 rank 1..5 = 2330(16.38)/2454(8.55)/3017(7.69)/2383(6.63)/3037(5.63)；00981A+00980A 全部日期 rank 順序違規 0 筆；`EXPLAIN ANALYZE` 3 支 ETF × 2330 查 view 53.0 ms（< 200 ms）。
- [x] 4.2 撰寫 `supabase/migrations/20261115150000_etf_snapshot_stock_code_index.sql`，在 snapshot 建 `(stock_code, data_date)` btree 索引（需求：Snapshot lookups by stock code use an index）。驗證：使用者執行後，`EXPLAIN SELECT * FROM etf_holdings_snapshot WHERE stock_code = '2330' ORDER BY data_date DESC LIMIT 1` 顯示 Index Scan；結果記到本任務下方。
  - 實測（2026-11-15，使用者已執行）：`EXPLAIN ANALYZE ... WHERE stock_code = '2330' ORDER BY data_date DESC LIMIT 1` → Index Scan using idx_etf_holdings_snapshot_stock_date，Execution Time 0.125 ms。
- [x] 4.3 [after: 2.1] 撰寫 `supabase/maintenance/20261115_etf_storage_reclaim.sql`：先一次性執行與 `SNAPSHOT_ATTRIBUTE_RETENTION_SQL` 相同條件的屬性清空，再對 `etf_holdings_snapshot`、`etf_position_summary`、`stock_prices_daily`、`stock_broker_transactions`、`sector_strength_stocks` 執行 `VACUUM FULL`，最後查 `pg_database_size`（決策：一次性回收以手動 SQL 執行）。驗證：使用者在 pipeline 非執行時段執行後，`pg_database_size` < 500 MB；把執行前後數字記到本任務下方。
  - 實測（2026-11-15）：SQL Editor 整份執行時 VACUUM 報 transaction block 錯誤並連同 UPDATE 回滾（期間 491→497 MB）；改為逐條單獨執行。UPDATE 後舊日期帶 price 列 0、最新 2 日帶 price 1,692 列不變、snapshot 155,703 列不變、weight NULL 0、is_disposal=true 480 列不變。`pg_database_size` 497 MB → **406 MB**（< 500 MB）。各表：stock_prices_daily 82→45、sector_strength_stocks 59→37、etf_holdings_snapshot 39→27、etf_position_summary 30→24、stock_broker_transactions 32→22（MB）。

## 5. 型別與上線後驗證

- [x] 5.1 [after: 4.1] `src/types/supabase.ts` 把 `etf_weight_history` 從 `Tables` 移到 `Views`，只保留 `Row`，欄位為 view 的 7 欄且皆 nullable；讀取端程式不需改動（需求：Weight history is derived from the snapshot）。驗證：`yarn tsc --noEmit` 通過；`yarn eslint src/types/supabase.ts` 無新錯誤。
  - 實測（2026-11-15）：`yarn tsc --noEmit` 無錯誤；`yarn eslint src/types/supabase.ts` 0 errors，唯一 warning（第 9 行 consistent-type-definitions）原檔即有。型別須與 4.1 migration 一起上線。
- [x] 5.2 [after: 4.1, 4.2, 4.3] 上線後實測：`/investment/history` 頁與個股頁的比重走勢圖顯示資料，`EXPLAIN ANALYZE` 以 `etf_code` + `stock_code` 查 view 低於 200 ms（需求：Weight history is derived from the snapshot；需求：Snapshot lookups by stock code use an index）。驗證：Playwright 腳本截圖確認圖表有線條，查詢耗時寫到本任務下方。
  - 實測（2026-11-15，Playwright headless，dev server port 3000）：`/investment/history` 有資料（26 個 ETF 分頁、排名表含 2330/2454/2383 等、無 console error、無 4xx/5xx）；`/investment/stock/2330` 的 `GET /api/investment/etf-weight-history?code=2330` 回 200、26 支 ETF 有資料點、無 console error。截圖：`.playwright-mcp/history-check.png`、`.playwright-mcp/stock-2330-check.png`。view 查詢 53.0 ms（見 4.1）。`HoldingsPriceOverlayChart` 在 2330 頁未掛載，未直接驗證（同一 view、同欄位）。
  - 發現既有問題（不屬本 change，另案 bug fix）：兩個讀取點未分頁、依 data_date 升冪，受 PostgREST 1000 列上限截斷——個股 2330 只顯示到 2026-07-02（實際至 2026-11-13；舊表時代同樣截在 2026-07-03），`/investment/history` 近 90 天 65 個交易日只顯示 1 天。
