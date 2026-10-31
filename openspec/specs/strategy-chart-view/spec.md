# strategy-chart-view Specification

## Purpose

TBD - added via change 'strategy-chart-view'. Update Purpose after archive.

## Requirements

### Requirement: Chart view toggle on strategy page

The strategy page SHALL provide a third view toggle labeled "圖表" that navigates to `?view=chart`.

#### Scenario: User navigates to chart view

- **WHEN** user clicks the "圖表" toggle on the strategy page
- **THEN** the URL changes to `/investment/strategy?view=chart` and the page renders the chart scroll viewer

#### Scenario: View toggle highlights active selection

- **WHEN** the URL query param `view` equals `chart`
- **THEN** the "圖表" tab SHALL be highlighted and "策略視角" and "監控清單" tabs SHALL appear unselected


<!-- @trace
source: strategy-chart-view
updated: 2026-05-24
code:
  - .playwright-mcp/page-2026-05-24T08-22-21-332Z.yml
  - .playwright-mcp/page-2026-05-24T08-23-33-995Z.yml
  - .playwright-mcp/page-2026-05-24T08-24-09-101Z.png
  - src/app/actions/getStrategySnapshots.ts
  - ETF/pipeline/steps/sync_bare_k_step.py
  - src/components/features/strategy/StrategySectorRanking.tsx
  - .playwright-mcp/page-2026-05-24T08-22-37-363Z.yml
  - .playwright-mcp/page-2026-05-24T08-24-05-102Z.yml
  - .playwright-mcp/page-2026-05-24T08-22-24-741Z.png
  - src/app/investment/strategy/page.tsx
  - .playwright-mcp/page-2026-05-24T08-22-40-524Z.png
  - .playwright-mcp/page-2026-05-24T08-23-55-942Z.png
  - src/components/features/investment/BareKScrollViewer.tsx
  - src/components/features/strategy/StrategyChartViewer.tsx
  - .playwright-mcp/page-2026-05-24T08-23-37-356Z.png
  - .playwright-mcp/page-2026-05-24T08-23-50-805Z.yml
-->

---
### Requirement: Continuous scroll chart viewer for strategy stocks

The chart view SHALL display all strategy stocks as a vertically scrollable list of bare-K six-panel charts, reusing the `BareKScrollViewer` component.

#### Scenario: Stocks with snapshot data render charts

- **WHEN** `bare_k_snapshots` contains an entry for a strategy stock
- **THEN** the full six-panel chart (K-line, volume, margin ratio, monthly revenue, institutional chips) SHALL render for that stock

#### Scenario: Stocks without snapshot data show placeholder

- **WHEN** `bare_k_snapshots` has no entry for a strategy stock
- **THEN** the slot SHALL display a placeholder card with text: "此股票尚未同步裸K資料，將於今日 Pipeline 執行後更新"

#### Scenario: No strategy stock data available

- **WHEN** `getStrategySignals()` returns null or empty strategies
- **THEN** the chart view SHALL display "本日無策略選股資料"

#### Scenario: Navigation dots appear for multiple stocks

- **WHEN** the chart view contains more than 3 stocks
- **THEN** fixed right-side navigation dots SHALL appear, matching `BareKScrollViewer` behavior


<!-- @trace
source: strategy-chart-view
updated: 2026-05-24
code:
  - .playwright-mcp/page-2026-05-24T08-22-21-332Z.yml
  - .playwright-mcp/page-2026-05-24T08-23-33-995Z.yml
  - .playwright-mcp/page-2026-05-24T08-24-09-101Z.png
  - src/app/actions/getStrategySnapshots.ts
  - ETF/pipeline/steps/sync_bare_k_step.py
  - src/components/features/strategy/StrategySectorRanking.tsx
  - .playwright-mcp/page-2026-05-24T08-22-37-363Z.yml
  - .playwright-mcp/page-2026-05-24T08-24-05-102Z.yml
  - .playwright-mcp/page-2026-05-24T08-22-24-741Z.png
  - src/app/investment/strategy/page.tsx
  - .playwright-mcp/page-2026-05-24T08-22-40-524Z.png
  - .playwright-mcp/page-2026-05-24T08-23-55-942Z.png
  - src/components/features/investment/BareKScrollViewer.tsx
  - src/components/features/strategy/StrategyChartViewer.tsx
  - .playwright-mcp/page-2026-05-24T08-23-37-356Z.png
  - .playwright-mcp/page-2026-05-24T08-23-50-805Z.yml
