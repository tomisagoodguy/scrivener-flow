# fan-breakout-screener-page Specification

## Purpose

TBD - created by archiving change 'fan-breakout-screener'. Update Purpose after archive.

## Requirements

### Requirement: Screener page and data window

The system SHALL provide the route `/investment/strategy/fan-breakout` listing `fan_breakout` signals from the latest 30 calendar days, loaded through the server action `getFanBreakoutSignals()`. Rows SHALL be ordered by signal date descending, then by `score` descending. The `/investment/strategy` page SHALL contain a link to this route.

#### Scenario: Page lists recent signals

- **WHEN** `strategy_signals` contains `fan_breakout` rows dated within the latest 30 days
- **THEN** the page SHALL list each row with date, stock id, name, signal type (首次 or 再次), consecutive days, spread, and market

#### Scenario: No signals

- **WHEN** there are no `fan_breakout` rows within the latest 30 days
- **THEN** the page SHALL show an empty-state message and SHALL NOT show an error

#### Scenario: Query failure

- **WHEN** the server action fails to query `strategy_signals`
- **THEN** it SHALL return an empty `rows` array with a non-empty `error`, and the page SHALL display that error instead of the empty-state message


<!-- @trace
source: fan-breakout-screener
updated: 2026-10-24
code:
  - src/components/features/investment/ScrollChartSubNav.tsx
  - src/components/features/investment/BareKChart.tsx
  - src/components/features/strategy/FanBreakoutContinuousView.tsx
  - src/components/features/strategy/FanBreakoutSlideChart.tsx
  - src/components/features/strategy/StrategyChartFilterBar.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/investment/BareKScrollViewer.tsx
  - src/components/features/strategy/useFanBreakoutScreener.ts
  - src/lib/investment/fanBreakout.ts
  - src/components/features/investment/BareKSlideContent.tsx
  - src/components/features/investment/ScrollChartViewer.tsx
  - src/lib/investment/strategyUtils.ts
  - src/components/features/strategy/FanBreakoutChartPanel.tsx
  - src/components/features/strategy/FanBreakoutScreener.tsx
  - src/components/features/strategy/StrategyChartViewer.tsx
  - src/components/features/investment/BareKChartPanels.ts
  - src/components/features/strategy/FanBreakoutTable.tsx
tests:
  - src/lib/investment/__tests__/fanBreakout.test.ts
  - src/components/features/investment/__tests__/BareKChartPanels.test.ts
  - src/components/features/strategy/__tests__/FanBreakoutScreener.test.tsx
  - src/components/features/strategy/__tests__/StrategyChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyUtils.test.ts
  - src/components/features/investment/__tests__/ScrollChartViewer.test.tsx
-->

---
### Requirement: Client-side filters and pagination

The page SHALL provide filters for date range (within the 30-day window), signal type (全部, 首次, 再次), minimum consecutive days N, and market (全部, 上市, 上櫃), and SHALL paginate the filtered rows 20 per page. Changing any filter SHALL reset to page 1.

#### Scenario: Filter by signal type and market

- **WHEN** the user selects 首次 and 上櫃
- **THEN** only rows with `signalType = "first"` and `market = "上櫃"` SHALL be listed

#### Scenario: Minimum consecutive days

- **WHEN** the user sets minimum consecutive days to 3
- **THEN** only rows with `consecDays >= 3` SHALL be listed

##### Example: pagination after filtering

- **GIVEN** 45 rows match the active filters
- **WHEN** the page renders
- **THEN** it SHALL show 3 pages with 20, 20 and 5 rows


<!-- @trace
source: fan-breakout-screener
updated: 2026-10-24
code:
  - src/components/features/investment/ScrollChartSubNav.tsx
  - src/components/features/investment/BareKChart.tsx
  - src/components/features/strategy/FanBreakoutContinuousView.tsx
  - src/components/features/strategy/FanBreakoutSlideChart.tsx
  - src/components/features/strategy/StrategyChartFilterBar.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/investment/BareKScrollViewer.tsx
  - src/components/features/strategy/useFanBreakoutScreener.ts
  - src/lib/investment/fanBreakout.ts
  - src/components/features/investment/BareKSlideContent.tsx
  - src/components/features/investment/ScrollChartViewer.tsx
  - src/lib/investment/strategyUtils.ts
  - src/components/features/strategy/FanBreakoutChartPanel.tsx
  - src/components/features/strategy/FanBreakoutScreener.tsx
  - src/components/features/strategy/StrategyChartViewer.tsx
  - src/components/features/investment/BareKChartPanels.ts
  - src/components/features/strategy/FanBreakoutTable.tsx
