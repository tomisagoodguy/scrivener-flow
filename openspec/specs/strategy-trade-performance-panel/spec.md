# strategy-trade-performance-panel Specification

## Purpose

Show on the strategy page how each strategy's picks performed after the rebalance: which holdings are in profit or loss, which industries are doing well or badly, and how recently removed stocks performed after exit.

## Requirements

### Requirement: Trade performance panel placement and strategy switch

The "換股後表現" panel SHALL be rendered only in the trades view of `/investment/strategy` (`view=trades`), below the page title row and the main view toggle; the strategy view (no `view` parameter), the monitor view and the chart view SHALL NOT render it. The panel SHALL offer a switch with "全部" (default) and one option per strategy present in the data, labelled with the short strategy label. Switching SHALL be client-side state and SHALL NOT change the URL. The panel SHALL include a note that figures are price returns from the next-day open, adjusted for dividends, excluding fees and taxes, and recomputed with the current strategy logic.

#### Scenario: Switch to a single strategy

- **WHEN** the user selects a strategy option in the panel on `/investment/strategy?view=trades`
- **THEN** every section of the panel shows only that strategy's trades and the URL is unchanged

#### Scenario: Not shown in other views

- **WHEN** the user opens `/investment/strategy?view=monitor`
- **THEN** the panel is not rendered

#### Scenario: Strategy view no longer embeds the panel

- **WHEN** the user opens `/investment/strategy`
- **THEN** the strategy analytics panel, the multi-strategy consensus panel and the strategy signal cards are rendered and the "換股後表現" panel is not


<!-- @trace
source: strategy-trades-view-tab
updated: 2026-10-31
code:
  - src/components/features/strategy/StrategyViewTabs.tsx
  - src/lib/investment/strategyUtils.ts
  - src/app/investment/strategy/page.tsx
tests:
  - src/components/features/strategy/__tests__/StrategyViewTabs.test.tsx
  - src/lib/investment/__tests__/strategyUtils.test.ts
-->

---
### Requirement: Holding summary and win rate

The panel SHALL show, for the selected scope: the number of open holdings with a non-null holding return, their average holding return, and the win rate defined as the count with holding return greater than 0 divided by that number; plus the number of trades exited within the last 60 days and their average post-exit return. Open holdings with null entry date SHALL be listed separately as "待進場" and excluded from all statistics.

#### Scenario: Win rate calculation

- **WHEN** the selected scope has open holdings with returns 0.10, -0.05, 0.02 and one pending holding
- **THEN** the panel shows 3 holdings, average return 2.33%, win rate 66.7%, and lists the pending stock under "待進場"

##### Example: Summary values

| Open holding returns   | Count | Average | Win rate |
| ---------------------- | ----- | ------- | -------- |
| 0.10, -0.05, 0.02      | 3     | 2.33%   | 66.7%    |
| (none)                 | 0     | —       | —        |


<!-- @trace
source: strategy-trade-performance
updated: 2026-10-31
code:
  - src/lib/investment/strategyTradeUtils.ts
  - supabase/migrations/20261031120000_add_strategy_trades.sql
  - ETF/pipeline/steps/strategy_trade_step.py
  - ETF/database/sql_storage.py
  - src/app/actions/getStrategyTradePerformance.ts
  - src/components/features/strategy/StrategyTradePerformancePanel.tsx
  - src/components/features/strategy/MultiStrategyConsensusPanel.tsx
  - src/components/features/strategy/StrategyTag.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/strategy/TradeSummary.tsx
  - ETF/pipeline/context.py
  - src/components/features/strategy/TradeIndustryTable.tsx
  - ETF/processors/strategy_trades.py
  - src/components/features/strategy/TradeRecentExits.tsx
  - src/components/features/strategy/ConsensusChartViewer.tsx
  - src/components/features/strategy/ConsensusControls.tsx
  - ETF/pipeline/steps/strategy_signal_step.py
  - src/components/features/strategy/TradeReturnColumns.tsx
  - ETF/pipeline/orchestrator.py
  - src/lib/investment/strategyConsensusUtils.ts
