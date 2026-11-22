## 1. 子句產生器

- [x] 1.1 新增 `ETF/database/upsert_sql.py` 的 `conflict_update_clause(table, columns, touch=())`：輸出 `DO UPDATE SET ... WHERE (<table>.cols) IS DISTINCT FROM (EXCLUDED.cols)`，touch 欄位設 `NOW()` 且不進比較，`columns` 為空或與 `touch` 重疊時 raise `ValueError`（需求：Conflict update clause builder；決策 1：以 IS DISTINCT FROM 在 DB 端守門；決策 2：共用子句產生器 conflict_update_clause）。驗證：新建 `ETF/tests/test_upsert_sql.py`，以 spec 三個 scenario 的字串逐字比對與兩種 `ValueError`；`uv run pytest ETF/tests/test_upsert_sql.py` 通過。

## 2. SQLStorage 寫入點

- [x] 2.1 [after: 1.1] `SQLStorage.upsert_stock_prices` 改用 `conflict_update_clause("stock_prices_daily", PRICE_COLUMNS[2:])`，價格欄位全相同的衝突列不再改寫，回傳值仍為送出筆數（需求：Atomic price upsert with visible failure；決策 4：upsert_stock_prices 回傳值維持送出筆數）。驗證：`ETF/tests/test_upsert_sql.py` 新增測試 mock `_bulk_upsert` 擷取 SQL，斷言含 `WHERE (stock_prices_daily.open, ` 與 `IS DISTINCT FROM`；`uv run pytest ETF/tests/test_stock_price_sync.py` 既有斷言（含 `ON CONFLICT (stock_code, data_date) DO UPDATE`、回傳 3）不退步。
- [x] 2.2 [after: 2.1] `SQLStorage` 其餘六個寫入點（`save_diff_logs`、`upsert_revenue_data`、`upsert_shareholder_data`、`upsert_broker_transactions`、`upsert_strategy_trades`、`upsert_strategy_signals`）改用 helper，原本 SET 內的 `created_at = NOW()`／`updated_at = NOW()` 改為 touch 欄位，內容相同的列不改寫（需求：Recurring upserts skip unchanged rows；需求：Touch timestamps record content changes；決策 3：時間戳改為 touch 欄位，語意變為最後內容變更時間）。驗證：`ETF/tests/test_upsert_sql.py` 每個方法一個測試，擷取 SQL 斷言含 `IS DISTINCT FROM`、`WHERE` 之前沒有手寫的 `= NOW()`、比較清單不含 touch 欄位；`uv run pytest ETF/tests/test_sql_storage_bulk_upsert.py` 不退步。

## 3. Pipeline 步驟寫入點

- [x] 3.1 [after: 2.2] `SectorStrengthStep` 的 sector、sector-stock、equity-distribution 三條 upsert 改用 helper，`created_at`／`updated_at` 為 touch 欄位（需求：Recurring upserts skip unchanged rows；需求：Touch timestamps record content changes）。驗證：`ETF/tests/test_upsert_sql.py` 新增測試 mock 連線擷取三條 SQL 斷言守門存在，並對應 spec「Unchanged sector stock keeps its timestamp」斷言 `created_at` 不在比較清單；`uv run pytest ETF/tests/test_sector_fund_flow.py` 不退步。
- [x] 3.2 [after: 3.1] `MarketChipsStep` 的 futures、margin、institutional、institutional-signal 四條 upsert 改用 helper，`created_at` 為 touch 欄位（需求：Recurring upserts skip unchanged rows）。驗證：`ETF/tests/test_upsert_sql.py` 擷取四條 SQL 斷言守門；`uv run pytest ETF/` 中 market_chips 相關測試不退步。
- [x] 3.3 [after: 3.2] `SyncBareKStep` 的 snapshot upsert 改用 helper（jsonb 欄位直接比較，`created_at` 為 touch），重跑同日相同快照不改寫大型 jsonb 列（需求：Recurring upserts skip unchanged rows）。驗證：`ETF/tests/test_upsert_sql.py` 擷取 SQL 斷言守門含 `bare_k_snapshots.ohlcv`；`uv run pytest ETF/tests/test_sync_bare_k_step.py` 不退步。
- [x] 3.4 [after: 3.3] `PositionSummaryStep`（position、PnL series）與 `FlowComputeStep`（flow、cross-buy signal）四條 upsert 改用 helper（需求：Recurring upserts skip unchanged rows）。驗證：`ETF/tests/test_upsert_sql.py` 擷取四條 SQL 斷言守門；`uv run pytest ETF/` 相關測試不退步。
- [x] 3.5 [after: 3.4] `SignalDetectStep`、`OverlapComputeStep`（upsert，`updated_at` 為 touch；共識計數 UPDATE 不動）、`SyncTreemapStep`、`MultiEtfStep._save_diff_logs` 四條 upsert 改用 helper（需求：Recurring upserts skip unchanged rows）。驗證：`ETF/tests/test_upsert_sql.py` 擷取四條 SQL 斷言守門；`uv run pytest ETF/` 相關測試不退步。

