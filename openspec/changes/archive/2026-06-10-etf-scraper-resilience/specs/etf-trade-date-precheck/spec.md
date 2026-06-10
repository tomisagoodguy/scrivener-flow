## ADDED Requirements

### Requirement: Pipeline checks latest data date before running

`CheckTradeDateStep` SHALL query `etf_holdings_snapshot` for the maximum `data_date` across all ETFs. If `max(data_date)` equals the expected last weekday (computed by `_last_weekday()`), the step SHALL set `ctx.skip_reason = "data_up_to_date"` and raise `EarlyExitSignal` to terminate the pipeline without error.

#### Scenario: Data is already up to date

- **WHEN** `max(data_date)` in `etf_holdings_snapshot` equals today's expected trading date
- **THEN** the pipeline logs "Data already up to date for <date>, skipping pipeline"
- **AND** the pipeline exits cleanly with no DB writes and no FinLab API calls

#### Scenario: Data needs updating

- **WHEN** `max(data_date)` is earlier than the expected trading date
- **THEN** `CheckTradeDateStep` completes normally and the pipeline continues

#### Scenario: No data exists yet

- **WHEN** `etf_holdings_snapshot` is empty (first run)
- **THEN** `max(data_date)` returns NULL
- **AND** the step treats NULL as "data not present" and allows the pipeline to continue

### Requirement: Early exit is non-destructive

When the early exit is triggered, the pipeline SHALL complete without sending LINE notifications or writing any records.

#### Scenario: No notification on early exit

- **WHEN** `EarlyExitSignal` is raised by `CheckTradeDateStep`
- **THEN** `NotifyStep` SHALL NOT send any LINE message
- **AND** `SaveSnapshotStep` SHALL NOT write to the database
