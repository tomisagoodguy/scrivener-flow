# manager-view-page Specification

## Purpose

TBD - created by archiving change 'manager-fund-dual-track'. Update Purpose after archive.

## Requirements

### Requirement: Manager dual-track page

The system SHALL provide a Server Component page at `/investment/manager` that lists all managers from `fund_manager_map` (valid_to IS NULL) as cards. Selecting a manager SHALL display four panels: (a) the manager's ETF latest Top 20 holdings from `etf_holdings_snapshot`, (b) the manager's funds' latest monthly Top 10 from `fund_holdings_monthly`, (c) a dual-track gap table listing stocks present on one track but absent on the other, and (d) the manager's related `fund_signals` for the most recent 3 periods. Data access SHALL go through a Server Action `getManagerDualTrack(manager)` using the server Supabase client, with its return type exported from the action file.

#### Scenario: Manager with both tracks

- **WHEN** a user opens the panel for a manager who has both an ETF and at least one fund mapped
- **THEN** all four panels render, and the gap table marks each stock as fund-only or etf-only

#### Scenario: Manager with fund data not yet synced

- **WHEN** a manager's funds have no rows in `fund_holdings_monthly` for the latest month
- **THEN** the fund panel shows an explicit empty state naming the missing month instead of rendering blank


<!-- @trace
source: manager-fund-dual-track
updated: 2026-07-09
code:
  - ETF/analysis/__init__.py
  - ETF/run_fund_holdings_sync.py
  - next-env.d.ts
  - src/app/actions/getManagerDualTrack.ts
  - src/app/investment/manager/components/EtfHoldingsPanel.tsx
  - src/app/investment/manager/page.tsx
  - supabase/migrations/20260706000004_fund_signals.sql
  - src/app/investment/page.tsx
  - ETF/scripts/backfill_fund_holdings_mops.py
  - supabase/migrations/20260706000003_fund_manager_map.sql
  - ETF/utils/fund_name_normalizer.py
  - src/app/investment/manager/components/SignalsPanel.tsx
  - ETF/scrapers/mops_fund_scraper.py
  - supabase/migrations/20260706000002_fund_holdings_quarterly.sql
  - supabase/migrations/20260708000001_fund_tables_public_read.sql
  - supabase/migrations/20260706000001_fund_holdings_monthly.sql
  - .github/workflows/fund_holdings_monthly.yml
  - src/app/investment/manager/components/ManagerPicker.tsx
  - ETF/config/fund_manager_map.py
  - ETF/scrapers/sitca_scraper.py
  - ETF/analysis/fund_signals.py
  - ETF/CLAUDE.md
  - src/app/investment/manager/components/FundHoldingsPanel.tsx
  - src/app/investment/manager/components/GapTablePanel.tsx
tests:
  - src/app/actions/__tests__/getStrategySignals.test.ts
  - ETF/tests/test_mops_fund_scraper.py
  - ETF/tests/fixtures/sitca_in2630_sample.html
  - ETF/tests/test_fund_name_normalizer.py
  - ETF/tests/fixtures/sitca_in2629_sample.html
  - ETF/tests/fixtures/mops_t78sb39_q3_sample.html
  - ETF/tests/test_fund_signals.py
  - ETF/tests/test_sitca_scraper.py
  - ETF/tests/test_fund_holdings_sync.py
  - src/app/actions/__tests__/getManagerDualTrack.test.ts
-->

---
### Requirement: Signal caliber disclosure

The page SHALL visually distinguish and label the two signal calibers: ETF-only signals from `etf_signals` as daily-frequency approximations, and fund signals from `fund_signals` as monthly-frequency true dual-track signals. Taiwan market color convention MUST be followed (rose for increases, emerald for decreases).

#### Scenario: Labels visible

- **WHEN** the manager panel shows any signal badge
- **THEN** the badge carries a caliber label (日頻近似 or 月頻雙軌) so the two families cannot be confused

<!-- @trace
source: manager-fund-dual-track
updated: 2026-07-09
code:
  - ETF/analysis/__init__.py
  - ETF/run_fund_holdings_sync.py
  - next-env.d.ts
  - src/app/actions/getManagerDualTrack.ts
  - src/app/investment/manager/components/EtfHoldingsPanel.tsx
  - src/app/investment/manager/page.tsx
  - supabase/migrations/20260706000004_fund_signals.sql
  - src/app/investment/page.tsx
  - ETF/scripts/backfill_fund_holdings_mops.py
  - supabase/migrations/20260706000003_fund_manager_map.sql
  - ETF/utils/fund_name_normalizer.py
  - src/app/investment/manager/components/SignalsPanel.tsx
  - ETF/scrapers/mops_fund_scraper.py
  - supabase/migrations/20260706000002_fund_holdings_quarterly.sql
  - supabase/migrations/20260708000001_fund_tables_public_read.sql
  - supabase/migrations/20260706000001_fund_holdings_monthly.sql
  - .github/workflows/fund_holdings_monthly.yml
  - src/app/investment/manager/components/ManagerPicker.tsx
  - ETF/config/fund_manager_map.py
  - ETF/scrapers/sitca_scraper.py
  - ETF/analysis/fund_signals.py
  - ETF/CLAUDE.md
  - src/app/investment/manager/components/FundHoldingsPanel.tsx
  - src/app/investment/manager/components/GapTablePanel.tsx
tests:
  - src/app/actions/__tests__/getStrategySignals.test.ts
  - ETF/tests/test_mops_fund_scraper.py
  - ETF/tests/fixtures/sitca_in2630_sample.html
  - ETF/tests/test_fund_name_normalizer.py
  - ETF/tests/fixtures/sitca_in2629_sample.html
  - ETF/tests/fixtures/mops_t78sb39_q3_sample.html
  - ETF/tests/test_fund_signals.py
  - ETF/tests/test_sitca_scraper.py
  - ETF/tests/test_fund_holdings_sync.py
  - src/app/actions/__tests__/getManagerDualTrack.test.ts
-->