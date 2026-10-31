# strategy-consensus-chart-view Specification

## Purpose

Provide a continuous-scroll bare-K chart view inside the "多策略共選" panel on the strategy page, so users can inspect the price action of every stock selected by multiple strategies without cross-referencing the all-strategy chart view.

## Requirements

### Requirement: Consensus chart stock set

When the consensus view parameter `cview` is `chart`, the multi-strategy consensus panel SHALL render a continuous-scroll bare-K chart viewer whose stocks and their order are exactly the consensus stocks the list view shows for the same `cmin` and `cwin` (sorted by distinct-strategy count descending, then stock id ascending). The chart view SHALL work in both latest mode and history mode (`cwin` = 7, 14 or 30). The panel header, the threshold switch, the view toggle and the window switch SHALL remain visible above the chart.

#### Scenario: Chart replaces chip list

- **WHEN** the user opens `/investment/strategy?cview=chart`
- **THEN** the panel shows the bare-K chart viewer in place of the chip list, and the number of chart slides equals the stock count shown in the panel header

#### Scenario: Chart follows window mode

- **WHEN** the user opens `/investment/strategy?cmin=3&cview=chart&cwin=14`
- **THEN** the chart slides are the stocks selected by at least 3 distinct strategies within the last 14 calendar days, in the same order as `/investment/strategy?cmin=3&cwin=14`

##### Example: Slide order

| Consensus stocks (stock_id, count) | Expected slide order |
| ---------------------------------- | -------------------- |
| (2454, 2), (2330, 3), (3017, 2)    | 2330, 2454, 3017     |


<!-- @trace
source: strategy-consensus-chart-view
updated: 2026-10-31
code:
  - src/lib/investment/strategyConsensusUtils.ts
  - ETF/pipeline/steps/strategy_signal_step.py
  - src/lib/investment/strategyTradeUtils.ts
  - supabase/migrations/20261031120000_add_strategy_trades.sql
  - src/app/actions/getStrategyTradePerformance.ts
  - src/components/features/strategy/MultiStrategyConsensusPanel.tsx
  - ETF/processors/strategy_trades.py
  - ETF/pipeline/orchestrator.py
  - src/components/features/strategy/TradeRecentExits.tsx
  - ETF/database/sql_storage.py
  - ETF/pipeline/steps/strategy_trade_step.py
  - src/components/features/strategy/TradeReturnColumns.tsx
  - src/components/features/strategy/TradeSummary.tsx
  - src/components/features/strategy/StrategyTag.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/strategy/ConsensusChartViewer.tsx
  - src/components/features/strategy/StrategyTradePerformancePanel.tsx
  - ETF/pipeline/context.py
  - src/components/features/strategy/ConsensusControls.tsx
  - src/components/features/strategy/TradeIndustryTable.tsx
tests:
  - ETF/tests/test_strategy_trade_step.py
  - src/components/features/strategy/__tests__/StrategyTradePerformancePanel.test.tsx
  - src/__tests__/lib/buildMultiConsensusStocks.test.ts
  - src/__tests__/components/MultiStrategyConsensusPanel.test.tsx
  - src/app/actions/__tests__/getStrategyTradePerformance.test.ts
  - ETF/tests/test_strategy_trades.py
  - src/components/features/strategy/__tests__/ConsensusChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyTradeUtils.test.ts
-->

---
### Requirement: Consensus chart slide header

Each chart slide header SHALL show the stock's distinct-strategy count as `{count} 策略共選` followed by the short labels of the selecting strategies. In history mode, when the entry has a last selected date, the header SHALL also show `最後 {MM/DD}`. The bare-K chart tags for each slide SHALL be the short strategy labels. When the stock name is empty, the stock id SHALL be used as the slide name.

#### Scenario: History mode header

- **WHEN** a slide in history mode represents stock 2330 with count 3 and last date 2026-10-28
- **THEN** its header shows `3 策略共選`, the three short strategy labels, and `最後 10/28`

#### Scenario: Latest mode header

- **WHEN** a slide in latest mode represents a stock selected by 2 strategies
- **THEN** its header shows `2 策略共選` and the two short strategy labels, with no last-date text


