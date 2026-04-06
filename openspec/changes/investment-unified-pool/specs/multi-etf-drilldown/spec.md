# Spec: multi-etf-drilldown

## ADDED Requirements

### Requirement: ETF drilldown page shows holdings and diff ledger for one ETF
`/investment/[etf]` SHALL display the two-tab structure: 持股明細 and 異動紀錄, scoped to the selected ETF. GoldenGrowthZone and StockPickerHub are NOT rendered on this page.

#### Scenario: Valid ETF code in URL
- **WHEN** user navigates to `/investment/00981A`
- **THEN** the page SHALL display 持股明細 and 異動紀錄 for 00981A only

#### Scenario: Invalid ETF code in URL
- **WHEN** user navigates to `/investment/XXXXX` where XXXXX is not in `ETF_REGISTRY`
- **THEN** the page SHALL redirect to `/investment`

### Requirement: Multi-ETF DiffLedger with ETF filter
The 異動紀錄 tab on the pool page (`/investment?tab=ledger`) SHALL display diff logs from ALL tracked ETFs merged chronologically, with per-ETF filter chips at the top.

#### Scenario: Default multi-ETF view
- **WHEN** user opens 異動紀錄 tab on the pool page
- **THEN** diff logs from all ETFs SHALL be shown, sorted by date descending
- **THEN** each log row SHALL display an ETF badge coloured according to the registry

#### Scenario: Filtering by one ETF
- **WHEN** user clicks the 00981A chip in the ETF filter bar
- **THEN** only diff logs with `etf_code = '00981A'` SHALL be shown

#### Scenario: Clearing filter
- **WHEN** user clicks 全部 chip
- **THEN** all ETF logs SHALL be shown again

### Requirement: Revenue Lab as standalone page
`/investment/revenue-lab` SHALL render the existing `RevenueLab` component (勝率回測 + 營收熱力圖 tabs) with `currentHoldings` set to the union of all tracked ETF holdings.

#### Scenario: Page renders correctly
- **WHEN** user navigates to `/investment/revenue-lab`
- **THEN** the page SHALL display both 勝率回測 Lab and 營收熱力圖 tabs
- **THEN** the stock scope SHALL reflect all ETFs in `ETF_REGISTRY`
