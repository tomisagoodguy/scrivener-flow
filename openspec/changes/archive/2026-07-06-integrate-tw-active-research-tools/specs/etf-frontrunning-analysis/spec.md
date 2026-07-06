## ADDED Requirements

### Requirement: Build add-events from holdings snapshot

The system SHALL extract "add events" from `etf_holdings_snapshot` by comparing consecutive disclosure dates per ETF. An add event SHALL be defined as: `delta_shares = cur_shares - prev_shares >= min_shares` AND (`delta_pct >= 5%` OR `is_new_position = true`). The minimum absolute threshold SHALL default to 100,000 shares.

#### Scenario: New position detected

- **WHEN** a stock appears in the latest snapshot but not in the previous snapshot for the same ETF
- **THEN** the event SHALL be recorded with `is_new_position = true`, `delta_pct = null`, and `delta_shares = cur_shares`

#### Scenario: Add-to-existing detected

- **WHEN** a stock's shares increased by ≥100,000 AND ≥5% between two consecutive snapshots
- **THEN** the event SHALL be recorded with `is_new_position = false`, computed `delta_shares`, and computed `delta_pct`

### Requirement: Compute abnormal volume ratio using FinLab

The system SHALL fetch daily trading volume via FinLab `data.get("price:成交股數")`. For each add event, the system SHALL compute the abnormal volume ratio at T, T+1, and T+2 as: `ratio(T+n) = vol(T+n) / median(vol[T-20 : T-1])`. Baseline MUST have at least 10 non-zero data points; otherwise the ratio SHALL be `null`.

#### Scenario: Ratio computed successfully

- **WHEN** 20 prior trading days of volume data are available
- **THEN** `r_t0`, `r_t1`, `r_t2` SHALL each be a float ≥ 0

#### Scenario: Insufficient baseline

- **WHEN** fewer than 10 non-zero days exist in the baseline window
- **THEN** all three ratios SHALL be stored as `null` and the event SHALL still be persisted

##### Example: ratio calculation

- **GIVEN** baseline vol (last 20 days): [1M, 1.2M, 0.9M, ...] with median = 1.0M, vol(T) = 2.5M
- **WHEN** ratio is computed
- **THEN** `r_t0 = 2.5`

### Requirement: Persist results to etf_frontrunning_stats

The system SHALL upsert computed events into `etf_frontrunning_stats` with schema: `etf_code`, `stock_code`, `event_date`, `delta_shares`, `prev_shares`, `cur_shares`, `delta_pct`, `is_new_position`, `r_t0`, `r_t1`, `r_t2`. The unique key SHALL be `(etf_code, stock_code, event_date)`.

#### Scenario: Upsert on re-run

- **WHEN** the step runs again for the same date
- **THEN** existing rows SHALL be updated (not duplicated) via ON CONFLICT DO UPDATE

### Requirement: Step is auxiliary — failure must not halt pipeline

The system SHALL wrap the entire step in a try/except block. On any exception, the step SHALL log the error and return without re-raising, so subsequent pipeline steps continue executing.

#### Scenario: FinLab API failure

- **WHEN** FinLab volume fetch raises an exception
- **THEN** the step SHALL log the error message and return gracefully without crashing the pipeline
