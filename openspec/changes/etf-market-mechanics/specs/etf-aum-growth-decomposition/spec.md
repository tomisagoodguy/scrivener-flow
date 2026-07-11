## ADDED Requirements

### Requirement: Daily flow decomposition metrics

The system SHALL compute, inside the AUM sync stage, two daily decomposition values per ETF and store them on the `etf_aum_series` row: inflow = (units_t − units_{t−1}) × nav_t (net subscription) and market_pnl = units_{t−1} × (nav_t − nav_{t−1}) (market value contribution). When the previous day's row is missing, both values MUST be NULL. Computation failures MUST be logged without interrupting the pipeline.

#### Scenario: Normal trading day

- **WHEN** the pipeline runs with both today's and yesterday's units and nav available
- **THEN** inflow and market_pnl are stored for today

##### Example: Decomposition arithmetic

- **GIVEN** yesterday units = 10.0 (億) with nav = 10.00, today units = 10.5 with nav = 10.20
- **WHEN** decomposition runs
- **THEN** inflow = 0.5 × 10.20 = 5.10 (億元) and market_pnl = 10.0 × 0.20 = 2.00 (億元)

#### Scenario: First day of series

- **WHEN** an ETF has no prior `etf_aum_series` row
- **THEN** inflow and market_pnl are NULL for that date

### Requirement: Aggregated growth indicators on demand

Aggregated indicators — growth multiple (aum_current / aum_first), inflow_share_of_growth (cumulative inflow / total AUM growth), top inflow day, and top outflow day — SHALL be computed at read time from the stored series by a Server Action, not persisted as snapshots. The Server Action `getEtfMechanics(etfCode)` SHALL return the premium series, dividend records, decomposition series, and these aggregates in one call using the server Supabase client, with exported return types and no `any`.

#### Scenario: Deep-dive fetch

- **WHEN** the market-mechanics tab loads for an ETF
- **THEN** one Server Action call returns all four data groups and renders without further client-side queries

### Requirement: Decomposition panel and cross-ETF ranking

The `/investment/[etf]` market-mechanics tab SHALL render a stacked chart of cumulative inflow versus cumulative market_pnl plus four KPI tiles (growth multiple, inflow share of growth, top inflow day, top outflow day), with a tooltip stating the approximation formula (units derived from AUM/NAV). The `/investment/compare` page SHALL add a sortable ranking table of inflow_share_of_growth across all registry ETFs.

#### Scenario: Ranking identifies scale-driven ETF

- **WHEN** a user sorts the compare-page ranking by inflow_share_of_growth descending
- **THEN** ETFs whose growth is mostly subscription-driven appear first, each row linking to its deep-dive page