-->

---
### Requirement: Strategy stock name display in chart header

The chart viewer SHALL display each stock's Chinese name alongside its code in the scroll viewer header.

#### Scenario: Name resolved from analytics data

- **WHEN** `getStrategyAnalytics()` returns a `stock_name` for the stock
- **THEN** the stock name SHALL appear next to the stock code in the section header

#### Scenario: Name missing

- **WHEN** no name is available in analytics data
- **THEN** only the stock code SHALL appear in the section header


<!-- @trace
source: strategy-chart-view
updated: 2026-05-24
code:
  - .playwright-mcp/page-2026-05-24T08-22-21-332Z.yml
  - .playwright-mcp/page-2026-05-24T08-23-33-995Z.yml
  - .playwright-mcp/page-2026-05-24T08-24-09-101Z.png
  - src/app/actions/getStrategySnapshots.ts
  - ETF/pipeline/steps/sync_bare_k_step.py
  - src/components/features/strategy/StrategySectorRanking.tsx
  - .playwright-mcp/page-2026-05-24T08-22-37-363Z.yml
  - .playwright-mcp/page-2026-05-24T08-24-05-102Z.yml
  - .playwright-mcp/page-2026-05-24T08-22-24-741Z.png
  - src/app/investment/strategy/page.tsx
  - .playwright-mcp/page-2026-05-24T08-22-40-524Z.png
  - .playwright-mcp/page-2026-05-24T08-23-55-942Z.png
  - src/components/features/investment/BareKScrollViewer.tsx
  - src/components/features/strategy/StrategyChartViewer.tsx
  - .playwright-mcp/page-2026-05-24T08-23-37-356Z.png
  - .playwright-mcp/page-2026-05-24T08-23-50-805Z.yml
-->

---
### Requirement: Back navigation from chart view

The chart viewer's back button SHALL navigate to `/investment/strategy` (strategy page) rather than `/investment/bare-k`.

#### Scenario: User clicks back in chart view

- **WHEN** user clicks the back button in the sticky sub-nav of the chart viewer
- **THEN** the browser navigates to `/investment/strategy`

<!-- @trace
source: strategy-chart-view
updated: 2026-05-24
code:
  - .playwright-mcp/page-2026-05-24T08-22-21-332Z.yml
  - .playwright-mcp/page-2026-05-24T08-23-33-995Z.yml
  - .playwright-mcp/page-2026-05-24T08-24-09-101Z.png
  - src/app/actions/getStrategySnapshots.ts
  - ETF/pipeline/steps/sync_bare_k_step.py
  - src/components/features/strategy/StrategySectorRanking.tsx
  - .playwright-mcp/page-2026-05-24T08-22-37-363Z.yml
  - .playwright-mcp/page-2026-05-24T08-24-05-102Z.yml
  - .playwright-mcp/page-2026-05-24T08-22-24-741Z.png
  - src/app/investment/strategy/page.tsx
  - .playwright-mcp/page-2026-05-24T08-22-40-524Z.png
  - .playwright-mcp/page-2026-05-24T08-23-55-942Z.png
  - src/components/features/investment/BareKScrollViewer.tsx
  - src/components/features/strategy/StrategyChartViewer.tsx
  - .playwright-mcp/page-2026-05-24T08-23-37-356Z.png
  - .playwright-mcp/page-2026-05-24T08-23-50-805Z.yml
-->

---
### Requirement: Chart view filter bar

The strategy chart view SHALL render a filter bar above the scroll chart viewer with two selects. The "策略" select SHALL offer "全部策略" plus one option per strategy that appears in the current chart stock list, labeled with the strategy's Chinese description and the number of stocks carrying it, formatted "<名稱>（N）". The "均線發散" select SHALL offer "全部", "首次" and "再次". Both filters SHALL be combined with AND. Filter state SHALL be held client-side and SHALL NOT be written to the URL.

