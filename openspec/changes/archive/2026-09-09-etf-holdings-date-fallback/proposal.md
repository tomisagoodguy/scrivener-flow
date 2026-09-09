## Why

`getHoldingsForEtf()`（`src/lib/investment/holdingsUtils.ts`）目前在最新 `data_date` 資料品質不佳（超過一半個股缺價）時，會靜默切換到前一個候選日期，但不會將「這是回退後的資料」這件事回傳給呼叫端。使用者查看 ETF 持股頁時，無法區分現在看到的是「今日資料」還是「系統自動回退的舊資料」，容易誤判資料新鮮度。此問題參考自對開源專案 stockcatcher 的架構評估：其 `tdcc_service.py`／`tide_service.py` 在資料不足時明確標記 `is_fallback` 並回溯查詢，讓前端能顯示對應文案而非留白或誤導使用者。

本專案已有 `etf-data-freshness-indicator` spec 處理「資料過時天數的視覺警示」，但那是基於已知 `data_date` 計算天數差；本變更要解決的是更早一層的問題——`getHoldingsForEtf()` 內部候選日期切換的事實本身沒有被回傳，`etf-data-freshness-indicator` 目前看到的 `data_date` 已經是回退後的日期，使用者無從得知曾經回退過。

## What Changes

- `getHoldingsForEtf()` 回傳型別新增 `isFallback: boolean` 欄位：當實際使用的 `data_date` 不是候選清單中最新的一筆時，設為 `true`。
- 新增共用輔助函式（置於 `src/lib/investment/holdingsUtils.ts` 內或抽成獨立檔案）封裝「取候選日期清單→依資料完整度門檻挑選可用日期→回傳所選日期與是否為回退」的邏輯，避免未來新增查詢時重複實作同一段判斷。
- ETF 持股頁（`src/app/investment/[etf]/page.tsx` 或其資料來源 `src/lib/investment/etfPageData.ts`）在 `isFallback === true` 時，於既有的 `etf-data-freshness-indicator` 過時警示區塊旁，額外顯示「資料已自動回退至最近可用交易日」的提示文案，與現有過時警示視覺區隔（過時警示是「日期本身多舊」，此提示是「系統做了自動切換」，兩者語意不同，可能同時出現也可能只出現其中一種）。
- 不變更 `getStrategySignals()`（`strategy-signal-freshness` spec 已明確規定視窗外不顯示、不回退、不報錯，本次不修改該既有決策）。

## Non-Goals

- 不修改 `getStrategySignals()` 或 `strategy-signal-freshness` 既有的「視窗外策略不顯示」行為，該行為是先前變更的明確設計決策。
- 不新增資料庫欄位或 migration；`isFallback` 是查詢當下依候選日期比對計算出的衍生值，不落地儲存。
- 不處理本次盤點列出的其餘 20+ 個依日期查詢的 action/page（如 `getConsensusSignals`、`getSectorStrength` 等），這些目前多採「查最新可用日期即顯示」模式，本身沒有「先掃描到某天缺資料才回退」的斷點語意，不在本次範圍內；若未來要統一處理，應是後續獨立變更。
- 不處理 UI 骨架屏（skeleton）等載入態改善，僅新增「回退提示」文案。

## Capabilities

### New Capabilities

- `etf-holdings-date-fallback-flag`: `getHoldingsForEtf()` 回傳資料是否為日期回退結果的顯式標記，以及 ETF 持股頁對應的提示文案顯示規則。

### Modified Capabilities

(none)

## Impact

- Affected specs: `etf-holdings-date-fallback-flag`（新增）
- Affected code:
  - Modified: `src/lib/investment/holdingsUtils.ts`
  - Modified: `src/lib/investment/etfPageData.ts`
  - Modified: `src/app/investment/[etf]/page.tsx`
  - Modified: `src/components/features/investment/EtfHeader.tsx`（若過時警示與回退提示需並列顯示於同一區塊）
