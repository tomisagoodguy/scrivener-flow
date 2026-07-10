# market-chips-page Specification

## Purpose

TBD - created by archiving change 'market-chips-dashboard'. Update Purpose after archive.

## Requirements

### Requirement: Market chips dashboard page

The system SHALL provide a Server Component page at `/investment/market-chips` rendering four sections from a single Server Action `getMarketChips()`: (1) TX institutional net-position trend (last 60 trading days, three lines), (2) MXF/TMF retail long-short ratio trend with a zero reference line, (3) margin and short balance trend, and (4) the current day's signal lists in three tabs (dual_buy / consecutive_buy / divergence). Signal rows with etf_cross = true MUST show an "ETF 同步加碼" badge and link to the stock page. Taiwan market colors (rose up, emerald down) MUST be used, and the investment entry page SHALL link to this page.

#### Scenario: Dashboard renders

- **WHEN** a user opens /investment/market-chips after at least one synced trading day
- **THEN** all four sections render, with empty-state notices for any table lacking data instead of blank areas

#### Scenario: Cross-marked signal navigation

- **WHEN** a dual_buy signal with etf_cross = true is displayed and clicked
- **THEN** the user lands on that stock's existing detail page

<!-- @trace
source: market-chips-dashboard
updated: 2026-07-10
code:
  - supabase/migrations/20260706000022_market_margin_daily.sql
  - ETF/CLAUDE.md
  - src/types/investment.ts
  - supabase/migrations/20260706000024_institutional_signals.sql
  - ETF/pipeline/steps/__init__.py
  - ETF/pipeline/steps/market_chips_step.py
  - ETF/pipeline/orchestrator.py
  - ETF/database/sql_storage.py
  - src/components/features/investment/DualAxisChart.tsx
  - src/components/features/investment/market-chips/RetailRatioChart.tsx
  - src/components/features/investment/market-chips/FuturesPositionChart.tsx
  - src/components/features/investment/market-chips/MarginBalanceChart.tsx
  - next-env.d.ts
  - src/app/investment/market-chips/page.tsx
  - src/app/investment/page.tsx
  - src/components/features/investment/market-chips/SignalTable.tsx
  - src/components/features/investment/market-chips/SignalTabs.tsx
  - supabase/migrations/20260706000021_futures_institutional_daily.sql
  - supabase/migrations/20260706000023_institutional_stock_daily.sql
  - ETF/scrapers/twse_chips_scraper.py
  - ETF/scrapers/taifex_scraper.py
  - src/app/actions/getMarketChips.ts
  - src/components/features/investment/EtfStockTradeView.tsx
tests:
  - ETF/tests/fixtures/taifex_daily_mtx_sample.csv
  - ETF/tests/test_taifex_scraper.py
  - ETF/tests/fixtures/taifex_fut_contracts_sample.html
  - ETF/tests/test_cleanup_old_data.py
  - ETF/tests/test_market_chips_step.py
  - ETF/tests/fixtures/twse_t86_sample.json
  - src/types/__tests__/investment.test.ts
  - ETF/tests/fixtures/tpex_institutional_sample.json
  - ETF/tests/fixtures/twse_margin_sample.json
  - ETF/tests/test_twse_chips_scraper.py
-->