tests:
  - src/lib/investment/__tests__/fanBreakout.test.ts
  - src/components/features/investment/__tests__/BareKChartPanels.test.ts
  - src/components/features/strategy/__tests__/FanBreakoutScreener.test.tsx
  - src/components/features/strategy/__tests__/StrategyChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyUtils.test.ts
  - src/components/features/investment/__tests__/ScrollChartViewer.test.tsx
-->

---
### Requirement: Performance since signal

For each row, `getFanBreakoutSignals()` SHALL compute from `stock_prices_daily` (unadjusted): `signalClose` (close on the signal date), `latestClose` and `latestDate` (most recent available close), `returnSinceSignal` = latestClose / signalClose − 1, and `highSinceSignal` / `lowSinceSignal` (max high and min low from the signal date to `latestDate`, inclusive). When the signal-date close is missing, all these fields SHALL be null and the page SHALL display "—". Positive returns SHALL use `text-rose-600` and negative returns `text-emerald-600`. The page SHALL label these fields as computed on unadjusted closing prices.

#### Scenario: Return computed

- **WHEN** the signal-date close is 100 and the latest close is 112
- **THEN** `returnSinceSignal` SHALL be 0.12 and SHALL be rendered in `text-rose-600`

#### Scenario: Price missing

- **WHEN** `stock_prices_daily` has no row for the stock on the signal date
- **THEN** `signalClose`, `returnSinceSignal`, `highSinceSignal` and `lowSinceSignal` SHALL be null and the page SHALL show "—"

##### Example: high and low window

| Date (signal = 10-01) | High | Low | Close |
| --------------------- | ---- | --- | ----- |
| 10-01                 | 102  | 98  | 100   |
| 10-02                 | 108  | 101 | 106   |
| 10-03                 | 107  | 95  | 97    |

Expected: `highSinceSignal = 108`, `lowSinceSignal = 95`, `returnSinceSignal = -0.03`.


<!-- @trace
source: fan-breakout-screener
updated: 2026-10-24
code:
  - src/components/features/investment/ScrollChartSubNav.tsx
  - src/components/features/investment/BareKChart.tsx
  - src/components/features/strategy/FanBreakoutContinuousView.tsx
  - src/components/features/strategy/FanBreakoutSlideChart.tsx
  - src/components/features/strategy/StrategyChartFilterBar.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/investment/BareKScrollViewer.tsx
  - src/components/features/strategy/useFanBreakoutScreener.ts
  - src/lib/investment/fanBreakout.ts
  - src/components/features/investment/BareKSlideContent.tsx
  - src/components/features/investment/ScrollChartViewer.tsx
  - src/lib/investment/strategyUtils.ts
  - src/components/features/strategy/FanBreakoutChartPanel.tsx
  - src/components/features/strategy/FanBreakoutScreener.tsx
  - src/components/features/strategy/StrategyChartViewer.tsx
  - src/components/features/investment/BareKChartPanels.ts
  - src/components/features/strategy/FanBreakoutTable.tsx
tests:
  - src/lib/investment/__tests__/fanBreakout.test.ts
  - src/components/features/investment/__tests__/BareKChartPanels.test.ts
  - src/components/features/strategy/__tests__/FanBreakoutScreener.test.tsx
  - src/components/features/strategy/__tests__/StrategyChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyUtils.test.ts
  - src/components/features/investment/__tests__/ScrollChartViewer.test.tsx
-->

---
### Requirement: Stock navigation and chart

Selecting a row SHALL show a candlestick chart for that stock using `StockChart` with `maPeriods = [5, 10, 20, 60, 120]` and an up-arrow marker on each date in `recentSignalDates` of that row. The page SHALL provide previous and next buttons that move the selection within the filtered rows, and the left and right arrow keys SHALL do the same when focus is not in a form input.

#### Scenario: Next stock

