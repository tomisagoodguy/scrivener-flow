# etf-matched-pairs Specification

## Purpose

TBD - created by archiving change 'integrate-tw-active-research-tools'. Update Purpose after archive.

## Requirements

### Requirement: Identify overlap stocks between active and passive ETF add events

The system SHALL collect add events for both the 11 active ETFs (from `etf_holdings_snapshot`) and passive ETF benchmark components derived from FinLab index composition data (`data.get("index_components:成分股")`). Passive "add events" SHALL be defined by the same delta thresholds as active events. The system SHALL identify stock codes appearing in both active and passive event sets.

#### Scenario: Overlap stock qualifies for pairing

- **WHEN** a stock has ≥2 active add events AND ≥2 passive add events within the analysis window
- **THEN** it SHALL be included in the matched pairs output

#### Scenario: Below minimum event threshold

- **WHEN** a stock has fewer than 2 active OR fewer than 2 passive events
- **THEN** it SHALL be excluded from paired analysis


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
### Requirement: Compute paired abnormal vol difference per stock

For each overlap stock, the system SHALL compute:
- `active_median_r`: median of `r_t0` across all active add events for that stock
- `passive_median_r`: median of `r_t0` across all passive add events for that stock
- `diff_median`: `active_median_r - passive_median_r`

Positive `diff_median` indicates active abnormal vol is higher; negative indicates passive is higher.

#### Scenario: Summary sign count

- **WHEN** pairs are computed
- **THEN** the output SHALL include `n_active_higher`, `n_passive_higher`, and `median_of_diffs` across all overlap stocks

##### Example: interpretation

| median_of_diffs | Interpretation |
|---|---|
| > +0.05 | Active abnormal vol higher even after stock-mix control |
| < -0.05 | Passive abnormal vol higher; H1v2 conclusion holds |
| -0.05 to +0.05 | No significant difference |


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
### Requirement: Persist results to etf_matched_pairs

The system SHALL upsert per-stock records into `etf_matched_pairs` with columns: `computed_date`, `stock_code`, `stock_name`, `n_active_events`, `n_passive_events`, `active_median_r`, `passive_median_r`, `diff_median`. Unique key: `(computed_date, stock_code)`. A summary row SHALL also be upserted into `etf_matched_pairs_summary` with `computed_date`, `n_pairs`, `n_active_higher`, `n_passive_higher`, `median_of_diffs`.

#### Scenario: Summary updated on re-run

- **WHEN** step runs again for the same computed_date
- **THEN** both detail and summary rows SHALL be updated via upsert


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

#### Scenario: FinLab index composition fetch failure

- **WHEN** FinLab passive index component fetch fails
- **THEN** the step SHALL log the error and return gracefully without crashing the pipeline

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