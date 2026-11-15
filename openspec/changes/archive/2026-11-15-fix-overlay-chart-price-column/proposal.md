## Problem

個股頁「ETF 持倉分析」區塊與選股中心個股面板的「比重走勢 × 股價」疊圖，股價虛線一直是空的，畫面只看得到 ETF 比重線，沒有任何錯誤提示（2026-11-15 於 fix-weight-history-row-cap 實測時發現）。使用者無法把 ETF 加減碼和股價走勢放在一起看，而這是這張圖存在的目的。

## Root Cause

`HoldingsPriceOverlayChart` 查股價時對 `stock_prices_daily` 使用 `date` 欄位（select `date, close`、以 `date` 篩選起始日與排序），但該表的日期欄位名稱是 `data_date`，沒有 `date` 欄位（2026-11-15 以 `information_schema.columns` 查證）。查詢因此回錯誤，而元件只取回應的 `data`、沒有檢查 `error`，錯誤被吞掉，股價序列變成空陣列。

## Proposed Solution

1. 股價查詢改用 `data_date`（select、起始日篩選、排序三處），並把回傳列對應成元件內的 `{ date, close }`。
2. 股價查詢回錯誤時，圖表區顯示錯誤訊息，與既有「比重歷史載入失敗」狀態一致，不再靜默畫出沒有股價線的圖。
3. 補元件測試：股價查詢欄位為 `data_date`、股價線有資料、股價查詢失敗時顯示錯誤。

## Non-Goals

- 不改圖表的視覺設計（SVG 正規化折線、圖例、30／60／90 天切換）。
- 不處理此元件在 Client Component 直接查資料庫的既有架構問題。
- 不修正 `holdings-price-overlay-chart` 主 spec 其他與現況不符的描述（雙軸標籤、資料不足 7 天提示等）。

## Success Criteria

- `/investment/stock/2330` 的「比重走勢 × 股價」在 90D 時畫出股價虛線，股價點數等於 SQL `SELECT count(*) FROM stock_prices_daily WHERE stock_code='2330' AND data_date >= current_date - 90`（2026-11-15 實測為 60）。
- 股價查詢失敗時，圖表區顯示含錯誤訊息的文字，而不是只有比重線的圖。
- 新增的元件測試在修改前失敗、修改後通過；`yarn tsc --noEmit` 通過。

## Impact

- Affected specs: holdings-price-overlay-chart
- Affected code:
  - Modified: src/components/features/investment/HoldingsPriceOverlayChart.tsx
  - Modified: src/components/features/investment/__tests__/WeightHistoryLoadStates.test.tsx
