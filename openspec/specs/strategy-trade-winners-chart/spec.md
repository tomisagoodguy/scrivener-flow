# strategy-trade-winners-chart Specification

## Purpose

Let the user view candlestick charts of the stocks that are in profit since the strategy rebalance, ordered from the highest holding return down, directly inside the trade performance panel of the strategy page.

## Requirements

### Requirement: Trade panel list and chart mode switch

The "換股後表現" panel on `/investment/strategy?view=trades` SHALL offer a mode switch with the options "列表" (default) and "圖表". Switching SHALL be client-side state and SHALL NOT change the URL. In list mode the panel SHALL render exactly as before this change. In chart mode the panel SHALL keep the title row, the strategy switch, the holding summary and the footnote, and SHALL replace the positive/negative columns, the industry table and the recent exits section with the winners chart. The mode SHALL be preserved when the user changes the strategy switch.

#### Scenario: Default list mode

- **WHEN** the user opens `/investment/strategy?view=trades`
- **THEN** the "列表" option is active and the positive and negative columns are rendered

#### Scenario: Switch to chart mode

- **WHEN** the user selects "圖表" in the panel
- **THEN** the winners chart is rendered, the positive and negative columns, the industry table and the recent exits section are not rendered, and the URL is unchanged


<!-- @trace
source: strategy-trade-winners-chart
updated: 2026-11-01
code:
  - src/components/features/investment/pool/LazyBareKSlide.tsx
  - src/lib/investment/strategyTradeUtils.ts
  - src/components/features/strategy/StrategyTradePerformancePanel.tsx
  - src/components/features/strategy/TradeWinnersChartViewer.tsx
tests:
  - src/components/features/investment/pool/__tests__/LazyBareKSlide.test.tsx
  - src/components/features/strategy/__tests__/StrategyTradePerformancePanel.test.tsx
  - src/components/features/strategy/__tests__/TradeWinnersChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyTradeUtils.test.ts
-->

---
### Requirement: Winners chart stock selection and order

The winners chart SHALL include only stocks that have at least one trade within the current strategy scope that is open (no exit date), entered (has an entry date) and has a holding return greater than 0. Each stock SHALL appear once. Stocks SHALL be ordered by their highest qualifying holding return, descending; ties SHALL be ordered by stock id ascending. The chart SHALL use a continuous scrolling candlestick viewer whose snapshots load on demand per stock.

#### Scenario: Excludes non-positive, pending and exited trades

- **WHEN** the current scope contains an open trade with return 0, an open trade whose entry date is null, and an exited trade with return 0.2
- **THEN** none of those trades' stocks appear in the winners chart unless another qualifying trade exists for them

#### Scenario: Same stock held by two strategies

- **WHEN** the scope is "全部" and stock 2330 has open positive trades in two strategies with returns 0.05 and 0.12
- **THEN** 2330 appears once, positioned by return 0.12, and both strategies' short labels are shown

##### Example: ordering

| Qualifying trades (stock: return) | Chart order |
| --- | --- |
| 2330: 0.12, 2317: 0.30, 2454: 0.12, 2330: 0.05 | 2317, 2330, 2454 |


<!-- @trace
source: strategy-trade-winners-chart
updated: 2026-11-01
code:
  - src/components/features/investment/pool/LazyBareKSlide.tsx
  - src/lib/investment/strategyTradeUtils.ts
  - src/components/features/strategy/StrategyTradePerformancePanel.tsx
  - src/components/features/strategy/TradeWinnersChartViewer.tsx
tests:
  - src/components/features/investment/pool/__tests__/LazyBareKSlide.test.tsx
  - src/components/features/strategy/__tests__/StrategyTradePerformancePanel.test.tsx
  - src/components/features/strategy/__tests__/TradeWinnersChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyTradeUtils.test.ts
-->

---
### Requirement: Winners chart slide header and holding marks

Each slide header SHALL show the stock's highest qualifying holding return formatted as a percentage in the Taiwan rising colour (rose), and the holding days of that trade. In the "全部" scope the header SHALL also list the short labels of every strategy holding the stock with a positive return, ordered by return descending; in a single-strategy scope the labels SHALL be omitted. The candlestick chart SHALL overlay buy dates, sell dates and holding periods derived from all trades of that stock within the current strategy scope.

#### Scenario: Header content

- **WHEN** the winners chart shows stock 2317 whose best trade has return 0.3 and entered 20 days before its latest date
- **THEN** the slide header shows "30.00%" in the rose colour and "20 天"

#### Scenario: Holding marks on the chart

- **WHEN** stock 2330 has an open trade entered on 2026-10-01 in the current scope
- **THEN** its candlestick chart marks a buy on 2026-10-01 and an open holding period starting that day


<!-- @trace
source: strategy-trade-winners-chart
updated: 2026-11-01
code:
  - src/components/features/investment/pool/LazyBareKSlide.tsx
  - src/lib/investment/strategyTradeUtils.ts
  - src/components/features/strategy/StrategyTradePerformancePanel.tsx
  - src/components/features/strategy/TradeWinnersChartViewer.tsx
tests:
  - src/components/features/investment/pool/__tests__/LazyBareKSlide.test.tsx
  - src/components/features/strategy/__tests__/StrategyTradePerformancePanel.test.tsx
  - src/components/features/strategy/__tests__/TradeWinnersChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyTradeUtils.test.ts
-->

---
### Requirement: Winners chart empty state

When the current strategy scope has no qualifying stock, chart mode SHALL show the text "目前無正報酬持有股" instead of the chart viewer. Changing the strategy switch in chart mode SHALL reset the viewer to the first stock of the new scope.

#### Scenario: No positive holdings

- **WHEN** chart mode is active and the selected strategy has only open trades with returns of 0 or below
- **THEN** the panel shows "目前無正報酬持有股" and no chart viewer

<!-- @trace
source: strategy-trade-winners-chart
updated: 2026-11-01
code:
  - src/components/features/investment/pool/LazyBareKSlide.tsx
  - src/lib/investment/strategyTradeUtils.ts
  - src/components/features/strategy/StrategyTradePerformancePanel.tsx
  - src/components/features/strategy/TradeWinnersChartViewer.tsx
tests:
  - src/components/features/investment/pool/__tests__/LazyBareKSlide.test.tsx
  - src/components/features/strategy/__tests__/StrategyTradePerformancePanel.test.tsx
  - src/components/features/strategy/__tests__/TradeWinnersChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyTradeUtils.test.ts
-->