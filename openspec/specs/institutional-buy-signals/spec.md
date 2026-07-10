# institutional-buy-signals Specification

## Purpose

TBD - created by archiving change 'market-chips-dashboard'. Update Purpose after archive.

## Requirements

### Requirement: Per-stock institutional net-buy sync with rolling retention

The system SHALL fetch daily per-stock institutional net buy/sell values for listed (TWSE T86) and OTC (TPEx equivalent endpoint) stocks and upsert rows into `institutional_stock_daily` keyed by (data_date, stock_code) with foreign_net, trust_net, and dealer_net. Rows older than 90 days SHALL be deleted by the existing pipeline cleanup stage.

#### Scenario: Full-market daily sync

- **WHEN** the institutional segment runs on a trading day
- **THEN** both TWSE and TPEx stocks appear in `institutional_stock_daily` for that date and re-runs are idempotent

#### Scenario: Rolling cleanup

- **WHEN** the cleanup stage runs
- **THEN** no `institutional_stock_daily` rows older than 90 days remain, and `institutional_signals` rows are retained regardless of age


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
### Requirement: Daily institutional signals with ETF cross-marking

The system SHALL compute three signal lists per trading day from `institutional_stock_daily` and upsert them into `institutional_signals` keyed by (data_date, signal_type, stock_code):

1. `dual_buy` — foreign_net > 0 AND trust_net > 0 on the same day
2. `consecutive_buy` — (foreign_net + trust_net) > 0 for at least 3 consecutive trading days
3. `divergence` — foreign_net and trust_net have opposite signs and both absolute values rank within that day's top 50

Each signal row MUST set etf_cross = true when the same stock appears in `etf_diff_logs` with a BUY or IN action on the same date, and metadata MUST contain the net amounts used so the signal is auditable without re-querying source rows.

#### Scenario: Dual buy with ETF cross

- **WHEN** a stock has foreign_net > 0 and trust_net > 0, and an active ETF logged a BUY for it the same day
- **THEN** a dual_buy row exists with etf_cross = true and both net amounts in metadata

#### Scenario: Divergence requires magnitude

- **WHEN** a stock has foreign_net = +200 shares and trust_net = −100 shares but neither ranks in the day's top 50 by absolute value
- **THEN** no divergence row is written for that stock

#### Scenario: Consecutive buy respects trading-day gaps

- **WHEN** a stock has positive combined net buys on Friday, Monday, and Tuesday
- **THEN** a consecutive_buy row fires on Tuesday, because consecutiveness is measured in trading days, not calendar days

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