# etf-active-share Specification

## Purpose

TBD - created by archiving change 'integrate-tw-active-research-tools'. Update Purpose after archive.

## Requirements

### Requirement: Load latest TW-stock holdings per ETF

The system SHALL read the most recent `data_date` from `etf_holdings_snapshot` for each of the 11 active ETFs. Holdings SHALL be filtered to TW stock codes matching `^\d{4}[A-Z]?$`. Cash markers (`C_NTD`, `M_NTD`, etc.) SHALL be excluded. Remaining weights SHALL be renormalized to sum to 100%.

#### Scenario: ETF with insufficient TW exposure

- **WHEN** TW stock weights sum to less than 50% of total portfolio
- **THEN** the ETF SHALL be excluded from Active Share computation and logged


<!-- @trace
source: integrate-tw-active-research-tools
updated: 2026-07-06
code:
  - src/app/dark-theme.css
  - src/components/features/investment/EtfOverviewGrid.tsx
  - src/hooks/useWeather.ts
  - supabase/migrations/20260701120000_add_treemap_turnover.sql
  - src/app/actions/getStrategySignals.ts
  - src/app/investment/page.tsx
  - .github/workflows/etf_financials.yml
  - ETF/sync_stock_financials.py
  - src/app/investment/layout.tsx
  - src/lib/investment/streakUtils.ts
  - src/lib/investment/etfSectorActivityUtils.ts
  - ETF/pipeline/context.py
  - CLAUDE.md
  - .github/workflows/etf_daily.yml
  - src/components/features/investment/DailyFlowPanel.tsx
  - supabase/migrations/20260617120000_add_etf_flow_by_sector.sql
  - ETF/services/finlab/client.py
  - src/app/investment/streaks/page.tsx
  - src/components/dashboard/work-dashboard/PipelineView.tsx
  - src/app/actions/strategyRegistry.ts
  - src/app/investment/sectors/components/SectorTreemap.tsx
  - tsconfig.tsbuildinfo
  - src/app/actions/getTreemapData.ts
  - jest.config.js
  - ETF/database/__pycache__/connection.cpython-313.pyc
  - ETF/pipeline/steps/flow_compute_step.py
  - src/app/globals.css
  - ETF/pipeline/steps/sync_treemap_step.py
  - src/lib/cases/htmlExport.ts
  - src/lib/cases/exportInteractive.ts
  - ETF/pipeline/steps/strategy_signal_step.py
  - docs/TW_ACTIVE_INTEGRATION_REPORT.md
  - src/lib/investment/activeEtfs.ts
  - src/app/actions/getStreaks.ts
  - ETF/database/sql_storage.py
  - src/components/features/cases/ExportHtmlButton.tsx
  - ETF/pipeline/steps/sector_strength_step.py
  - src/components/features/investment/EtfSelector.tsx
  - src/app/investment/[etf]/page.tsx
tests:
  - src/lib/cases/__tests__/exportInteractive.integration.test.ts
  - ETF/tests/test_strategy_signal_step.py
  - ETF/test_strategy_simple.py
  - src/lib/cases/__tests__/exportInteractive.test.ts
  - src/__tests__/hooks/useHoldingsFilter.test.ts
  - src/components/features/investment/__tests__/SectorOverviewView.test.tsx
  - src/__tests__/lib/streakUtils.test.ts
  - src/components/features/investment/__tests__/EtfSelector.test.tsx
  - src/lib/investment/__tests__/activeEtfs.test.ts
  - src/components/features/investment/__tests__/EtfOverviewGridFilter.test.tsx
  - src/app/actions/__tests__/getStrategySignals.test.ts
  - src/lib/cases/__tests__/htmlExport.test.ts
  - ETF/tests/test_sector_fund_flow.py
-->

---
### Requirement: Compute Active Share matrix

The system SHALL compute Active Share between every pair of ETFs as: `AS(A, B) = 0.5 × Σ|w_A(i) - w_B(i)|` across all stock codes present in either portfolio. The system SHALL also compute AS of each ETF against the industry-mean portfolio (equal-weight average of all 11 ETFs).

#### Scenario: Pairwise matrix size

- **WHEN** N ETFs pass the TW-exposure filter
- **THEN** the output SHALL contain N×(N-1)/2 pairwise records

##### Example: pairwise count

| N active ETFs | Expected pair count |
|---|---|
| 11 | 55 |
| 8 | 28 |