tests:
  - src/__tests__/lib/buildMultiConsensusStocks.test.ts
  - src/app/actions/__tests__/getStrategyTradePerformance.test.ts
  - ETF/tests/test_strategy_trade_step.py
  - src/lib/investment/__tests__/strategyTradeUtils.test.ts
  - src/components/features/strategy/__tests__/ConsensusChartViewer.test.tsx
  - src/components/features/strategy/__tests__/StrategyTradePerformancePanel.test.tsx
  - ETF/tests/test_strategy_trades.py
  - src/__tests__/components/MultiStrategyConsensusPanel.test.tsx
-->

---
### Requirement: Positive and negative holdings split

The panel SHALL list open holdings in two columns: "正報酬" with holding return greater than 0 sorted descending, and "負報酬" with holding return less than or equal to 0 sorted ascending. Each row SHALL show stock name, stock id, industry, holding return and calendar days held from entry date to the latest data date; in "全部" mode each row SHALL also show the short strategy label. Positive returns SHALL use `text-rose-600 dark:text-rose-400`, negative returns `text-emerald-600 dark:text-emerald-400`, and zero a gray color.

#### Scenario: Split and order

- **WHEN** open holdings have returns A 0.08, B -0.03, C 0.15, D 0
- **THEN** "正報酬" lists C then A, and "負報酬" lists B then D


<!-- @trace
source: strategy-trade-performance
updated: 2026-10-31
code:
  - src/lib/investment/strategyTradeUtils.ts
  - supabase/migrations/20261031120000_add_strategy_trades.sql
  - ETF/pipeline/steps/strategy_trade_step.py
  - ETF/database/sql_storage.py
  - src/app/actions/getStrategyTradePerformance.ts
  - src/components/features/strategy/StrategyTradePerformancePanel.tsx
  - src/components/features/strategy/MultiStrategyConsensusPanel.tsx
  - src/components/features/strategy/StrategyTag.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/strategy/TradeSummary.tsx
  - ETF/pipeline/context.py
  - src/components/features/strategy/TradeIndustryTable.tsx
  - ETF/processors/strategy_trades.py
  - src/components/features/strategy/TradeRecentExits.tsx
  - src/components/features/strategy/ConsensusChartViewer.tsx
  - src/components/features/strategy/ConsensusControls.tsx
  - ETF/pipeline/steps/strategy_signal_step.py
  - src/components/features/strategy/TradeReturnColumns.tsx
  - ETF/pipeline/orchestrator.py
  - src/lib/investment/strategyConsensusUtils.ts
tests:
  - src/__tests__/lib/buildMultiConsensusStocks.test.ts
  - src/app/actions/__tests__/getStrategyTradePerformance.test.ts
  - ETF/tests/test_strategy_trade_step.py
  - src/lib/investment/__tests__/strategyTradeUtils.test.ts
  - src/components/features/strategy/__tests__/ConsensusChartViewer.test.tsx
  - src/components/features/strategy/__tests__/StrategyTradePerformancePanel.test.tsx
  - ETF/tests/test_strategy_trades.py
  - src/__tests__/components/MultiStrategyConsensusPanel.test.tsx
-->

---
### Requirement: Industry aggregation

The panel SHALL aggregate open holdings with a non-null holding return by industry, showing per industry the holding count, average holding return, positive count and negative-or-zero count, sorted by average holding return descending. Holdings without an industry SHALL be grouped under "未分類".

#### Scenario: Industry ranking

- **WHEN** 半導體 has returns 0.10 and 0.04 and 航運 has return -0.06
- **THEN** 半導體 is listed first with count 2, average 7.00%, positive 2, negative 0, followed by 航運 with average -6.00%


<!-- @trace
source: strategy-trade-performance
updated: 2026-10-31
code:
  - src/lib/investment/strategyTradeUtils.ts
  - supabase/migrations/20261031120000_add_strategy_trades.sql
  - ETF/pipeline/steps/strategy_trade_step.py
  - ETF/database/sql_storage.py
  - src/app/actions/getStrategyTradePerformance.ts
  - src/components/features/strategy/StrategyTradePerformancePanel.tsx
  - src/components/features/strategy/MultiStrategyConsensusPanel.tsx
  - src/components/features/strategy/StrategyTag.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/strategy/TradeSummary.tsx
  - ETF/pipeline/context.py
  - src/components/features/strategy/TradeIndustryTable.tsx
  - ETF/processors/strategy_trades.py
  - src/components/features/strategy/TradeRecentExits.tsx
  - src/components/features/strategy/ConsensusChartViewer.tsx
  - src/components/features/strategy/ConsensusControls.tsx
  - ETF/pipeline/steps/strategy_signal_step.py
  - src/components/features/strategy/TradeReturnColumns.tsx
  - ETF/pipeline/orchestrator.py
  - src/lib/investment/strategyConsensusUtils.ts
