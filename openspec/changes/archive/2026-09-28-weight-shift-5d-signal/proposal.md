## Why

00981A（統一台股增長）與 00991A（復華未來50）兩支主動式 ETF 目前的訊號偵測（`signal_detect_step.py`）只判定「當日」持股狀態（多 ETF 共識、單一 ETF 超重、跨產品同向加碼），沒有偵測「持股比重在近 5 個交易日內持續累積變化」這種中期趨勢，可能錯過經理人正在緩步加碼/減碼但單日變動幅度不足以觸發現有訊號的個股。`etf_diff_logs` 已經逐日記錄 `curr_weight`，具備計算 5 日累積變動所需的全部資料，不需新增爬蟲或資料源。

## What Changes

- 在 `signal_detect_step.py` 新增第 4 種訊號偵測邏輯 `weight_shift_5d`：對 00981A、00991A 兩支 ETF，計算同一檔股票近 5 個交易日 `curr_weight` 的累積變動（`curr_weight[t] - curr_weight[t-5]`）。
  - 累積變動絕對值 ≥ 1pp 且 < 3pp → `strength = 1`（中期訊號）
  - 累積變動絕對值 ≥ 3pp → `strength = 2`（短期強訊號）
  - 累積變動絕對值 < 1pp → 不產生訊號
- 訊號結果寫入既有 `etf_signals` 表（`signal_type = 'weight_shift_5d'`，複用既有欄位結構，不需新增資料表或欄位）。
- 前端 `/investment` 相關頁面讀取 `etf_signals` 的邏輯需能正確識別並顯示 `weight_shift_5d` 這個新 `signal_type`（含中期/短期兩級 strength 的視覺區分）。

## Non-Goals

- 不擴大範圍到 00981A、00991A 以外的其他 14 支 ETF（未來視效果再評估擴大範圍，屬另一個 change）。
- 不新增爬蟲或新的外部資料來源，完全複用 `etf_diff_logs.curr_weight`。
- 不處理個股缺少完整 5 日歷史資料的補齊邏輯（資料不足 5 個交易日時直接跳過該股票，不做估計或外插）。
- 不修改既有三種訊號（`multi_fund_consensus` / `single_fund_overweight` / `cross_product_accumulation`）的判定邏輯或閾值。

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `advanced-signal-detection`: 新增第 4 種訊號類型 `weight_shift_5d`（近 5 交易日持股比重累積變動偵測），複用既有 `etf_signals` 表結構，僅新增偵測邏輯與新的 `signal_type` 列舉值。

## Impact

- Affected specs: `advanced-signal-detection`
- Affected code:
  - Modified: `ETF/pipeline/steps/signal_detect_step.py`
  - Modified: `ETF/tests/test_new_scrapers.py`（若既有訊號測試檔含 signal_detect_step 測試則新增對應測試；否則於 `ETF/tests/test_signal_detect_step.py` 新增測試，須先確認實際測試檔位置）
  - Modified: 前端讀取 `etf_signals` 的元件/型別（需先確認實際路徑，預期在 `src/lib/investment/` 或 `src/app/investment/` 下處理 `signal_type` 的顯示邏輯）