<!-- @trace
source: strategy-consensus-chart-view
updated: 2026-10-31
code:
  - src/lib/investment/strategyConsensusUtils.ts
  - ETF/pipeline/steps/strategy_signal_step.py
  - src/lib/investment/strategyTradeUtils.ts
  - supabase/migrations/20261031120000_add_strategy_trades.sql
  - src/app/actions/getStrategyTradePerformance.ts
  - src/components/features/strategy/MultiStrategyConsensusPanel.tsx
  - ETF/processors/strategy_trades.py
  - ETF/pipeline/orchestrator.py
  - src/components/features/strategy/TradeRecentExits.tsx
  - ETF/database/sql_storage.py
  - ETF/pipeline/steps/strategy_trade_step.py
  - src/components/features/strategy/TradeReturnColumns.tsx
  - src/components/features/strategy/TradeSummary.tsx
  - src/components/features/strategy/StrategyTag.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/strategy/ConsensusChartViewer.tsx
  - src/components/features/strategy/StrategyTradePerformancePanel.tsx
  - ETF/pipeline/context.py
  - src/components/features/strategy/ConsensusControls.tsx
  - src/components/features/strategy/TradeIndustryTable.tsx
tests:
  - ETF/tests/test_strategy_trade_step.py
  - src/components/features/strategy/__tests__/StrategyTradePerformancePanel.test.tsx
  - src/__tests__/lib/buildMultiConsensusStocks.test.ts
  - src/__tests__/components/MultiStrategyConsensusPanel.test.tsx
  - src/app/actions/__tests__/getStrategyTradePerformance.test.ts
  - ETF/tests/test_strategy_trades.py
  - src/components/features/strategy/__tests__/ConsensusChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyTradeUtils.test.ts
-->

---
### Requirement: Consensus chart on-demand snapshot loading

The consensus chart SHALL NOT query bare-K snapshots on the server. Each slide SHALL load its snapshot on demand only after it stays within the viewport for 300ms, requesting at most once per slide, reusing the existing lazy bare-K slide behavior. A failed or missing snapshot SHALL affect only that slide.

#### Scenario: Far jump loads only the destination

- **WHEN** the user jumps from the first slide directly to a distant slide
- **THEN** snapshot requests are issued only for slides that stayed in the viewport for 300ms, not for every slide passed on the way

#### Scenario: Snapshot request fails

- **WHEN** the snapshot request for one slide fails
- **THEN** that slide shows the chart-load-failure card and other slides keep loading normally


<!-- @trace
source: strategy-consensus-chart-view
updated: 2026-10-31
code:
  - src/lib/investment/strategyConsensusUtils.ts
  - ETF/pipeline/steps/strategy_signal_step.py
  - src/lib/investment/strategyTradeUtils.ts
  - supabase/migrations/20261031120000_add_strategy_trades.sql
  - src/app/actions/getStrategyTradePerformance.ts
  - src/components/features/strategy/MultiStrategyConsensusPanel.tsx
  - ETF/processors/strategy_trades.py
  - ETF/pipeline/orchestrator.py
  - src/components/features/strategy/TradeRecentExits.tsx
  - ETF/database/sql_storage.py
  - ETF/pipeline/steps/strategy_trade_step.py
  - src/components/features/strategy/TradeReturnColumns.tsx
  - src/components/features/strategy/TradeSummary.tsx
  - src/components/features/strategy/StrategyTag.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/strategy/ConsensusChartViewer.tsx
  - src/components/features/strategy/StrategyTradePerformancePanel.tsx
  - ETF/pipeline/context.py
  - src/components/features/strategy/ConsensusControls.tsx
  - src/components/features/strategy/TradeIndustryTable.tsx
tests:
  - ETF/tests/test_strategy_trade_step.py
  - src/components/features/strategy/__tests__/StrategyTradePerformancePanel.test.tsx
  - src/__tests__/lib/buildMultiConsensusStocks.test.ts
  - src/__tests__/components/MultiStrategyConsensusPanel.test.tsx
  - src/app/actions/__tests__/getStrategyTradePerformance.test.ts
  - ETF/tests/test_strategy_trades.py
  - src/components/features/strategy/__tests__/ConsensusChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyTradeUtils.test.ts
-->

---
### Requirement: Consensus chart empty state

When the consensus stock list is empty in chart view, the panel SHALL display "目前條件下無共選股" and SHALL NOT render the chart viewer.

#### Scenario: No consensus stocks

- **WHEN** the user opens `/investment/strategy?cmin=4&cview=chart` and no stock is selected by 4 or more strategies
- **THEN** the panel shows "目前條件下無共選股" and no chart viewer