## 4. 獨立腳本寫入點

- [x] 4.1 [after: 3.5] `ETF/sync_equity_distribution.py`、`ETF/run_strategies.py`、`ETF/run_fund_momentum.py` 的 upsert 改用 helper，`updated_at` 為 touch 欄位（需求：Recurring upserts skip unchanged rows）。驗證：`ETF/tests/test_upsert_sql.py` 擷取三條 SQL 斷言守門；`uv run pytest ETF/tests/test_sync_equity_distribution.py ETF/tests/test_fund_momentum_step.py` 不退步。

## 5. 驗證與文件

- [x] 5.1 [after: 4.1] 全量回歸：範圍內每個寫入點都有一個測試會在缺少守門時失敗（需求：Guard is covered by tests；決策 5：以 SQL 字串測試 + 上線後實測驗證）。驗證：暫時把 `conflict_update_clause` 的 `IS DISTINCT FROM` 單行替換成 `<>` 跑一次，確認 `ETF/tests/test_upsert_sql.py` 有失敗（`Tests: 0` 不算）後還原；`uv run pytest ETF/` 全綠、`uv run ruff check` 改動檔通過，指令與結果數字記入本任務下方。
  - 實測（2026-11-22）：`uv run pytest ETF/ --ignore=ETF/legacy -o addopts=""` → **611 passed**。突變：`upsert_sql.py` 的 `) IS DISTINCT FROM ({incoming})` 單行換成 `) <> ({incoming})` → `test_upsert_sql.py` **25 failed, 2 passed**（通過的 2 個是 ValueError 測試，與比較運算子無關），還原後 27 passed。ruff：`upsert_sql.py`、`sql_storage.py`、8 個 step 檔、`run_strategies.py`、`test_upsert_sql.py` 全部通過；`sync_equity_distribution.py`（7 筆）與 `run_fund_momentum.py`（1 筆 F401 `datetime.date`）錯誤數與 HEAD 相同，皆為既有問題。
- [x] 5.2 [after: 5.1] 產出 `openspec/changes/upsert-skip-unchanged-rows/verify_guard.sql`：在 `BEGIN … ROLLBACK` 內，對 `stock_broker_transactions` 現有一列以原值執行守門 upsert 加 `RETURNING 1`，預期 0 列；再以改過的 net_volume 執行，預期 1 列（決策 1：以 IS DISTINCT FROM 在 DB 端守門）。驗證：使用者在 Supabase SQL Editor 執行，兩次回傳列數記入本任務下方。
  - 實作偏差：SQL Editor 只顯示最後一句結果，改用 `DO` 區塊結尾 `RAISE EXCEPTION` 帶出兩個計數（例外自動回滾整個區塊，等同 BEGIN…ROLLBACK）。
  - 實測（2026-11-22，經 Supabase MCP `execute_sql` 對正式庫執行同一份 SQL）：回傳 `P0001: guard check: same_values=0 changed_value=1` → 原值重寫 0 列、改 net_volume 1 列，符合預期；例外回滾，無資料變更。
  - spec「NULL handling」範例表實測（唯讀 `SELECT stored IS DISTINCT FROM incoming FROM (VALUES ...)`）：(NULL,NULL)=false、(NULL,5)=true、(5,NULL)=true、(5,5)=false，四列皆符合。
- [x] 5.3 [after: 5.1] `ETF/CLAUDE.md` 常見錯誤表新增一列：新增或修改 upsert 一律用 `conflict_update_clause`，禁止無條件 `DO UPDATE` 與 SET 內手寫 `NOW()`，並註明時間戳語意為最後內容變更時間（決策 3：時間戳改為 touch 欄位，語意變為最後內容變更時間）。驗證：派 fresh agent read-back，確認該列存在且與 `.claude/rules/etf-pipeline.md` 無衝突。
  - Read-back（2026-11-22，fresh Explore agent）：`ETF/CLAUDE.md:569` 該列存在、2 欄格式正確；`upsert_sql.py:11` 簽名相符；`ETF/CLAUDE.md` 其他段與 `.claude/rules/etf-pipeline.md` 無衝突說法。附帶指出 `backfill_stock_basic_info.py`、`compute_factor_ic.py`、`backfill_market_breadth.py` 仍無守門——屬 proposal Non-Goals（一次性／低頻腳本），不在本變更範圍。
