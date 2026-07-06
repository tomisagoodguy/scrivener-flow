# etf-cumulative-drag Specification

## Purpose

TBD - created by archiving change 'integrate-tw-active-research-tools'. Update Purpose after archive.

## Requirements

### Requirement: Compute per-event excess volume and manager drag

For each add event (shared source with `etf-frontrunning-analysis`), the system SHALL compute:
- `excess_volume_shares = max(r_t0 - 1, 0) × baseline_median_vol`
- `manager_drag_shares = abs(delta_shares) × max(r_t0 - 1, 0)`

Events where `r_t0` is `null` or baseline is unavailable SHALL be excluded from aggregation.

#### Scenario: No excess volume

- **WHEN** `r_t0 <= 1.0` (below-normal or normal volume on disclosure day)
- **THEN** both `excess_volume_shares` and `manager_drag_shares` SHALL be recorded as `0.0`


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
### Requirement: Annualize and normalize by AUM

For each ETF, the system SHALL aggregate events over the data window, annualize by `(365 / days_span)`, and normalize per unit AUM (億元) from `etf_aum_series`. Output metrics SHALL be:
- `events_per_year`: annualized event count
- `annual_excess_volume_kshares_per_yi`: annualized excess_volume / AUM in 千股/億
- `annual_manager_drag_kshares_per_yi`: annualized manager_drag / AUM in 千股/億

#### Scenario: AUM not available

- **WHEN** no AUM data exists for an ETF in `etf_aum_series`
- **THEN** the per-AUM metrics SHALL be stored as `null`; count metrics SHALL still be stored


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
### Requirement: Persist results to etf_cumulative_drag

The system SHALL upsert into `etf_cumulative_drag` with columns: `etf_code`, `computed_date`, `n_events`, `days_span`, `events_per_year`, `annual_excess_volume_kshares_per_yi`, `annual_manager_drag_kshares_per_yi`. Unique key: `(etf_code, computed_date)`.

#### Scenario: Re-run same date

- **WHEN** step runs twice on the same day
- **THEN** existing rows SHALL be overwritten via upsert


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

#### Scenario: Exception during annualization

- **WHEN** a division-by-zero or data error occurs during annualization
- **THEN** the step SHALL log the error and return gracefully

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