- **WHEN** row 3 of the filtered list is selected and the user clicks next
- **THEN** row 4 SHALL become selected and the chart SHALL show the stock of row 4

#### Scenario: Next across page boundary

- **WHEN** the last row of page 1 is selected and the user clicks next
- **THEN** the first row of page 2 SHALL become selected and the table SHALL show page 2

#### Scenario: Markers shown

- **WHEN** the selected row has `recentSignalDates = ["2026-09-30", "2026-10-22"]`
- **THEN** the chart SHALL render up-arrow markers below the bars on 2026-09-30 and 2026-10-22


<!-- @trace
source: fan-breakout-screener
updated: 2026-10-24
code:
  - src/components/features/investment/ScrollChartSubNav.tsx
  - src/components/features/investment/BareKChart.tsx
  - src/components/features/strategy/FanBreakoutContinuousView.tsx
  - src/components/features/strategy/FanBreakoutSlideChart.tsx
  - src/components/features/strategy/StrategyChartFilterBar.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/investment/BareKScrollViewer.tsx
  - src/components/features/strategy/useFanBreakoutScreener.ts
  - src/lib/investment/fanBreakout.ts
  - src/components/features/investment/BareKSlideContent.tsx
  - src/components/features/investment/ScrollChartViewer.tsx
  - src/lib/investment/strategyUtils.ts
  - src/components/features/strategy/FanBreakoutChartPanel.tsx
  - src/components/features/strategy/FanBreakoutScreener.tsx
  - src/components/features/strategy/StrategyChartViewer.tsx
  - src/components/features/investment/BareKChartPanels.ts
  - src/components/features/strategy/FanBreakoutTable.tsx
tests:
  - src/lib/investment/__tests__/fanBreakout.test.ts
  - src/components/features/investment/__tests__/BareKChartPanels.test.ts
  - src/components/features/strategy/__tests__/FanBreakoutScreener.test.tsx
  - src/components/features/strategy/__tests__/StrategyChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyUtils.test.ts
  - src/components/features/investment/__tests__/ScrollChartViewer.test.tsx
-->

---
### Requirement: StockChart optional moving averages and markers

`StockChart` SHALL accept optional props `maPeriods?: number[]` and `markers?: { time: string; text?: string }[]`. When `maPeriods` is omitted it SHALL draw MA5, MA20 and MA60 exactly as before; when `markers` is omitted it SHALL draw no markers. Markers whose `time` has no matching bar SHALL be ignored without error.

#### Scenario: Existing usage unchanged

- **WHEN** `StockChart` is rendered with only `data` and `isDarkMode`
- **THEN** it SHALL draw exactly three moving-average lines (5, 20, 60) and no markers

#### Scenario: Marker without matching bar

- **WHEN** a marker `time` is not present in `data`
- **THEN** that marker SHALL be skipped and the chart SHALL render without throwing

<!-- @trace
source: fan-breakout-screener
updated: 2026-10-24
code:
  - src/components/features/investment/ScrollChartSubNav.tsx
  - src/components/features/investment/BareKChart.tsx
  - src/components/features/strategy/FanBreakoutContinuousView.tsx
  - src/components/features/strategy/FanBreakoutSlideChart.tsx
  - src/components/features/strategy/StrategyChartFilterBar.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/investment/BareKScrollViewer.tsx
  - src/components/features/strategy/useFanBreakoutScreener.ts
  - src/lib/investment/fanBreakout.ts
  - src/components/features/investment/BareKSlideContent.tsx
  - src/components/features/investment/ScrollChartViewer.tsx
  - src/lib/investment/strategyUtils.ts
  - src/components/features/strategy/FanBreakoutChartPanel.tsx
  - src/components/features/strategy/FanBreakoutScreener.tsx
  - src/components/features/strategy/StrategyChartViewer.tsx
  - src/components/features/investment/BareKChartPanels.ts
  - src/components/features/strategy/FanBreakoutTable.tsx
tests:
  - src/lib/investment/__tests__/fanBreakout.test.ts
  - src/components/features/investment/__tests__/BareKChartPanels.test.ts
  - src/components/features/strategy/__tests__/FanBreakoutScreener.test.tsx
  - src/components/features/strategy/__tests__/StrategyChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyUtils.test.ts
  - src/components/features/investment/__tests__/ScrollChartViewer.test.tsx
-->