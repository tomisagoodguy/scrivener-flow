## 1. 寫入修正

- [x] 1.1 在 `ETF/database/sql_storage.py` 新增純函式 `build_price_records(df)`：排除 close 為 NaN 的列、±inf 轉 None、volume／margin_ratio／it_buy 缺值為 0、margin_pct_rank 缺值或缺欄為 None。驗證：`uv run pytest ETF/tests/test_stock_price_sync.py -k records` 涵蓋 2330 於 2026-05-29 close NaN 不輸出、amount inf 轉 None、spec 範例表三列。（需求：Price rows require a close price；決策：只寫有收盤價的列）
- [x] 1.2 新增 `SQLStorage.upsert_stock_prices(df)`：經 `_bulk_upsert` 單一交易 `ON CONFLICT (stock_code, data_date) DO UPDATE` 全部價格欄位，回傳寫入列數。驗證：測試以假 `_bulk_upsert` 斷言 4 列中 3 列有價時傳入 3 筆、SQL 含 `ON CONFLICT (stock_code, data_date)`、回傳 3。（需求：Atomic price upsert with visible failure；決策：寫入改用 SQLStorage._bulk_upsert）[after: 1.1]
- [x] 1.3 `SyncOHLCVStep` 改呼叫 `services.sql_storage.upsert_stock_prices`，例外時 `logger.error("OHLCV upsert failed: ...")` 不 raise；刪除 `Storage.save_stock_prices`，並把 `ETF/tests/test_margin_percentile.py` 中 margin_pct_rank 的 NULL 保留測試改測 `build_price_records`。驗證：測試 mock `upsert_stock_prices` 丟例外時步驟不 raise 且 log 含 `OHLCV upsert failed`；`uv run pytest ETF/tests/test_stock_price_sync.py ETF/tests/test_margin_percentile.py` 綠燈；`grep -rn save_stock_prices ETF` 在正式程式碼無結果（僅測試斷言舊方法未被呼叫）。（需求：Atomic price upsert with visible failure；決策：寫入改用 SQLStorage._bulk_upsert）[after: 1.2]

## 2. 修復既有資料

- [x] 2.1 新增 `ETF/scripts/repair_stock_prices.py`（`--since`、`--dry-run`），重抓期間內有 NULL close 的股票並 upsert 有價列，印出修復筆數與期間內剩餘 NULL 列數。驗證：測試以假 FinLab 回傳 2026-03-31 與 2026-04-01 兩列時只寫 04-01、`--dry-run` 不呼叫寫入並印出預計筆數。（需求：Repair script for missing close prices；決策：一次性修復腳本）[after: 1.2]
- [x] 2.2 取得使用者同意後以 `--since 2026-04-01` 修復 production。驗證：腳本輸出修復筆數；SQL 抽查 2330 於 2026-05-29 close = 2355；期間內剩餘 NULL 列抽樣比對 FinLab 當天皆無價；結果寫入本任務實測紀錄。剩餘 NULL 列是否刪除向使用者確認。（需求：Repair script for missing close prices）[after: 2.1, 1.3]
  - 實測紀錄（2026-11-03，使用者同意後執行）：dry-run 36 秒，預計 271,585 列；正式執行 1 分 44 秒，輸出 `Repaired 271585 rows (1982 stocks, 144 trading days)`、`Rows still NULL since 2026-04-01: 11868`（修復前 49,802）。
  - SQL 抽查 2330：2026-05-29 = 2355、06-01 = 2355、06-05 = 2365、07-15 = 2440。
  - 剩餘 11,868 列逐筆比對 FinLab `price:收盤價`：當天有價 0 筆、代碼不在 FinLab 0 筆（全部為 FinLab 當天無價）。
- [x] 2.3 修復後重跑 `uv run python ETF/pipeline/steps/backfill_future_returns.py` 與買進模式統計重算。驗證：買進模式 20 日覆蓋率（`event_date + 22 <= 執行日` 且事件日有收盤價）≥ 98%，數字寫入實測紀錄。（需求：Repair script for missing close prices）[after: 2.2]
  - 實測紀錄（2026-11-03）：`backfill_future_returns.py` 輸出 `Updated future_returns for 1912 records`；統計重算 60 列、8.8 秒、`baseline_n`（h=20）= 35,894（修復前 25,424）。
  - 20 日覆蓋率：4,496 / 4,501 = **99.89%**（修復前 2,922 / 3,227 = 90.55%），達 ≥ 98%。
  - 重算後 `etf_buying_pattern_stats`（SQL 查 horizon=20）：`window_break` 超額報酬區間 [-3.88, -1.90] pp、`new_position` [-3.53, -0.73]、`volume_spike` [-7.05, -0.80] → 較差；其餘 3 個模式跨零。

## 3. 文件

- [x] 3.1 `ETF/CLAUDE.md` 常見錯誤表新增「`stock_prices_daily` 只寫有收盤價的列、寫入走 `SQLStorage.upsert_stock_prices`」陷阱，並更新專案記憶 `project_stock_prices_null_close` 為已修復。驗證：派 fresh agent read-back 確認敘述與程式一致。（需求：Price rows require a close price）[after: 2.3]
