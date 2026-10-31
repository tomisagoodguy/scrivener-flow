## 1. 資料形狀

- [x] 1.1 `StrategyHoldingMarks` 以 `exitDates`（非 null `exit_date`，去重升冪）取代 `signalDates`，`buildHoldingMarks` 與 `getStrategyChartTrades` 隨之調整（需求：Strategy holding marks on chart；決策：標籤資料由純函式產生，primitive 只負責畫）。驗證：`yarn test --testPathPatterns "strategyHoldingMarks|getStrategyChartTrades"` 綠燈。

## 2. 標籤繪製

- [x] 2.1 [after: 1.1] 新增 `src/components/features/investment/BareKTradeLabels.ts`：`buildTradeLabels(ohlcv, marks)`（買取最高價在上、賣取最低價在下、略過無 o/c 日期、同日同文字一次、時間遞增）與 `TradeLabelsPrimitive`（白色粗體 12px、紅底 #e11d48／綠底 #059669 圓角標籤；賣距最低價 18px 避開箭頭）；`createKLinePanel` 有 `holdingMarks` 時 `attachPrimitive`，移除 `buildHoldingTextMarkers`，內建 marker 只留均線發散箭頭（決策：以 series primitive 自繪實心標籤）。驗證：`yarn test --testPathPatterns "BareKTradeLabels|BareKHoldingMarks|BareKChartPanels"` 綠燈，涵蓋 spec 場景「Entry and exit dates are labeled」「Open position has no sell label」「Dates outside the snapshot are skipped」數值。
- [x] 2.2 [after: 2.1] 實跑驗證：Playwright 截 `/investment/strategy?view=chart` 中 1815、3189 的 K 線主圖，確認「買」「賣」標籤清楚可讀、無「選」、賣標籤不蓋發散箭頭、持有背景與價格軸正常；`yarn tsc --noEmit` 與 `yarn eslint` 改動檔通過；結果寫回本任務。
  - 實測紀錄（2026-10-31）：既有 dev server（port 3000）+ `uv run --with playwright python -I shot2.py` 截 3189（idx 40）、1815（idx 10）K 線主圖。紅底「買」在 K 棒上方、綠底「賣」在 K 棒下方，白色粗體字清楚可讀；無「選」；1815 10-30「賣」原被右側價格軸切掉一半，加上標籤水平位置限制在 pane 內後重截確認完整；持有背景與價格軸正常；console 無 error。
  - `yarn tsc --noEmit` 通過；`yarn eslint` 9 個改動檔 0 error；相關 7 個測試檔 43 tests 全綠。
