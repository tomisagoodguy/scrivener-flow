# margin-trading-indicator Specification

## Purpose

TBD - created by archiving change 'market-chips-dashboard'. Update Purpose after archive.

## Requirements

### Requirement: Market margin balance series

The system SHALL fetch the TWSE MI_MARGN market-level margin summary daily and upsert one row per trading date into `market_margin_daily` with margin_balance, margin_change, short_balance, and short_change. The segment runs inside the auxiliary market-chips stage; a failure is logged without aborting other segments.

#### Scenario: Daily margin row

- **WHEN** the market-chips stage runs on a trading day
- **THEN** `market_margin_daily` has exactly one row for that date, and a re-run does not duplicate it

#### Scenario: Margin trend readable

- **WHEN** 60 trading days have been synced
- **THEN** querying the table ordered by data_date yields a gap-free series for charting (gaps only on non-trading days)

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