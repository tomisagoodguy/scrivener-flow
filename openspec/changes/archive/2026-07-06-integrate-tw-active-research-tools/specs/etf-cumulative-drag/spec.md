## ADDED Requirements

### Requirement: Compute per-event excess volume and manager drag

For each add event (shared source with `etf-frontrunning-analysis`), the system SHALL compute:
- `excess_volume_shares = max(r_t0 - 1, 0) × baseline_median_vol`
- `manager_drag_shares = abs(delta_shares) × max(r_t0 - 1, 0)`

Events where `r_t0` is `null` or baseline is unavailable SHALL be excluded from aggregation.

#### Scenario: No excess volume

- **WHEN** `r_t0 <= 1.0` (below-normal or normal volume on disclosure day)
- **THEN** both `excess_volume_shares` and `manager_drag_shares` SHALL be recorded as `0.0`

### Requirement: Annualize and normalize by AUM

For each ETF, the system SHALL aggregate events over the data window, annualize by `(365 / days_span)`, and normalize per unit AUM (億元) from `etf_aum_series`. Output metrics SHALL be:
- `events_per_year`: annualized event count
- `annual_excess_volume_kshares_per_yi`: annualized excess_volume / AUM in 千股/億
- `annual_manager_drag_kshares_per_yi`: annualized manager_drag / AUM in 千股/億

#### Scenario: AUM not available

- **WHEN** no AUM data exists for an ETF in `etf_aum_series`
- **THEN** the per-AUM metrics SHALL be stored as `null`; count metrics SHALL still be stored

### Requirement: Persist results to etf_cumulative_drag

The system SHALL upsert into `etf_cumulative_drag` with columns: `etf_code`, `computed_date`, `n_events`, `days_span`, `events_per_year`, `annual_excess_volume_kshares_per_yi`, `annual_manager_drag_kshares_per_yi`. Unique key: `(etf_code, computed_date)`.

#### Scenario: Re-run same date

- **WHEN** step runs twice on the same day
- **THEN** existing rows SHALL be overwritten via upsert

### Requirement: Step is auxiliary — failure must not halt pipeline

The step SHALL catch all exceptions, log them, and return without re-raising.

#### Scenario: Exception during annualization

- **WHEN** a division-by-zero or data error occurs during annualization
- **THEN** the step SHALL log the error and return gracefully