#### Scenario: Filter by single strategy

- **WHEN** the user selects strategy "均線發散突破" in the "策略" select
- **THEN** only stocks whose strategy list contains `fan_breakout` are rendered in the viewer

#### Scenario: Filter by fan-breakout signal type

- **WHEN** the user selects "首次" in the "均線發散" select
- **THEN** only stocks that are fan-breakout candidates on the latest fan-breakout signal date with signal type "first" are rendered; stocks that are not fan-breakout candidates are excluded

##### Example: combined filters

| stock | strategies | fan signal type | strategy=all, fan=all | strategy=trend_template, fan=all | strategy=all, fan=first | strategy=trend_template, fan=first |
| ----- | ---------- | --------------- | --------------------- | -------------------------------- | ----------------------- | ---------------------------------- |
| 2330 | trend_template, fan_breakout | first | ✓ | ✓ | ✓ | ✓ |
| 2454 | fan_breakout | repeat | ✓ | ✗ | ✗ | ✗ |
| 3017 | trend_template | (none) | ✓ | ✓ | ✗ | ✗ |

#### Scenario: Strategy option counts

- **WHEN** the chart stock list has 3 stocks with `trend_template` and 2 with `fan_breakout`
- **THEN** the "策略" select shows options "全部策略", "<trend_template 名稱>（3）" and "均線發散突破（2）", and no option for strategies absent from the list

#### Scenario: Filter leaves no stock

- **WHEN** the selected filters match zero stocks
- **THEN** the view shows "沒有符合篩選條件的股票" and does not render the scroll chart viewer

#### Scenario: Filter change resets viewer position

- **WHEN** the user changes either filter
- **THEN** the scroll chart viewer remounts and starts at the first matching stock


<!-- @trace
source: fan-breakout-chart-crossref
updated: 2026-10-24
code:
  - src/components/features/strategy/StrategyChartFilterBar.tsx
  - src/lib/investment/strategyUtils.ts
  - src/components/features/strategy/FanBreakoutSlideChart.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/investment/ScrollChartSubNav.tsx
  - src/components/features/investment/ScrollChartViewer.tsx
  - src/components/features/investment/BareKScrollViewer.tsx
  - src/components/features/strategy/FanBreakoutContinuousView.tsx
  - src/components/features/strategy/FanBreakoutChartPanel.tsx
  - src/components/features/strategy/FanBreakoutScreener.tsx
  - src/components/features/strategy/StrategyChartViewer.tsx
  - src/components/features/strategy/useFanBreakoutScreener.ts
  - src/components/features/investment/BareKChartPanels.ts
  - src/lib/investment/fanBreakout.ts
  - src/components/features/investment/BareKSlideContent.tsx
  - src/components/features/investment/BareKChart.tsx
  - src/components/features/strategy/FanBreakoutTable.tsx
tests:
  - src/components/features/strategy/__tests__/FanBreakoutScreener.test.tsx
  - src/components/features/investment/__tests__/BareKChartPanels.test.ts
  - src/components/features/strategy/__tests__/StrategyChartViewer.test.tsx
  - src/components/features/investment/__tests__/ScrollChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyUtils.test.ts
  - src/lib/investment/__tests__/fanBreakout.test.ts
-->

---
### Requirement: Strategy tags show Chinese labels

Each chart in the strategy chart view SHALL display the strategy tags using the strategy description from the strategy signals result. When no description is available for a strategy ID, the tag SHALL fall back to the raw strategy ID.

#### Scenario: Known strategy id

- **WHEN** a stock carries strategy `fan_breakout` and the signals result describes it as "均線發散突破"
- **THEN** the chart tag reads "均線發散突破"

#### Scenario: Unknown strategy id

- **WHEN** a stock carries a strategy ID that has no description in the signals result
- **THEN** the chart tag shows the raw strategy ID


