# futures-chips-sync Specification

## Purpose

TBD - created by archiving change 'market-chips-dashboard'. Update Purpose after archive.

## Requirements

### Requirement: Futures institutional positions sync

The system SHALL fetch daily TAIFEX institutional open-interest data (futContractsDate) for TX, MXF, and TMF contracts covering dealer, trust, and foreign institutions, and upsert one row per (data_date, contract, institution) into `futures_institutional_daily` with long_oi, short_oi, and net_oi. The stage MUST be an auxiliary pipeline stage: a fetch failure is logged without interrupting the daily pipeline.

#### Scenario: Trading day sync

- **WHEN** the market-chips stage runs on a trading day after TAIFEX publishes data
- **THEN** nine institution rows (3 contracts × 3 institutions) exist for that date, and re-running the stage leaves row counts unchanged

#### Scenario: Source has no data yet

- **WHEN** TAIFEX has not yet published the current day's file
- **THEN** the futures segment skips with a log entry and writes no partial rows, while later segments still run


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

---
### Requirement: Retail long-short ratio for mini contracts

The system SHALL derive retail open interest for MXF and TMF as market OI minus the sum of the three institutions' OI, compute retail_ls_ratio = (retail_long − retail_short) / market_oi × 100, and store it on a per-contract summary row (institution = 'retail_summary'). The ratio MUST NOT be computed for TX.

#### Scenario: Retail ratio stored

- **WHEN** the futures segment completes for a trading day
- **THEN** exactly two retail_summary rows (MXF, TMF) exist for that date with retail_ls_ratio populated

##### Example: Ratio arithmetic

- **GIVEN** TMF market_oi = 100000, institutional long total = 40000, institutional short total = 55000
- **WHEN** retail values are derived (retail_long = 60000, retail_short = 45000)
- **THEN** retail_ls_ratio = (60000 − 45000) / 100000 × 100 = 15.0

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