tests:
  - src/__tests__/lib/buildMultiConsensusStocks.test.ts
  - src/app/actions/__tests__/getStrategyTradePerformance.test.ts
  - ETF/tests/test_strategy_trade_step.py
  - src/lib/investment/__tests__/strategyTradeUtils.test.ts
  - src/components/features/strategy/__tests__/ConsensusChartViewer.test.tsx
  - src/components/features/strategy/__tests__/StrategyTradePerformancePanel.test.tsx
  - ETF/tests/test_strategy_trades.py
  - src/__tests__/components/MultiStrategyConsensusPanel.test.tsx
-->

---
### Requirement: Recent exits with post-exit return

The panel SHALL list trades whose exit date is within the last 60 calendar days, showing stock name, stock id, exit date, holding return and post-exit return, sorted by exit date descending, with the same return colors.

#### Scenario: Stock keeps rising after exit

- **WHEN** a stock exited on 2026-10-01 with holding return 0.12 and has risen 0.05 since exit
- **THEN** the recent exits list shows it with holding return 12.00% and post-exit return 5.00%, both in the positive color


<!-- @trace
source: strategy-trade-performance
updated: 2026-10-31
code:
  - src/lib/investment/strategyTradeUtils.ts
  - supabase/migrations/20261031120000_add_strategy_trades.sql
  - ETF/pipeline/steps/strategy_trade_step.py
  - ETF/database/sql_storage.py
  - src/app/actions/getStrategyTradePerformance.ts
  - src/components/features/strategy/StrategyTradePerformancePanel.tsx
  - src/components/features/strategy/MultiStrategyConsensusPanel.tsx
  - src/components/features/strategy/StrategyTag.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/strategy/TradeSummary.tsx
  - ETF/pipeline/context.py
  - src/components/features/strategy/TradeIndustryTable.tsx
  - ETF/processors/strategy_trades.py
  - src/components/features/strategy/TradeRecentExits.tsx
  - src/components/features/strategy/ConsensusChartViewer.tsx
  - src/components/features/strategy/ConsensusControls.tsx
  - ETF/pipeline/steps/strategy_signal_step.py
  - src/components/features/strategy/TradeReturnColumns.tsx
  - ETF/pipeline/orchestrator.py
  - src/lib/investment/strategyConsensusUtils.ts
tests:
  - src/__tests__/lib/buildMultiConsensusStocks.test.ts
  - src/app/actions/__tests__/getStrategyTradePerformance.test.ts
  - ETF/tests/test_strategy_trade_step.py
  - src/lib/investment/__tests__/strategyTradeUtils.test.ts
  - src/components/features/strategy/__tests__/ConsensusChartViewer.test.tsx
  - src/components/features/strategy/__tests__/StrategyTradePerformancePanel.test.tsx
  - ETF/tests/test_strategy_trades.py
  - src/__tests__/components/MultiStrategyConsensusPanel.test.tsx
-->

---
### Requirement: Empty and failure states

When no trade data is available or the data query fails, the panel SHALL display "尚無換股後表現資料" and the rest of the strategy page SHALL render normally. Null returns SHALL be displayed as "—".

#### Scenario: Query failure

- **WHEN** the trade performance query fails
- **THEN** the panel shows "尚無換股後表現資料" and the strategy cards still render