<!-- @trace
source: fan-breakout-chart-crossref
updated: 2026-10-24
code:
  - src/components/features/strategy/StrategyChartFilterBar.tsx
  - src/lib/investment/strategyUtils.ts
  - src/components/features/strategy/FanBreakoutSlideChart.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/investment/ScrollChartSubNav.tsx
  - src/components/features/investment/ScrollChartViewer.tsx
  - src/components/features/investment/BareKScrollViewer.tsx
  - src/components/features/strategy/FanBreakoutContinuousView.tsx
  - src/components/features/strategy/FanBreakoutChartPanel.tsx
  - src/components/features/strategy/FanBreakoutScreener.tsx
  - src/components/features/strategy/StrategyChartViewer.tsx
  - src/components/features/strategy/useFanBreakoutScreener.ts
  - src/components/features/investment/BareKChartPanels.ts
  - src/lib/investment/fanBreakout.ts
  - src/components/features/investment/BareKSlideContent.tsx
  - src/components/features/investment/BareKChart.tsx
  - src/components/features/strategy/FanBreakoutTable.tsx
tests:
  - src/components/features/strategy/__tests__/FanBreakoutScreener.test.tsx
  - src/components/features/investment/__tests__/BareKChartPanels.test.ts
  - src/components/features/strategy/__tests__/StrategyChartViewer.test.tsx
  - src/components/features/investment/__tests__/ScrollChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyUtils.test.ts
  - src/lib/investment/__tests__/fanBreakout.test.ts
-->

---
### Requirement: Fan-breakout context on chart view

For each stock that is a fan-breakout candidate on the latest fan-breakout signal date, the strategy chart view SHALL append "發散 +x.x%・首次|再次・連續 N 天" to the section header (omitting any part whose value is null) and SHALL draw an up-arrow marker below the K-line bar on each of the stock's recent signal dates that exists in the bare-K snapshot's OHLCV data. Stocks that are not fan-breakout candidates SHALL render exactly as before. When fan-breakout signals cannot be loaded, the chart view SHALL render all stocks without fan-breakout context and SHALL NOT show an error.

#### Scenario: Candidate shows header context and markers

- **WHEN** stock 2330 is a fan-breakout candidate on the latest fan-breakout date with spread 0.0871, signal type "repeat", consecutive days 4 and recent signal dates `[2026-10-17, 2026-10-22, 2026-10-23]`
- **THEN** its section header shows "發散 +8.7%・再次・連續 4 天" and its K-line panel shows markers on those three dates

#### Scenario: Marker date outside snapshot range

- **WHEN** a recent signal date is not present in the snapshot's OHLCV dates
- **THEN** no marker is drawn for that date and the other markers still render

#### Scenario: Fan-breakout signals unavailable

- **WHEN** loading fan-breakout signals returns an error
- **THEN** the chart view renders every stock with no fan-breakout header context and no markers, and no error message is displayed


<!-- @trace
source: fan-breakout-chart-crossref
updated: 2026-10-24
code:
  - src/components/features/strategy/StrategyChartFilterBar.tsx
  - src/lib/investment/strategyUtils.ts
  - src/components/features/strategy/FanBreakoutSlideChart.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/investment/ScrollChartSubNav.tsx
  - src/components/features/investment/ScrollChartViewer.tsx
  - src/components/features/investment/BareKScrollViewer.tsx
  - src/components/features/strategy/FanBreakoutContinuousView.tsx
  - src/components/features/strategy/FanBreakoutChartPanel.tsx
  - src/components/features/strategy/FanBreakoutScreener.tsx
  - src/components/features/strategy/StrategyChartViewer.tsx
  - src/components/features/strategy/useFanBreakoutScreener.ts
  - src/components/features/investment/BareKChartPanels.ts
  - src/lib/investment/fanBreakout.ts
  - src/components/features/investment/BareKSlideContent.tsx
  - src/components/features/investment/BareKChart.tsx
  - src/components/features/strategy/FanBreakoutTable.tsx
