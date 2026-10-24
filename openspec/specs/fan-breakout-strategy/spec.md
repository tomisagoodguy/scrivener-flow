# fan-breakout-strategy Specification

## Purpose

TBD - created by archiving change 'fan-breakout-screener'. Update Purpose after archive.

## Requirements

### Requirement: Fan breakout selection conditions

The `fan_breakout` strategy SHALL select a stock on a trading day when ALL of the following hold on that day, computed on the adjusted close (`StrategyDataCache.adj_close`) with K = 5 trading days:

1. Bullish alignment: MA5 > MA10 > MA20 > MA60 > MA120
2. Rising averages: each of MA5, MA10, MA20, MA60, MA120 is greater than its own value K trading days earlier
3. Divergence: spread = MA5 / MA120 − 1 is greater than spread K trading days earlier
4. Liquidity: 20-day average of `v` (shares traded) is greater than 500,000
5. Revenue high: the 2-month average of monthly revenue equals the maximum of that 2-month average over the latest 9 months (minimum 6 observations)
6. Revenue momentum: YoY revenue growth (`rev_yoy`) is above 0 for 6 consecutive months, its 6-month average is above 25, and the latest YoY is greater than the YoY of the previous month

Monthly revenue conditions SHALL be aligned to the daily index by their publication date and carried forward, so that the strategy output stays daily.

#### Scenario: All conditions hold

- **WHEN** a stock satisfies conditions 1 through 6 on the latest trading day
- **THEN** the stock SHALL appear as selected in the latest row of the positions returned by `get_positions`

#### Scenario: Revenue condition fails

- **WHEN** a stock satisfies conditions 1 through 4 but its 2-month average revenue is below the 9-month maximum
- **THEN** the stock SHALL NOT be selected

#### Scenario: Insufficient history

- **WHEN** a stock has fewer than 125 trading days of adjusted close, so that MA120 K days earlier is undefined
- **THEN** the stock SHALL NOT be selected and no exception SHALL be raised

##### Example: alignment and divergence checks

| MA5 | MA10 | MA20 | MA60 | MA120 | all MAs above 5 days ago | spread vs 5 days ago | Selected (revenue and liquidity pass) |
| --- | ---- | ---- | ---- | ----- | ------------------------ | -------------------- | ------------------------------------- |
| 110 | 108  | 105  | 100  | 95    | yes                      | 0.158 > 0.120        | yes                                   |
| 110 | 108  | 105  | 100  | 95    | yes                      | 0.158 < 0.170        | no                                    |
| 110 | 104  | 105  | 100  | 95    | yes                      | 0.158 > 0.120        | no (MA10 < MA20)                      |


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
### Requirement: Universe limited to listed common stocks

The strategy SHALL evaluate only the columns whose stock id matches `^[1-9]\d{3}$`, excluding ETFs, TDRs and warrants.

#### Scenario: ETF and TDR excluded

- **WHEN** stock ids `0050`, `00981A`, `910861` and `2330` all satisfy the price and revenue conditions
- **THEN** only `2330` SHALL be selected


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
### Requirement: Daily positions output

`get_positions` SHALL return a numeric DataFrame indexed by trading day (not reindexed to revenue publication dates), with columns as stock ids. A selected cell SHALL hold that day's spread rounded to 4 decimals and floored at 0.0001 so it is always truthy; an unselected cell SHALL hold 0.0. When no stock qualifies on a day, that row SHALL be all 0.0 rather than None.

#### Scenario: No candidate on the latest day

- **WHEN** no stock satisfies all conditions on the latest trading day
- **THEN** the latest row SHALL be all 0.0 and StrategySignalStep SHALL write no `fan_breakout` rows for that day without raising a warning

#### Scenario: Output not frozen between revenue releases

- **WHEN** the latest trading day is three weeks after the last monthly revenue publication
- **THEN** the last index of the returned DataFrame SHALL equal the latest trading day of the adjusted close


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
### Requirement: Signal metadata per selected stock

The strategy SHALL implement `get_signal_metadata(cache)` returning a mapping from each stock selected on the latest trading day to an object with exactly these keys:

- `signal_type`: `"repeat"` if the stock was selected on any of the 10 trading days before the latest day, otherwise `"first"`
- `consec_days`: number of consecutive trading days, ending on the latest day, on which the stock was selected (minimum 1)
- `spread`: MA5 / MA120 − 1 on the latest day, rounded to 4 decimals
- `market`: `"上市"`, `"上櫃"`, or null when the classification is unavailable
- `recent_signal_dates`: all selection dates within the latest 120 trading days, inclusive of the latest day, formatted `YYYY-MM-DD`, ascending

#### Scenario: First signal after a gap

- **WHEN** a stock is selected today and was not selected on any of the previous 10 trading days
- **THEN** its metadata SHALL have `signal_type = "first"` and `consec_days = 1`

#### Scenario: Re-entry within 10 days

- **WHEN** a stock was selected on day T−4, not selected on T−3 through T−1, and selected on day T
- **THEN** its metadata SHALL have `signal_type = "repeat"` and `consec_days = 1`

##### Example: consecutive selection

- **GIVEN** a stock is selected on trading days T−2, T−1 and T, and not on T−3 through T−12
- **WHEN** `get_signal_metadata` runs for day T
- **THEN** it SHALL return `signal_type = "repeat"`, `consec_days = 3`, and `recent_signal_dates` ending with the dates of T−2, T−1, T


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
### Requirement: Score equals divergence spread

For every selected stock, the value written to `strategy_signals.score` SHALL be the latest-day spread (MA5 / MA120 − 1).

#### Scenario: Score written

- **WHEN** a stock is selected with MA5 = 110 and MA120 = 95 on the latest day
- **THEN** its `score` SHALL be 0.1579 (rounded to 4 decimals)


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
### Requirement: StrategySignalStep writes optional strategy metadata

`BaseStrategy` SHALL provide `get_signal_metadata(cache)` returning None by default. StrategySignalStep SHALL call it after `get_positions` for every strategy and, for each written row whose stock id is present in the returned mapping, SHALL store the JSON-serialized object in `conditions`. Rows for strategies that return None, or stocks absent from the mapping, SHALL keep `conditions` null. If `get_signal_metadata` raises, StrategySignalStep SHALL still write the rows of that strategy with `conditions` null and SHALL append a warning containing the strategy id to `ctx.validation_warnings`.

#### Scenario: Existing strategies unchanged

- **WHEN** a strategy that does not override `get_signal_metadata` selects stocks
- **THEN** its rows SHALL be written with `conditions` null, identical to the previous behavior

#### Scenario: Metadata written

- **WHEN** `fan_breakout` selects `2330` and its metadata contains `2330`
- **THEN** the `fan_breakout` row for `2330` SHALL have `conditions` equal to that metadata object

#### Scenario: Metadata hook raises

- **WHEN** `get_signal_metadata` raises an exception for `fan_breakout`
- **THEN** the selected rows SHALL still be written with `conditions` null and `ctx.validation_warnings` SHALL contain an entry mentioning `fan_breakout`


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
### Requirement: Adjusted close in shared cache

`StrategyDataCache` SHALL expose `adj_close` loaded from FinLab `etl:adj_close` and cached for reuse across strategies within one run.

#### Scenario: Loaded once per run

- **WHEN** `adj_close` is accessed twice on the same cache instance
- **THEN** FinLab `data.get("etl:adj_close")` SHALL be called once

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