<!-- @trace
source: strategy-trade-performance
updated: 2026-10-31
code:
  - src/lib/investment/strategyTradeUtils.ts
  - supabase/migrations/20261031120000_add_strategy_trades.sql
  - ETF/pipeline/steps/strategy_trade_step.py
  - ETF/database/sql_storage.py
  - src/app/actions/getStrategyTradePerformance.ts
  - src/components/features/strategy/StrategyTradePerformancePanel.tsx
  - src/components/features/strategy/MultiStrategyConsensusPanel.tsx
  - src/components/features/strategy/StrategyTag.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/strategy/TradeSummary.tsx
  - ETF/pipeline/context.py
  - src/components/features/strategy/TradeIndustryTable.tsx
  - ETF/processors/strategy_trades.py
  - src/components/features/strategy/TradeRecentExits.tsx
  - src/components/features/strategy/ConsensusChartViewer.tsx
  - src/components/features/strategy/ConsensusControls.tsx
  - ETF/pipeline/steps/strategy_signal_step.py
  - src/components/features/strategy/TradeReturnColumns.tsx
  - ETF/pipeline/orchestrator.py
  - src/lib/investment/strategyConsensusUtils.ts
tests:
  - src/__tests__/lib/buildMultiConsensusStocks.test.ts
  - src/app/actions/__tests__/getStrategyTradePerformance.test.ts
  - ETF/tests/test_strategy_trade_step.py
  - src/lib/investment/__tests__/strategyTradeUtils.test.ts
  - src/components/features/strategy/__tests__/ConsensusChartViewer.test.tsx
  - src/components/features/strategy/__tests__/StrategyTradePerformancePanel.test.tsx
  - ETF/tests/test_strategy_trades.py
  - src/__tests__/components/MultiStrategyConsensusPanel.test.tsx
-->

---
### Requirement: Trades view tab in strategy page toggle

The strategy page main view toggle SHALL render five tabs in this order: "策略視角" linking to `/investment/strategy`, "監控清單" linking to `/investment/strategy?view=monitor`, "圖表" linking to `/investment/strategy?view=chart`, "均線發散候選" linking to `/investment/strategy/fan-breakout`, and "換股後表現" linking to `/investment/strategy?view=trades`. The tab of the current view SHALL be highlighted; "均線發散候選" SHALL never be highlighted on this page. A missing or unrecognized `view` value SHALL be treated as the strategy view.

#### Scenario: Trades tab highlighted

- **WHEN** the user opens `/investment/strategy?view=trades`
- **THEN** the "換股後表現" tab is highlighted and the other four tabs are not

#### Scenario: Unrecognized view falls back

- **WHEN** the user opens `/investment/strategy?view=foo`
- **THEN** the strategy view is rendered and the "策略視角" tab is highlighted

##### Example: View parsing

| `view` param | Parsed view |
| ------------ | ----------- |
| (absent)     | strategy    |
| monitor      | monitor     |
| chart        | chart       |
| trades       | trades      |
| foo          | strategy    |


<!-- @trace
source: strategy-trades-view-tab
updated: 2026-10-31
code:
  - src/components/features/strategy/StrategyViewTabs.tsx
  - src/lib/investment/strategyUtils.ts
  - src/app/investment/strategy/page.tsx
tests:
  - src/components/features/strategy/__tests__/StrategyViewTabs.test.tsx
  - src/lib/investment/__tests__/strategyUtils.test.ts
-->

---
### Requirement: Trades view data loading

In the trades view the page SHALL query only the strategy signals (for the title data date) and the trade performance data; it SHALL NOT query factor IC, strategy analytics, consensus signals, consensus history, bare-K snapshots or fan-breakout signals. The title data date SHALL be the strategy signals date, falling back to the trade performance `asOf` date. The trades view SHALL render the panel even when no strategy signals are available. The strategy view SHALL NOT query the trade performance data.

#### Scenario: No strategy signals in trades view

- **WHEN** the strategy signals query returns no result and the trade performance data has `asOf` 2026-10-30
- **THEN** `/investment/strategy?view=trades` shows the panel and the title data date 2026-10-30 instead of the "尚無策略訊號資料" message

<!-- @trace
source: strategy-trades-view-tab
updated: 2026-10-31
code:
  - src/components/features/strategy/StrategyViewTabs.tsx
  - src/lib/investment/strategyUtils.ts
  - src/app/investment/strategy/page.tsx
tests:
  - src/components/features/strategy/__tests__/StrategyViewTabs.test.tsx
  - src/lib/investment/__tests__/strategyUtils.test.ts
-->