tests:
  - src/components/features/strategy/__tests__/FanBreakoutScreener.test.tsx
  - src/components/features/investment/__tests__/BareKChartPanels.test.ts
  - src/components/features/strategy/__tests__/StrategyChartViewer.test.tsx
  - src/components/features/investment/__tests__/ScrollChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyUtils.test.ts
  - src/lib/investment/__tests__/fanBreakout.test.ts
-->

---
### Requirement: Shared scroll viewer preserves bare-K watch page behavior

The scroll chart viewer used by the strategy chart view SHALL be the same component used by the bare-K watch page (`/investment/bare-k/[code]`). On the bare-K watch page, the viewer SHALL keep updating the browser URL to `/investment/bare-k/<code>` as the active section changes, keep the back link to `/investment/bare-k`, and keep showing navigation dots only when there are more than 3 stocks.

#### Scenario: Bare-K page URL sync

- **WHEN** the user scrolls the bare-K watch page so that stock 2454 becomes the active section
- **THEN** the browser URL becomes `/investment/bare-k/2454`

#### Scenario: Strategy chart view does not sync URL

- **WHEN** the active section changes in the strategy chart view
- **THEN** the browser URL stays `/investment/strategy?view=chart`

#### Scenario: Navigation dot threshold

- **WHEN** the viewer has exactly 3 stocks
- **THEN** no navigation dots are rendered; with 4 stocks, 4 dots are rendered

<!-- @trace
source: fan-breakout-chart-crossref
updated: 2026-10-24
code:
  - src/components/features/strategy/StrategyChartFilterBar.tsx
  - src/lib/investment/strategyUtils.ts
  - src/components/features/strategy/FanBreakoutSlideChart.tsx
  - src/app/investment/strategy/page.tsx
  - src/components/features/investment/ScrollChartSubNav.tsx
  - src/components/features/investment/ScrollChartViewer.tsx
  - src/components/features/investment/BareKScrollViewer.tsx
  - src/components/features/strategy/FanBreakoutContinuousView.tsx
  - src/components/features/strategy/FanBreakoutChartPanel.tsx
  - src/components/features/strategy/FanBreakoutScreener.tsx
  - src/components/features/strategy/StrategyChartViewer.tsx
  - src/components/features/strategy/useFanBreakoutScreener.ts
  - src/components/features/investment/BareKChartPanels.ts
  - src/lib/investment/fanBreakout.ts
  - src/components/features/investment/BareKSlideContent.tsx
  - src/components/features/investment/BareKChart.tsx
  - src/components/features/strategy/FanBreakoutTable.tsx
tests:
  - src/components/features/strategy/__tests__/FanBreakoutScreener.test.tsx
  - src/components/features/investment/__tests__/BareKChartPanels.test.ts
  - src/components/features/strategy/__tests__/StrategyChartViewer.test.tsx
  - src/components/features/investment/__tests__/ScrollChartViewer.test.tsx
  - src/lib/investment/__tests__/strategyUtils.test.ts
  - src/lib/investment/__tests__/fanBreakout.test.ts
-->

---
### Requirement: Strategy holding marks on chart

The strategy chart view SHALL query `strategy_trades` for the stocks shown in the chart and, on each stock's K-line panel, SHALL mark every `entry_signal_date` with a text marker "選" and every non-null `entry_date` with a text marker "買", both positioned above the bar. These markers SHALL be visually distinct from the fan-breakout markers (red up-arrows below the bar), which SHALL keep rendering unchanged. Trades from all strategies of the stock SHALL be included, regardless of the strategy filter selected in the filter bar. A date SHALL be marked only when the snapshot's `ohlcv` contains a drawn bar (non-null open and close) on that date; the same marker text SHALL appear at most once per date.

#### Scenario: Signal and entry dates are marked

- **WHEN** stock 2330 has a trade with `entry_signal_date` 2026-09-30 and `entry_date` 2026-10-01, and both dates are bars in the snapshot
- **THEN** the K-line panel shows "選" above the 2026-09-30 bar and "買" above the 2026-10-01 bar

#### Scenario: Dates outside the snapshot are skipped

