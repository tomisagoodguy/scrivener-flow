## ADDED Requirements

### Requirement: Compute daily AUM from holdings snapshot

The system SHALL compute daily AUM (億元) for each ETF by reading `etf_holdings_snapshot` rows for each `data_date`. AUM SHALL be derived as: `AUM = C_NTD_value / (C_NTD_weight / 100)` when C_NTD weight is ≥ 0.1%; otherwise AUM SHALL fall back to `sum(shares × close_price)` from `stock_prices_daily`. NAV SHALL be read from `etf_nav_daily` table if available; otherwise NAV is estimated as `AUM / units`.

#### Scenario: C_NTD available

- **WHEN** the snapshot contains a `C_NTD` row with weight ≥ 0.1%
- **THEN** AUM SHALL be computed from C_NTD as the primary cash denominator

#### Scenario: C_NTD not available

- **WHEN** the snapshot contains no C_NTD entry
- **THEN** AUM SHALL be estimated from holdings market value only

### Requirement: Derive net inflow from unit changes

The system SHALL compute net daily inflow (億元) as: `inflow = Δunits × NAV` where `Δunits = units(T) - units(T-1)`. Positive inflow indicates net subscriptions; negative indicates net redemptions.

#### Scenario: First data point

- **WHEN** no prior-day unit count exists
- **THEN** inflow for that day SHALL be stored as `0.0`

### Requirement: Track cumulative inflow and growth attribution

The system SHALL maintain a running cumulative inflow field. The system SHALL compute `inflow_share_of_growth = cumulative_inflow / (aum_current - aum_first)` when `aum_current > aum_first`. When `aum_current <= aum_first`, `inflow_share_of_growth` SHALL be stored as `null`.

#### Scenario: AUM grew entirely from price appreciation

- **WHEN** cumulative_inflow is 0 but AUM increased
- **THEN** `inflow_share_of_growth = 0.0`

### Requirement: Persist daily time-series to etf_aum_series

The system SHALL upsert into `etf_aum_series` with columns: `etf_code`, `data_date`, `aum_yi`, `nav`, `units_yi`, `inflow_yi`, `cumulative_inflow_yi`, `inflow_share_of_growth`. Unique key: `(etf_code, data_date)`. Existing rows for the same date SHALL be overwritten.

#### Scenario: Incremental daily update

- **WHEN** the step runs on a new trading day
- **THEN** only the new date's row SHALL be inserted; prior rows SHALL remain unchanged

### Requirement: AumSyncStep enhanced — existing behavior preserved

The enhanced `AumSyncStep` SHALL continue all existing behavior (syncing AUM totals to `etf_meta` or equivalent). The new time-series computation SHALL be additive and SHALL NOT break or remove any existing fields already written by the step.

#### Scenario: Backward compatibility

- **WHEN** existing code reads AUM from the current target table
- **THEN** it SHALL continue to read the same fields with the same values as before

### Requirement: Step is auxiliary — failure must not halt pipeline

The step SHALL catch all exceptions related to the new time-series computation, log them, and continue. The existing AUM sync behavior SHALL execute regardless of new-code failures.

#### Scenario: Price lookup failure

- **WHEN** `stock_prices_daily` is unavailable for a holding
- **THEN** that holding's contribution SHALL be excluded and the step SHALL continue
