# Spec: unified-pool-view

## ADDED Requirements

### Requirement: Pool page aggregates all tracked ETFs
`/investment` (Server Component) SHALL fetch holdings, quant filters, and diff logs for ALL ETFs in `ETF_REGISTRY` and render the unified pool view. The page MUST NOT be scoped to a single ETF.

#### Scenario: Page load with three ETFs
- **WHEN** a user navigates to `/investment`
- **THEN** the page SHALL display holdings merged from 00981A, 00980A, and 00991A
- **THEN** each holding row SHALL show weights for each ETF it appears in (dash if not held)

#### Scenario: New ETF added to registry
- **WHEN** a fourth ETF is added to `ETF_REGISTRY`
- **THEN** the pool page SHALL include its holdings and show a new weight column without any page-level code changes

### Requirement: Pool view four-tab structure
The pool page InvestmentTabs SHALL render exactly four tabs: 選股池 / 策略分析 / 異動紀錄 / ETF 對比.

#### Scenario: Default tab on page load
- **WHEN** user navigates to `/investment` with no `?tab=` param
- **THEN** the 選股池 tab SHALL be active

#### Scenario: Tab persistence via URL
- **WHEN** user switches to 策略分析 tab
- **THEN** URL SHALL update to `?tab=analysis` and the tab state SHALL survive page refresh

### Requirement: Stock pool table includes Revenue YOY column
`StockPickerHub` SHALL display a `YOY%` column showing the latest monthly revenue year-over-year growth for each stock.

#### Scenario: YOY data available
- **WHEN** a holding has `revenue_yoy` data
- **THEN** the table SHALL display it as a coloured percentage (green ≥ 50%, red < 0%, neutral otherwise)

#### Scenario: YOY data unavailable
- **WHEN** a holding has no `revenue_yoy` data
- **THEN** the table SHALL display `—` in the YOY column

### Requirement: Golden Zone filter in stock pool
`StockPickerHub` SHALL include two additional factor filter buttons: 「黃金區間」(YOY 50–100%) and 「爆發區間」(YOY > 100%).

#### Scenario: Activating Golden Zone filter
- **WHEN** user clicks 「黃金區間」 filter button
- **THEN** only stocks with `50 ≤ revenue_yoy ≤ 100` SHALL remain visible in the table

#### Scenario: Activating Explosive Zone filter
- **WHEN** user clicks 「爆發區間」 filter button
- **THEN** only stocks with `revenue_yoy > 100` SHALL remain visible

#### Scenario: Combining filters
- **WHEN** user activates both 「動能正」 and 「黃金區間」
- **THEN** the table SHALL apply AND logic: only stocks passing both filters are shown

### Requirement: Strategy analysis tab uses union holdings
The 策略分析 tab SHALL pass the union of all ETF holdings to `GoldenGrowthZone` as its `data` prop.

#### Scenario: Union holdings displayed
- **WHEN** user opens the 策略分析 tab
- **THEN** `GoldenGrowthZone` SHALL receive holdings from all tracked ETFs combined
- **THEN** stocks held by multiple ETFs SHALL appear only once, with the highest weight across ETFs used

### Requirement: Revenue Lab accessible from pool page
The pool page header SHALL include a link/button to `/investment/revenue-lab`.

#### Scenario: Navigation to Revenue Lab
- **WHEN** user clicks the Revenue Lab entry point
- **THEN** browser SHALL navigate to `/investment/revenue-lab`
