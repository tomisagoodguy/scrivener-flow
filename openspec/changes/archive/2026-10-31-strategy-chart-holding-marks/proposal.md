## Why

策略選股中心的圖表視角（`/investment/strategy?view=chart`）只畫裸K與均線發散訊號，看不出策略「何時選中、何時買進、持有了多久」。使用者要在 K 線上直接看到選股日、買進日，並以淡色背景標出持有期間，才能判斷進場位置與持有期間的走勢。

## What Changes

- 圖表視角額外查詢 `strategy_trades`（只查目前圖表內的股票），把每支股票的選股日、買進日與持有區間傳給圖表。
- K 線主圖在選股日標「選」、在買進日標「買」，畫在 K 棒上方，與既有均線發散訊號（K 棒下方紅色箭頭）區分。
- K 線主圖在持有期間（買進日 → 出場日；尚未出場則到最新一根 K 棒）畫淡色背景；同一支股票被多個策略持有時，各策略期間取聯集，只用一種顏色。
- `strategy_trades` 查詢失敗時圖表照常顯示，只是不畫標記與背景。

## Non-Goals (optional)

（見 design.md 的 Goals / Non-Goals）

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `strategy-chart-view`: 新增「圖表標出策略選股日、買進日與持有期間背景」的需求。

## Impact

- Affected specs: `strategy-chart-view`（ADDED 需求）
- Affected code:
  - src/app/actions/getStrategyChartTrades.ts（新 Server Action：依股票代碼查 `strategy_trades`）
  - src/lib/investment/strategyTradeUtils.ts（新增把持有紀錄彙整成每股標記與聯集區間的純函式）
  - src/app/investment/strategy/page.tsx（圖表視角多一個並行查詢）
  - src/components/features/strategy/StrategyChartViewer.tsx（把每股持有標記傳給圖表）
  - src/components/features/investment/BareKSlideContent.tsx、src/components/features/investment/BareKChart.tsx（新增選填 prop 往下傳）
  - src/components/features/investment/BareKChartPanels.ts（文字標記與持有背景）
- 不動 DB schema、不動 ETF pipeline；其他使用 `BareKChart` 的頁面（裸K、動能、選股池）不傳新 prop，行為不變。
