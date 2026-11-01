## Why

策略頁「換股後表現」(`/investment/strategy?view=trades`) 目前只用文字清單列出持有中個股的正／負報酬。使用者想直接看「換股後漲得好」的個股 K 線走勢，確認上漲型態與買進位置，而不必逐檔點進個股頁。

## What Changes

- 「換股後表現」面板新增「列表／圖表」切換（client state，不改 URL，預設列表）。
- 圖表模式：把目前策略切換範圍內「持有中、已進場、報酬 > 0」的個股，依持有報酬由高到低排成連續捲動裸K圖（沿用 `ScrollChartViewer`），快照按需載入（沿用 `LazyBareKSlide` 的停留閘門）。
- 同一股票被多個策略持有且皆為正報酬時只畫一次，排序取其最高報酬，標籤列出所有正報酬持有它的策略簡稱。
- 每段標頭顯示持有報酬（台股紅漲色）與持有天數。
- K 線疊加該股的買進／賣出日與持有區間標記（由面板已載入的 trades 推導）；`LazyBareKSlide` 新增選填 `holdingMarks` prop 轉傳給 `BareKSlideContent`。
- 範圍內無正報酬個股時，圖表模式顯示空狀態文字。

## Non-Goals

- 不畫負報酬個股圖表、不畫近期換出個股圖表。
- 不新增 Server Action 或 DB 查詢；持有標記只用面板既有資料（持有中＋近 60 天換出），不回查更早的歷史持有紀錄。
- 不把列表／圖表狀態寫進 URL。

## Capabilities

### New Capabilities

- `strategy-trade-winners-chart`: 換股後表現面板的正報酬個股連續捲動裸K圖模式（切換、排序去重、標頭、持有標記、空狀態）

### Modified Capabilities

（無）

## Impact

- Affected specs: strategy-trade-winners-chart（新增）
- Affected code:
  - src/components/features/strategy/StrategyTradePerformancePanel.tsx（加列表／圖表切換）
  - src/components/features/strategy/TradeWinnersChartViewer.tsx（新增：圖表模式元件）
  - src/lib/investment/strategyTradeUtils.ts（新增正報酬去重排序與 trades → 持有標記純函式）
  - src/components/features/investment/pool/LazyBareKSlide.tsx（新增選填 holdingMarks prop）
  - src/lib/investment/__tests__/strategyTradeUtils.test.ts（測試）
  - src/components/features/strategy/__tests__/TradeWinnersChartViewer.test.tsx（新增測試）
  - src/components/features/strategy/__tests__/StrategyTradePerformancePanel.test.tsx（測試）
  - src/components/features/investment/pool/__tests__/LazyBareKSlide.test.tsx（測試）
