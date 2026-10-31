# strategy-consensus-matrix Specification

## Purpose

TBD - created by archiving change 'strategy-consensus-panel-enhance'. Update Purpose after archive.

## Requirements

### Requirement: Consensus matrix view toggle

The multi-strategy consensus panel SHALL offer a "列表 / 矩陣 / 圖表" toggle implemented as links setting the URL search parameter `cview` to `list`, `matrix` or `chart`, preserving `cmin` and `cwin`. The default SHALL be `list`; any missing or unrecognized value SHALL be treated as `list`. The toggle SHALL apply in both latest mode and history mode.

#### Scenario: Switching to matrix

- **WHEN** the user clicks "矩陣" on `/investment/strategy?cmin=3`
- **THEN** the URL becomes `/investment/strategy?cmin=3&cview=matrix` and the matrix replaces the chip list

#### Scenario: Switching to chart

- **WHEN** the user clicks "圖表" on `/investment/strategy?cmin=3&cwin=14`
- **THEN** the URL becomes `/investment/strategy?cmin=3&cview=chart&cwin=14` and the bare-K chart viewer replaces the chip list

#### Scenario: Unrecognized view value

- **WHEN** the user opens `/investment/strategy?cview=grid`
- **THEN** the panel renders the list view and the "列表" option is highlighted


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
### Requirement: Stock by strategy matrix rendering

In matrix view the panel SHALL render a table whose rows are the consensus stocks (same set and order as the list view) and whose columns are the strategies that selected at least one row stock, ordered by number of selected row stocks descending, then strategy id ascending. Each column header SHALL show the strategy name; in latest mode it SHALL also show that strategy's data date (`MM/DD`). Each row header SHALL show stock code and name and link to `/investment/stock/<stock_id>`. A cell SHALL show a filled marker when the column strategy selected the row stock and SHALL be empty otherwise. The last column SHALL show the row's strategy count. The table container SHALL scroll horizontally on narrow screens instead of overflowing the page.

#### Scenario: Matrix cells reflect selections

- **WHEN** consensus stocks are 3055 (capital_layer, low_vol_alpha, trend_template) and 2464 (capital_layer, trend_template)
- **THEN** columns are capital_layer, trend_template, low_vol_alpha in that order, row 3055 has three filled cells, and row 2464 has filled cells under capital_layer and trend_template only

##### Example: column ordering

| Strategy | Row stocks selected | Column position |
|----------|--------------------|-----------------|
| capital_layer | 2 | 1st |
| trend_template | 2 | 2nd (id ascending after capital_layer) |
| low_vol_alpha | 1 | 3rd |

#### Scenario: Empty matrix

- **WHEN** zero stocks satisfy the threshold in matrix view
- **THEN** no table is rendered and the text "目前條件下無共選股" is shown