- **WHEN** a trade's `entry_signal_date` is earlier than the first bar in the snapshot
- **THEN** no "選" marker is drawn for that trade and the chart renders without error

#### Scenario: Fan-breakout markers coexist

- **WHEN** a stock has both fan-breakout signal dates and strategy trades
- **THEN** the fan-breakout red up-arrows below the bar and the "選"/"買" text markers above the bar are all shown

#### Scenario: Trade query fails

- **WHEN** the `strategy_trades` query fails
- **THEN** the chart view still renders every stock's chart without "選"/"買" markers and without holding background, and the error is logged on the server


<!-- @trace
source: strategy-chart-holding-marks
updated: 2026-10-31
code:
  - src/app/investment/strategy/page.tsx
  - src/components/features/investment/BareKChartPanels.ts
  - src/components/features/investment/BareKSlideContent.tsx
  - src/app/actions/getWindowMomentum.ts
  - src/components/features/strategy/StrategyChartViewer.tsx
  - src/components/features/investment/BareKChart.tsx
  - src/lib/investment/strategyTradeUtils.ts
  - src/app/actions/getStrategyChartTrades.ts
tests:
  - src/app/actions/__tests__/getStrategyChartTrades.test.ts
  - src/components/features/investment/__tests__/BareKHoldingMarks.test.ts
  - src/lib/investment/__tests__/strategyHoldingMarks.test.ts
  - src/components/features/strategy/__tests__/StrategyChartViewer.test.tsx
-->

---
### Requirement: Holding period background on chart

The strategy chart view SHALL draw a single light background color on the K-line panel for every bar whose date falls inside a holding period. A holding period SHALL start at `entry_date` and end at `exit_date` inclusive; when `exit_date` is null the period SHALL extend to the last bar of the snapshot. Trades with null `entry_date` SHALL NOT produce a holding period. Holding periods of all strategies for the same stock SHALL be merged as a union and drawn in one color, so overlapping periods are not drawn darker. The background SHALL NOT change the K-line panel's price scale.

#### Scenario: Open position extends to latest bar

- **WHEN** stock 2330 has a trade with `entry_date` 2026-10-01 and null `exit_date`, and the snapshot's last bar is 2026-10-30
- **THEN** every bar from 2026-10-01 through 2026-10-30 has the holding background

#### Scenario: Overlapping strategies merge into one color

- **WHEN** stock 2454 is held by strategy A from 2026-09-01 to 2026-09-20 and by strategy B from 2026-09-15 to 2026-10-05
- **THEN** every bar from 2026-09-01 through 2026-10-05 has the same holding background color, and bars from 2026-09-15 to 2026-09-20 are not drawn darker

##### Example: union of holding periods

| trades (entry → exit) | last bar | bars with background |
| --------------------- | -------- | -------------------- |
| 09-01 → 09-20, 09-15 → 10-05 | 10-30 | 09-01 … 10-05 |
| 09-01 → 09-10, 10-01 → null | 10-30 | 09-01 … 09-10, 10-01 … 10-30 |
| entry null → null | 10-30 | none |

#### Scenario: Stock without trades

- **WHEN** a stock in the chart view has no `strategy_trades` rows
- **THEN** its K-line panel has no holding background and no "選"/"買" markers

<!-- @trace
source: strategy-chart-holding-marks
updated: 2026-10-31
code:
  - src/app/investment/strategy/page.tsx
  - src/components/features/investment/BareKChartPanels.ts
  - src/components/features/investment/BareKSlideContent.tsx
  - src/app/actions/getWindowMomentum.ts
  - src/components/features/strategy/StrategyChartViewer.tsx
  - src/components/features/investment/BareKChart.tsx
  - src/lib/investment/strategyTradeUtils.ts
  - src/app/actions/getStrategyChartTrades.ts
tests:
  - src/app/actions/__tests__/getStrategyChartTrades.test.ts
  - src/components/features/investment/__tests__/BareKHoldingMarks.test.ts
  - src/lib/investment/__tests__/strategyHoldingMarks.test.ts
  - src/components/features/strategy/__tests__/StrategyChartViewer.test.tsx
-->