- [ ] 5.4 [after: 5.2] 上線後量測：合併後在 SQL Editor 執行 `select pg_stat_statements_reset();`，下一次日排程完成後查 `stock_broker_transactions`、`stock_prices_daily` upsert 的 `rows` 與 `wal_bytes`，與 CI log 的送出筆數比較（決策 5：以 SQL 字串測試 + 上線後實測驗證）。驗證：`rows` 低於送出筆數，數字記入本任務下方；並檢查 Supabase Observability 的 Disk IO % Remaining 趨勢。

## 6. verify 警告後續

- [x] 6.1 `OverlapComputeStep._update_consensus_counts` 的共識計數 UPDATE 在 WHERE 加上 `(o.consensus_buy_count, o.consensus_sell_count) IS DISTINCT FROM (c.buy_count, c.sell_count)`，計數不變的列不改寫、`updated_at` 不動（需求：Consensus count update skips unchanged rows；決策 6：共識計數 UPDATE 同樣守門）。驗證：`ETF/tests/test_upsert_sql.py` 新增測試 mock `services.sql_storage.engine` 呼叫 `_update_consensus_counts`，擷取 SQL 斷言含 `IS DISTINCT FROM (c.buy_count, c.sell_count)`，先跑一次確認失敗再實作；`uv run pytest ETF/tests/test_upsert_sql.py` 通過。
  - 實測（2026-11-22）：新測試 `test_overlap_consensus_update_guarded` 實作前失敗（SQL 無守門），實作後 `test_upsert_sql.py` 28 passed。正式庫 `EXPLAIN`（不執行）同一條 UPDATE：計畫在 `etf_stock_overlap_pkey` 掃描上出現 `Filter: ((consensus_buy_count IS DISTINCT FROM c.buy_count) OR (consensus_sell_count IS DISTINCT FROM c.sell_count))`，語法與型別皆有效。log 文字由 `rows affected` 改為 `rows changed`。
- [x] 6.2 [after: 6.1] `ETF/pipeline/steps/multi_etf_step.py` 與 `ETF/run_strategies.py` 的 `conflict_update_clause` import 從函式內移到檔案開頭，與其他寫入點一致，行為不變（決策 2：共用子句產生器 conflict_update_clause）。驗證：`uv run pytest ETF/ --ignore=ETF/legacy -o addopts=""` 全綠、`uv run ruff check` 兩檔錯誤數不高於 HEAD，結果記入本任務下方。
  - 實測（2026-11-22）：`uv run pytest ETF/ --ignore=ETF/legacy -o addopts=""` → **612 passed**（較 5.1 多 1 個為 6.1 新測試）；ruff 兩檔 HEAD 0 筆、改後 All checks passed。

## 7. review 建議後續

- [x] 7.1 [after: 6.2] `OverlapComputeStep.execute` 組 `etf_list` 時依 `etf_code` 排序，快照列順序不同時寫入相同 jsonb，守門才不會因陣列順序失效（需求：Recurring upserts skip unchanged rows；需求：Touch timestamps record content changes）。驗證：`ETF/tests/test_upsert_sql.py::test_overlap_etf_list_order_is_deterministic` 以正反兩種列順序執行，斷言 `etf_list` 相同且依代碼排序，先確認實作前失敗；`uv run pytest ETF/ --ignore=ETF/legacy -o addopts=""` 全綠。
  - 實測（2026-11-22）：實作前新測試失敗（兩次 `etf_list` 順序不同），實作後全量 **613 passed**；ruff 兩檔 All checks passed。
- [x] 7.2 [after: 7.1] 文件修正：`ETF/CLAUDE.md` 常見錯誤表該列補上 jsonb 陣列需固定順序，以及 COALESCE 型 upsert（`etf_news`、`etf_aum_series`、`etf_dividend_records`）與 REST merge-duplicates 不可直接套 helper 的例外；`design.md` 決策 1 更正為「不產生新 tuple，但鎖列仍寫少量 WAL，寫入量下降但非零」（決策 1：以 IS DISTINCT FROM 在 DB 端守門）。驗證：派 fresh agent read-back，確認兩處文字存在且與 proposal Non-Goals 一致。

未納入（範圍外，另開 change）：`ETF/pipeline/steps/sector_rrg_step.py` 每日原地把 `sector_strength.strength_score` 乘象限權重並設 `created_at = now()`，讓 `sector_strength` 的守門幾乎不成立；表僅數十列，IO 影響小，但需改資料模型（加權分數另存欄位）。
