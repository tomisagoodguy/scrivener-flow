## Why

上一版在 K 線上用 lightweight-charts 內建 series marker 標「選」「買」，文字沿用整張圖 10px 字級、顏色壓在淡紅背景與 K 棒上，且選股日與買進日幾乎都是相鄰 K 棒（每根約 4px 寬）而互相疊住，使用者回報「字體很不清楚，影響視覺」。

## What Changes

- 改以自訂繪圖（lightweight-charts series primitive）畫實心圓角標籤：白色粗體 12px 字。
- 買進日標紅底「買」（K 棒上方）；出場日標綠底「賣」（K 棒下方，留出均線發散箭頭的空間）。
- **BREAKING**（僅畫面）：不再標選股日「選」；選股日即買進日前一交易日，持有背景起點已表示進場。
- 移除以內建 marker 畫文字的做法；均線發散紅箭頭維持內建 marker 不變。

## Non-Goals (optional)

（見 design.md）

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `strategy-chart-view`: 「Strategy holding marks on chart」改為買進日「買」、出場日「賣」實心標籤，移除選股日「選」。

## Impact

- Affected specs: `strategy-chart-view`（MODIFIED 需求 Strategy holding marks on chart）
- Affected code:
  - src/lib/investment/strategyTradeUtils.ts（`StrategyHoldingMarks` 以 `exitDates` 取代 `signalDates`）
  - src/app/actions/getStrategyChartTrades.ts（不再需要 `entry_signal_date` 以外的變動，只隨型別調整）
  - src/components/features/investment/BareKChartPanels.ts（移除文字 marker，改掛 primitive）
  - src/components/features/investment/BareKTradeLabels.ts（新檔：標籤資料純函式與 primitive）
- 不動 DB、pipeline、其他頁面。