<!-- @trace
source: strategy-consensus-chart-view
updated: 2026-10-31
code:
  - src/lib/investment/strategyConsensusUtils.ts
  - ETF/pipeline/steps/strategy_signal_step.py
  - src/lib/investment/strategyTradeUtils.ts
  - supabase/migrations/20261031120000_add_strategy_trades.sql
  - src/app/actions/getStrategyTradePerformance.ts
  - src/components/features/strategy/MultiStrategyConsensusPanel.tsx
  - ETF/processors/strategy_trades.py
  - ETF/pipeline/orchestrator.py
  - src/components/features/strategy/TradeRecentExits.tsx
  - ETF/database/sql_storage.py
  - ETF/pipeline/steps/strategy_trade_step.py
  - src/components/features/strategy/TradeReturnColumns.tsx
  - src/components/features/strategy/TradeSummary.tsx
  - src/components/features/strategy/StrategyTag.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/strategy/ConsensusChartViewer.tsx
  - src/components/features/strategy/StrategyTradePerformancePanel.tsx
  - ETF/pipeline/context.py
  - src/components/features/strategy/ConsensusControls.tsx
  - src/components/features/strategy/TradeIndustryTable.tsx
tests:
  - ETF/tests/test_strategy_trade_step.py
  - src/components/features/strategy/__tests__/StrategyTradePerformancePanel.test.tsx
  - src/__tests__/lib/buildMultiConsensusStocks.test.ts
  - src/__tests__/components/MultiStrategyConsensusPanel.test.tsx
  - src/app/actions/__tests__/getStrategyTradePerformance.test.ts
  - ETF/tests/test_strategy_trades.py
  - src/components/features/strategy/__tests__/ConsensusChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyTradeUtils.test.ts
-->

---
### Requirement: Consensus chart page layout

In chart view the strategy page SHALL render the consensus panel with its chart and SHALL NOT render the strategy analytics panel or the per-strategy signal cards. The page title row and the main view toggle SHALL remain. The chart viewer's back link SHALL point to the same consensus parameters with `cview` set to the list view. The chart viewer container SHALL offset the sticky sub-navigation so it does not overlap the panel above it. List and matrix views SHALL keep their existing page layout.

#### Scenario: Chart view hides cards

- **WHEN** the user opens `/investment/strategy?cview=chart`
- **THEN** the strategy analytics panel and the strategy signal cards are not rendered

#### Scenario: Back link preserves parameters

- **WHEN** the chart viewer is shown for `/investment/strategy?cmin=3&cview=chart&cwin=7`
- **THEN** its back link is `/investment/strategy?cmin=3&cwin=7`

<!-- @trace
source: strategy-consensus-chart-view
updated: 2026-10-31
code:
  - src/lib/investment/strategyConsensusUtils.ts
  - ETF/pipeline/steps/strategy_signal_step.py
  - src/lib/investment/strategyTradeUtils.ts
  - supabase/migrations/20261031120000_add_strategy_trades.sql
  - src/app/actions/getStrategyTradePerformance.ts
  - src/components/features/strategy/MultiStrategyConsensusPanel.tsx
  - ETF/processors/strategy_trades.py
  - ETF/pipeline/orchestrator.py
  - src/components/features/strategy/TradeRecentExits.tsx
  - ETF/database/sql_storage.py
  - ETF/pipeline/steps/strategy_trade_step.py
  - src/components/features/strategy/TradeReturnColumns.tsx
  - src/components/features/strategy/TradeSummary.tsx
  - src/components/features/strategy/StrategyTag.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/strategy/ConsensusChartViewer.tsx
  - src/components/features/strategy/StrategyTradePerformancePanel.tsx
  - ETF/pipeline/context.py
  - src/components/features/strategy/ConsensusControls.tsx
  - src/components/features/strategy/TradeIndustryTable.tsx
tests:
  - ETF/tests/test_strategy_trade_step.py
  - src/components/features/strategy/__tests__/StrategyTradePerformancePanel.test.tsx
  - src/__tests__/lib/buildMultiConsensusStocks.test.ts
  - src/__tests__/components/MultiStrategyConsensusPanel.test.tsx
  - src/app/actions/__tests__/getStrategyTradePerformance.test.ts
  - ETF/tests/test_strategy_trades.py
  - src/components/features/strategy/__tests__/ConsensusChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyTradeUtils.test.ts
-->