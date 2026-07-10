## ADDED Requirements

### Requirement: Market chips dashboard page

The system SHALL provide a Server Component page at `/investment/market-chips` rendering four sections from a single Server Action `getMarketChips()`: (1) TX institutional net-position trend (last 60 trading days, three lines), (2) MXF/TMF retail long-short ratio trend with a zero reference line, (3) margin and short balance trend, and (4) the current day's signal lists in three tabs (dual_buy / consecutive_buy / divergence). Signal rows with etf_cross = true MUST show an "ETF 同步加碼" badge and link to the stock page. Taiwan market colors (rose up, emerald down) MUST be used, and the investment entry page SHALL link to this page.

#### Scenario: Dashboard renders

- **WHEN** a user opens /investment/market-chips after at least one synced trading day
- **THEN** all four sections render, with empty-state notices for any table lacking data instead of blank areas

#### Scenario: Cross-marked signal navigation

- **WHEN** a dual_buy signal with etf_cross = true is displayed and clicked
- **THEN** the user lands on that stock's existing detail page
