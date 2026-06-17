# sector-fund-flow-pipeline Specification

## Purpose

TBD - created by archiving change 'sector-fund-flow'. Update Purpose after archive.

## Requirements

### Requirement: Share stock-to-industry mapping via pipeline context

`SectorStrengthStep` SHALL populate `PipelineContext.stock_industry_map` (a mapping of `stock_code` to a list of FinLab `security_industry_themes` category strings) from the industry-theme data it already fetches, so that downstream steps reuse it without making an additional FinLab API call. The field SHALL default to an empty mapping.

#### Scenario: Mapping populated from fetched themes

- **WHEN** `SectorStrengthStep` successfully fetches and explodes `security_industry_themes`
- **THEN** `ctx.stock_industry_map` SHALL contain each stock code mapped to its list of category strings

#### Scenario: FinLab data unavailable

- **WHEN** `SectorStrengthStep` is skipped or its FinLab fetch fails
- **THEN** `ctx.stock_industry_map` SHALL remain an empty mapping and the pipeline SHALL continue without raising


<!-- @trace
source: sector-fund-flow
updated: 2026-06-17
code:
  - src/components/features/investment/DailyFlowPanel.tsx
  - ETF/pipeline/steps/sector_strength_step.py
  - supabase/migrations/20260617120000_add_etf_flow_by_sector.sql
  - ETF/pipeline/steps/flow_compute_step.py
  - ETF/pipeline/context.py
  - ETF/database/__pycache__/connection.cpython-313.pyc
tests:
  - ETF/tests/test_sector_fund_flow.py
  - src/components/features/investment/__tests__/SectorOverviewView.test.tsx
-->

---
### Requirement: Compute daily sector fund flow

`FlowComputeStep` SHALL aggregate the day's per-stock inflow and outflow into a two-level sector structure using `ctx.stock_industry_map`, and SHALL store the result in the `etf_flow_daily.by_sector` jsonb column. The structure SHALL be a list of parent themes sorted by net flow descending, where each parent theme contains its child sub-themes. A parent theme name is the segment before the first colon in a category string (or the whole string when it contains no colon). Monetary fields SHALL be in New Taiwan Dollars, consistent with `inflow.total_nt`.

#### Scenario: Aggregate inflow and outflow by parent theme

- **WHEN** `FlowComputeStep` runs with a non-empty `ctx.stock_industry_map`
- **THEN** each parent theme entry SHALL include `net_nt`, `in_nt`, `out_nt`, `in_count`, `out_count`, and a `children` list of its sub-themes, and parent entries SHALL be ordered by `net_nt` descending

##### Example: two stocks across themes

- **GIVEN** inflow: 2330(total_nt=100, categories=["半導體", "半導體:晶圓製造"]); outflow: 2317(total_nt=-40, categories=["電腦及週邊設備"])
- **WHEN** `FlowComputeStep` aggregates by sector
- **THEN** parent "半導體" SHALL have in_nt=100, out_nt=0, net_nt=100, in_count=1, out_count=0, with a child "半導體:晶圓製造" (net_nt=100); and parent "電腦及週邊設備" SHALL have out_nt=40, net_nt=-40, in_count=0, out_count=1

#### Scenario: Parent counts do not double-count a stock across its sub-themes

- **WHEN** a single inflow stock belongs to multiple sub-themes of the same parent theme
- **THEN** that stock SHALL be counted once in the parent theme's `in_count`

##### Example: one stock, two sub-themes

- **GIVEN** inflow: 2330(total_nt=100, categories=["半導體:晶圓製造", "半導體:IC設計"])
- **WHEN** `FlowComputeStep` aggregates by sector
- **THEN** parent "半導體" SHALL have in_count=1 and two children, "半導體:晶圓製造" and "半導體:IC設計"

#### Scenario: Industry mapping unavailable

- **WHEN** `ctx.stock_industry_map` is empty
- **THEN** `by_sector` SHALL be written as an empty list, the other flow fields (`inflow`, `outflow`, `by_etf`, `totals`) SHALL be computed as before, and the step SHALL NOT raise


<!-- @trace
source: sector-fund-flow
updated: 2026-06-17
code:
  - src/components/features/investment/DailyFlowPanel.tsx
  - ETF/pipeline/steps/sector_strength_step.py
  - supabase/migrations/20260617120000_add_etf_flow_by_sector.sql
  - ETF/pipeline/steps/flow_compute_step.py
  - ETF/pipeline/context.py
  - ETF/database/__pycache__/connection.cpython-313.pyc
tests:
  - ETF/tests/test_sector_fund_flow.py
  - src/components/features/investment/__tests__/SectorOverviewView.test.tsx
-->

---
### Requirement: Persist by_sector column on etf_flow_daily

The database schema SHALL provide a nullable `by_sector jsonb` column on `etf_flow_daily`. Existing rows SHALL retain NULL for this column (no historical backfill). The upsert of daily flow SHALL write `by_sector` and update it on conflict, consistent with the existing `inflow` and `by_etf` columns.

#### Scenario: Migration adds nullable column

- **WHEN** the migration is applied
- **THEN** `etf_flow_daily` SHALL have a `by_sector jsonb` column and pre-existing rows SHALL have NULL for it

#### Scenario: Upsert updates by_sector on conflict

- **WHEN** `FlowComputeStep` upserts a flow row whose `data_date` already exists
- **THEN** the `by_sector` value SHALL be updated together with the other flow columns

<!-- @trace
source: sector-fund-flow
updated: 2026-06-17
code:
  - src/components/features/investment/DailyFlowPanel.tsx
  - ETF/pipeline/steps/sector_strength_step.py
  - supabase/migrations/20260617120000_add_etf_flow_by_sector.sql
  - ETF/pipeline/steps/flow_compute_step.py
  - ETF/pipeline/context.py
  - ETF/database/__pycache__/connection.cpython-313.pyc
tests:
  - ETF/tests/test_sector_fund_flow.py
  - src/components/features/investment/__tests__/SectorOverviewView.test.tsx
-->