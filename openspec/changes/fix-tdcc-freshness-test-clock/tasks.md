## 1. 測試基礎與守護測試（TDD RED）

- [x] 1.1 [P] 在 `ETF/tests/test_tdcc_schedule.py` 新增 Single clock source for TDCC schedule helpers 的守護測試：使用 `frozen_tdcc_today` fixture，依 spec 表格斷言 `expected_tdcc_friday()` 回傳 2026-07-10、`is_tdcc_data_fresh("2026-07-10")` 為 True、`is_tdcc_data_fresh("2026-07-03")` 為 False；另斷言凍結下 `expected_tdcc_friday(date(2026, 7, 12))` 仍回傳 2026-07-10。驗證：`uv run pytest ETF/tests/test_tdcc_schedule.py` 新測試失敗（fixture 或 `_today` 尚不存在），既有 4 個測試仍通過
- [x] 1.2 [P] 新增 `ETF/tests/conftest.py`，提供 Shared frozen-clock test fixture `frozen_tdcc_today`：以 `monkeypatch.setattr("ETF.utils.tdcc_schedule._today", ...)`（raising 預設為 True）回傳 `date(2026, 7, 10)`，fixture 回傳該日期供測試引用。驗證：在 `_today` 尚未存在時，套用 fixture 的測試以 AttributeError 失敗（證明 fixture 確實綁定 `_today`，而非靜默 patch 不存在的名稱）

## 2. 實作與測試遷移（GREEN）

- [x] 2.1 在 `ETF/utils/tdcc_schedule.py` 新增 `_today()`（回傳 `date.today()`），`expected_tdcc_friday` 在 today 為 None 時改呼叫 `_today()`；`is_tdcc_data_fresh` 維持經由 `expected_tdcc_friday` 取得預設日期。對外簽名不變。驗證：任務 1.1 守護測試與既有 `ETF/tests/test_tdcc_schedule.py` 全數通過
- [x] 2.2 [P] `ETF/tests/test_sync_equity_distribution.py`：`test_main_always_calls_finlab_even_if_previous_snapshot_fully_synced` 與 `test_main_skips_when_skip_if_fresh_and_db_current` 套用 `frozen_tdcc_today`，並把其餘測試中直接 monkeypatch `mod.expected_tdcc_friday` 的 3 處改為使用同一 fixture（測試斷言內容不變）。驗證：`uv run pytest ETF/tests/test_sync_equity_distribution.py` 全數通過，且該檔搜尋不到 `expected_tdcc_friday` 字串
- [x] 2.3 [P] `ETF/tests/test_sync_stock_financials.py`：`test_check_shareholder_freshness_ok_when_finlab_has_expected_week` 套用 `frozen_tdcc_today`，並把 `test_run_raises_when_finlab_lags_behind_expected_tdcc_week`、`test_run_skips_finlab_when_db_already_fresh` 中 patch `ETF.utils.tdcc_schedule.expected_tdcc_friday` 的 2 處改為使用同一 fixture。驗證：`uv run pytest ETF/tests/test_sync_stock_financials.py` 全數通過，且該檔搜尋不到 `expected_tdcc_friday` 字串

## 3. 驗收

- [x] 3.1 全域驗收：`uv run pytest ETF/tests` 結果為 0 failed（輸出貼到驗收紀錄）；`uv run ruff check ETF/utils/tdcc_schedule.py ETF/tests` 無錯誤；以 Grep 搜尋 `ETF/tests` 內 monkeypatch `expected_tdcc_friday` 的寫法，結果為 0 筆
  - 驗收紀錄（2026-10-24）：`pytest ETF/tests` 410 passed、0 failed（原 3 個失敗轉綠，新增守護測試通過）；Grep monkeypatch `expected_tdcc_friday` 0 筆。ruff：本 change 修改的 5 個檔案 All checks passed；`ETF/tests` 全目錄 22 個錯誤為**既有、與本 change 無關**（分布於 test_backfill_future_returns、test_bare_k_service、test_fhtrust_scraper_json、test_fund_momentum_step、test_retail_sentiment_step、test_sync_topics_step、test_validate_registry_sync），stash 本 change 後於 HEAD 執行同為 22 個；不在本 change 範圍內修正
