## Problem

`uv run pytest ETF/tests` 自 2026-07 中旬起固定 3 個失敗，且失敗與當次改動無關，會誤導每次驗收（trend-template-exclude-biotech 驗收時即需額外排查）：

- `ETF/tests/test_sync_equity_distribution.py::test_main_always_calls_finlab_even_if_previous_snapshot_fully_synced`：拋出「FinLab inventory 尚未提供 TDCC 新一期 … 預期至少 2026-10-23」
- `ETF/tests/test_sync_equity_distribution.py::test_main_skips_when_skip_if_fresh_and_db_current`：`AttributeError: 'NoneType' object has no attribute 'connect'`
- `ETF/tests/test_sync_stock_financials.py::test_check_shareholder_freshness_ok_when_finlab_has_expected_week`：拋出同上的 staleness RuntimeError

## Root Cause

TDCC 週資料輔助模組（`ETF/utils/tdcc_schedule.py`）以 `date.today()` 推算「預期最新週五」，沒有單一可替換的時鐘來源。測試固定資料為 2026-07-10 前後，卻各自用不同方式凍結日期：

1. 兩個失敗測試完全沒凍結日期，直接吃真實今天，日期一過預期週五就判定資料過期
2. `test_main_skips_when_skip_if_fresh_and_db_current` 只 patch 了 `sync_equity_distribution` 模組內 import 的 `expected_tdcc_friday` 名稱；但 `is_tdcc_data_fresh` 在 `tdcc_schedule` 模組內部直接呼叫自己的 `expected_tdcc_friday`，patch 不到 → 判定不新鮮 → 沒有提早結束而往下呼叫 `_get_synced_codes`，撞上 FakeStorage 的 `engine=None`
3. `test_sync_stock_financials.py` 另外兩個測試改 patch 來源模組名稱，與 equity 測試不一致；其中「應 raise」的測試在不凍結日期時也會通過，屬碰巧綠燈

正式程式的日期邏輯本身正確，缺陷在於時鐘無單一注入點，導致測試凍結不可靠。

## Proposed Solution

- `tdcc_schedule` 新增模組層級函式 `_today()` 作為唯一時鐘來源；`expected_tdcc_friday(today=None)` 在 today 為 None 時改呼叫 `_today()`，對外簽名與正式行為不變
- 新增 `ETF/tests/conftest.py` 共用 fixture `frozen_tdcc_today`，將 `ETF.utils.tdcc_schedule._today` 凍結為 2026-07-10（週五），同時影響 `expected_tdcc_friday()` 與 `is_tdcc_data_fresh()` 的無參數呼叫
- 3 個失敗測試套用此 fixture；另外 5 處既有的 `expected_tdcc_friday` monkeypatch（equity 3 處、stock_financials 2 處）改用同一 fixture，消除不一致的 patch 點
- 新增守護測試：凍結 `_today` 後，`expected_tdcc_friday()` 與 `is_tdcc_data_fresh()` 不帶參數呼叫皆依凍結日期判定

## Non-Goals

- 不改變 TDCC 新鮮度判定規則、staleness 錯誤訊息、`--daily-topup` / `--skip-if-fresh` / `--retry-run` 行為
- 不引入 freezegun 等新測試依賴
- 不處理 `ETF/tests` 以外的測試
- 不修改 `sync_equity_distribution` / `sync_stock_financials` 的正式程式碼

## Success Criteria

- 上述 3 個測試在任何執行日期都通過；`uv run pytest ETF/tests` 全數通過（0 failed）
- 守護測試證明凍結 `_today` 可同時控制 `expected_tdcc_friday()` 與 `is_tdcc_data_fresh()`
- `ETF/tests` 內不再出現直接 monkeypatch `expected_tdcc_friday` 的寫法
- 既有 `ETF/tests/test_tdcc_schedule.py` 全數通過（顯式傳 today 的行為不變）

## Impact

- Affected specs: `tdcc-schedule-clock`（新增）
- Affected code:
  - Modified: ETF/utils/tdcc_schedule.py
  - Modified: ETF/tests/test_sync_equity_distribution.py
  - Modified: ETF/tests/test_sync_stock_financials.py
  - Modified: ETF/tests/test_tdcc_schedule.py
  - New: ETF/tests/conftest.py
