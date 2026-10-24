## 1. 先寫失敗測試（TDD）

- [x] 1.1 在 `ETF/tests/test_trend_template_industry_exclusion.py` 為 Pure industry exclusion mask function 寫測試：依 spec 的 mixed stock list 表格（4743 生技醫療業→False、2330 半導體業→True、9999 不在對照→True、1234 產業為 null→True），以及 `excluded=()` 時全部為 True。驗證：`uv run pytest ETF/tests/test_trend_template_industry_exclusion.py` 因 `build_industry_exclusion_mask` 尚不存在而失敗
- [x] 1.2 同檔案為 Industry exclusion in trend_template selection gate 寫測試：以合成的 FinlabDataFrame（單一日期、6 檔、市值 A=10…F=60，A 為生技醫療業）呼叫模組層級選股函式 `select_smallest_cap(cap, gate, allowed, n=5)`，斷言選出 {B, C, D, E, F}，且排除產業的股票在 position 為 False。驗證：pytest 因函式尚不存在而失敗
- [x] 1.3 同檔案為 Industry data failure falls back to no exclusion 寫測試：monkeypatch `finlab.data.get` 讓 `company_basic_info` 分別（a）拋出例外、（b）回傳缺少「產業類別」欄位的 DataFrame，斷言 `_load_industry_mapping(None)` 回傳 None、不拋例外，且 caplog 有 ERROR 等級紀錄。驗證：pytest 因函式尚不存在而失敗
- [x] 1.4 同檔案為 Industry data source and shared cache 寫測試：monkeypatch `finlab.data.get` 回傳含 `stock_id` 與 `產業類別` 的假資料並計數呼叫次數，連續讀取兩次 `StrategyDataCache().industry`，斷言回傳 stock_id→產業類別的 Series，且 `company_basic_info` 只被取用 1 次。驗證：pytest 因屬性尚不存在而失敗

## 2. 實作

- [x] 2.1 [P] 在 trend_template 策略模組新增常數 `EXCLUDED_INDUSTRIES = ("生技醫療業",)`、純函式 `build_industry_exclusion_mask(stock_ids, industry_by_stock, excluded)`（回傳以 stock_ids 為 index 的布林 Series，只有產業明確屬於排除清單才為 False），以及 `select_smallest_cap(cap, gate, allowed, n=5)`（`allowed` 以欄位方向套用到 gate 後取市值最小 n 檔）。驗證：任務 1.1、1.2 的測試轉為通過
- [x] 2.2 [P] 在 `StrategyDataCache` 新增 `industry` cached_property，從 FinLab `company_basic_info` 建立 stock_id（字串）→「產業類別」的 Series；`stock_id` 為欄位時用欄位，否則用 index，重複 stock_id 取第一筆。驗證：任務 1.4 測試通過
- [x] 2.3 在 trend_template 策略模組新增 `_load_industry_mapping(cache)`：有 cache 時讀 `cache.industry`，cache 為 None 時自行取 `company_basic_info`；任何例外或缺少「產業類別」欄位都以 `logger.error` 記錄並回傳 None（不 raise）。驗證：任務 1.3 測試通過
- [x] 2.4 將產業排除接入 `_build_position`：取得對照後以 `build_industry_exclusion_mask` 產生 allowed（對照為 None 時 allowed 全為 True），並把原本「`cap * 閘門` 後取市值最小 5 檔」改為呼叫 `select_smallest_cap`，閘門維持成交金額 > 2000 萬與非處置股；同步更新模組 docstring 與 `TrendTemplateStrategy` 類別說明，載明排除生技醫療業。驗證：`uv run pytest ETF/tests/test_trend_template_industry_exclusion.py ETF/tests/test_strategy_signal_step.py` 全數通過

## 3. 驗收

- [x] 3.1 程式品質：`uv run ruff check ETF/strategies ETF/tests/test_trend_template_industry_exclusion.py` 無錯誤，且 `uv run pytest ETF/tests` 全數通過（輸出貼到驗收紀錄）
  - 驗收紀錄（2026-10-24）：ruff All checks passed；`pytest ETF/tests` 399 passed、3 failed。3 個失敗為**既有、與本 change 無關**：`test_sync_equity_distribution.py::test_main_always_calls_finlab_even_if_previous_snapshot_fully_synced`、`::test_main_skips_when_skip_if_fresh_and_db_current`、`test_sync_stock_financials.py::test_check_shareholder_freshness_ok_when_finlab_has_expected_week`。證據：stash 本 change 改動後、以及改用 finlab 2.0.8 執行皆同樣失敗；成因為新鮮度檢查依賴執行當日日期（預期至少 2026-10-23），測試 fixture 固定為 2026-07-10。另開 bug fix 處理，經使用者同意以此狀態收尾
- [x] 3.2 回測回歸：以 `_build_position(None)` 跑 `sim(trade_at_price='open', fee_ratio=1.425/1000, tax_ratio=3/1000, upload=False)`，斷言（a）任何日期的持股都沒有產業類別為生技醫療業的股票；（b）CAGR 落在 101.5%±0.5、月 Sharpe 落在 1.79±0.02（與提案的 V2 回測一致）。驗證：一次性比對腳本輸出（不提交進 repo），數字記錄到驗收紀錄