<!-- @trace
source: integrate-tw-active-research-tools
updated: 2026-07-06
code:
  - src/app/dark-theme.css
  - src/components/features/investment/EtfOverviewGrid.tsx
  - src/hooks/useWeather.ts
  - supabase/migrations/20260701120000_add_treemap_turnover.sql
  - src/app/actions/getStrategySignals.ts
  - src/app/investment/page.tsx
  - .github/workflows/etf_financials.yml
  - ETF/sync_stock_financials.py
  - src/app/investment/layout.tsx
  - src/lib/investment/streakUtils.ts
  - src/lib/investment/etfSectorActivityUtils.ts
  - ETF/pipeline/context.py
  - CLAUDE.md
  - .github/workflows/etf_daily.yml
  - src/components/features/investment/DailyFlowPanel.tsx
  - supabase/migrations/20260617120000_add_etf_flow_by_sector.sql
  - ETF/services/finlab/client.py
  - src/app/investment/streaks/page.tsx
  - src/components/dashboard/work-dashboard/PipelineView.tsx
  - src/app/actions/strategyRegistry.ts
  - src/app/investment/sectors/components/SectorTreemap.tsx
  - tsconfig.tsbuildinfo
  - src/app/actions/getTreemapData.ts
  - jest.config.js
  - ETF/database/__pycache__/connection.cpython-313.pyc
  - ETF/pipeline/steps/flow_compute_step.py
  - src/app/globals.css
  - ETF/pipeline/steps/sync_treemap_step.py
  - src/lib/cases/htmlExport.ts
  - src/lib/cases/exportInteractive.ts
  - ETF/pipeline/steps/strategy_signal_step.py
  - docs/TW_ACTIVE_INTEGRATION_REPORT.md
  - src/lib/investment/activeEtfs.ts
  - src/app/actions/getStreaks.ts
  - ETF/database/sql_storage.py
  - src/components/features/cases/ExportHtmlButton.tsx
  - ETF/pipeline/steps/sector_strength_step.py
  - src/components/features/investment/EtfSelector.tsx
  - src/app/investment/[etf]/page.tsx
tests:
  - src/lib/cases/__tests__/exportInteractive.integration.test.ts
  - ETF/tests/test_strategy_signal_step.py
  - ETF/test_strategy_simple.py
  - src/lib/cases/__tests__/exportInteractive.test.ts
  - src/__tests__/hooks/useHoldingsFilter.test.ts
  - src/components/features/investment/__tests__/SectorOverviewView.test.tsx
  - src/__tests__/lib/streakUtils.test.ts
  - src/components/features/investment/__tests__/EtfSelector.test.tsx
  - src/lib/investment/__tests__/activeEtfs.test.ts
  - src/components/features/investment/__tests__/EtfOverviewGridFilter.test.tsx
  - src/app/actions/__tests__/getStrategySignals.test.ts
  - src/lib/cases/__tests__/htmlExport.test.ts
  - ETF/tests/test_sector_fund_flow.py
-->

---
### Requirement: Persist results to etf_active_share

The system SHALL upsert into `etf_active_share` with columns: `computed_date`, `etf_a`, `etf_b`, `active_share_pct`, `as_vs_mean_a`, `as_vs_mean_b`. The unique key SHALL be `(computed_date, etf_a, etf_b)` where `etf_a < etf_b` lexicographically.

#### Scenario: Weekly recalculation

- **WHEN** the step runs on any day with fresh snapshot data
- **THEN** a new row SHALL be inserted or the existing row for that date updated


<!-- @trace
source: integrate-tw-active-research-tools
updated: 2026-07-06
code:
  - src/app/dark-theme.css
  - src/components/features/investment/EtfOverviewGrid.tsx
  - src/hooks/useWeather.ts
  - supabase/migrations/20260701120000_add_treemap_turnover.sql
  - src/app/actions/getStrategySignals.ts
  - src/app/investment/page.tsx
  - .github/workflows/etf_financials.yml
  - ETF/sync_stock_financials.py
  - src/app/investment/layout.tsx
  - src/lib/investment/streakUtils.ts
  - src/lib/investment/etfSectorActivityUtils.ts
  - ETF/pipeline/context.py
  - CLAUDE.md
  - .github/workflows/etf_daily.yml
  - src/components/features/investment/DailyFlowPanel.tsx
  - supabase/migrations/20260617120000_add_etf_flow_by_sector.sql
  - ETF/services/finlab/client.py
  - src/app/investment/streaks/page.tsx
  - src/components/dashboard/work-dashboard/PipelineView.tsx
  - src/app/actions/strategyRegistry.ts
  - src/app/investment/sectors/components/SectorTreemap.tsx
  - tsconfig.tsbuildinfo
  - src/app/actions/getTreemapData.ts
  - jest.config.js
  - ETF/database/__pycache__/connection.cpython-313.pyc
  - ETF/pipeline/steps/flow_compute_step.py
  - src/app/globals.css
  - ETF/pipeline/steps/sync_treemap_step.py
  - src/lib/cases/htmlExport.ts
  - src/lib/cases/exportInteractive.ts
  - ETF/pipeline/steps/strategy_signal_step.py
  - docs/TW_ACTIVE_INTEGRATION_REPORT.md
  - src/lib/investment/activeEtfs.ts
  - src/app/actions/getStreaks.ts
  - ETF/database/sql_storage.py
  - src/components/features/cases/ExportHtmlButton.tsx
  - ETF/pipeline/steps/sector_strength_step.py
  - src/components/features/investment/EtfSelector.tsx
  - src/app/investment/[etf]/page.tsx
