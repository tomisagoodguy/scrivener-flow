## ADDED Requirements

### Requirement: Chart view toggle on strategy page

The strategy page SHALL provide a third view toggle labeled "圖表" that navigates to `?view=chart`.

#### Scenario: User navigates to chart view

- **WHEN** user clicks the "圖表" toggle on the strategy page
- **THEN** the URL changes to `/investment/strategy?view=chart` and the page renders the chart scroll viewer

#### Scenario: View toggle highlights active selection

- **WHEN** the URL query param `view` equals `chart`
- **THEN** the "圖表" tab SHALL be highlighted and "策略視角" and "監控清單" tabs SHALL appear unselected

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

### Requirement: Strategy stock name display in chart header

The chart viewer SHALL display each stock's Chinese name alongside its code in the scroll viewer header.

#### Scenario: Name resolved from analytics data

- **WHEN** `getStrategyAnalytics()` returns a `stock_name` for the stock
- **THEN** the stock name SHALL appear next to the stock code in the section header

#### Scenario: Name missing

- **WHEN** no name is available in analytics data
- **THEN** only the stock code SHALL appear in the section header

### Requirement: Back navigation from chart view

The chart viewer's back button SHALL navigate to `/investment/strategy` (strategy page) rather than `/investment/bare-k`.

#### Scenario: User clicks back in chart view

- **WHEN** user clicks the back button in the sticky sub-nav of the chart viewer
- **THEN** the browser navigates to `/investment/strategy`