tests:
  - src/lib/cases/__tests__/exportInteractive.integration.test.ts
  - ETF/tests/test_strategy_signal_step.py
  - ETF/test_strategy_simple.py
  - src/lib/cases/__tests__/exportInteractive.test.ts
  - src/__tests__/hooks/useHoldingsFilter.test.ts
  - src/components/features/investment/__tests__/SectorOverviewView.test.tsx
  - src/__tests__/lib/streakUtils.test.ts
  - src/components/features/investment/__tests__/EtfSelector.test.tsx
  - src/lib/investment/__tests__/activeEtfs.test.ts
  - src/components/features/investment/__tests__/EtfOverviewGridFilter.test.tsx
  - src/app/actions/__tests__/getStrategySignals.test.ts
  - src/lib/cases/__tests__/htmlExport.test.ts
  - ETF/tests/test_sector_fund_flow.py
-->

---
### Requirement: Step is auxiliary — failure must not halt pipeline

The step SHALL catch all exceptions, log them, and return without re-raising.

#### Scenario: DB read failure

- **WHEN** Supabase query for snapshot data fails
- **THEN** the step SHALL log the error and complete gracefully

<!-- @trace
source: integrate-tw-active-research-tools
updated: 2026-07-06
code:
  - src/app/dark-theme.css
  - src/components/features/investment/EtfOverviewGrid.tsx
  - src/hooks/useWeather.ts
  - supabase/migrations/20260701120000_add_treemap_turnover.sql
  - src/app/actions/getStrategySignals.ts
  - src/app/investment/page.tsx
  - .github/workflows/etf_financials.yml
  - ETF/sync_stock_financials.py
  - src/app/investment/layout.tsx
  - src/lib/investment/streakUtils.ts
  - src/lib/investment/etfSectorActivityUtils.ts
  - ETF/pipeline/context.py
  - CLAUDE.md
  - .github/workflows/etf_daily.yml
  - src/components/features/investment/DailyFlowPanel.tsx
  - supabase/migrations/20260617120000_add_etf_flow_by_sector.sql
  - ETF/services/finlab/client.py
  - src/app/investment/streaks/page.tsx
  - src/components/dashboard/work-dashboard/PipelineView.tsx
  - src/app/actions/strategyRegistry.ts
  - src/app/investment/sectors/components/SectorTreemap.tsx
  - tsconfig.tsbuildinfo
  - src/app/actions/getTreemapData.ts
  - jest.config.js
  - ETF/database/__pycache__/connection.cpython-313.pyc
  - ETF/pipeline/steps/flow_compute_step.py
  - src/app/globals.css
  - ETF/pipeline/steps/sync_treemap_step.py
  - src/lib/cases/htmlExport.ts
  - src/lib/cases/exportInteractive.ts
  - ETF/pipeline/steps/strategy_signal_step.py
  - docs/TW_ACTIVE_INTEGRATION_REPORT.md
  - src/lib/investment/activeEtfs.ts
  - src/app/actions/getStreaks.ts
  - ETF/database/sql_storage.py
  - src/components/features/cases/ExportHtmlButton.tsx
  - ETF/pipeline/steps/sector_strength_step.py
  - src/components/features/investment/EtfSelector.tsx
  - src/app/investment/[etf]/page.tsx
tests:
  - src/lib/cases/__tests__/exportInteractive.integration.test.ts
  - ETF/tests/test_strategy_signal_step.py
  - ETF/test_strategy_simple.py
  - src/lib/cases/__tests__/exportInteractive.test.ts
  - src/__tests__/hooks/useHoldingsFilter.test.ts
  - src/components/features/investment/__tests__/SectorOverviewView.test.tsx
  - src/__tests__/lib/streakUtils.test.ts
  - src/components/features/investment/__tests__/EtfSelector.test.tsx
  - src/lib/investment/__tests__/activeEtfs.test.ts
  - src/components/features/investment/__tests__/EtfOverviewGridFilter.test.tsx
  - src/app/actions/__tests__/getStrategySignals.test.ts
  - src/lib/cases/__tests__/htmlExport.test.ts
  - ETF/tests/test_sector_fund_flow.py
-->