## ADDED Requirements

### Requirement: Daily disposal stock detection

The system SHALL query FinLab `disposal_information` dataset on each pipeline run to identify which stocks in the current ETF holdings snapshot are currently under disposal (分時交易) status as of `ctx.date_str`.

The system SHALL filter to only stocks where `分時交易` column is not NaN (non-batch disposal records only).

The system SHALL compare `ctx.date_str` against each stock's disposal start and end timestamps to determine active disposal status.

The system SHALL update `etf_holdings_snapshot` rows for `ctx.date_str` by setting `is_disposal = TRUE` for matched stock codes and `is_disposal = FALSE` for unmatched ones.

#### Scenario: Stock in active disposal period

- **WHEN** pipeline runs on a date that falls between a stock's disposal start and end time
- **AND** the stock appears in `etf_holdings_snapshot` for that date
- **THEN** the `is_disposal` field for that stock's snapshot row SHALL be set to `TRUE`

##### Example: Active disposal stock

- **GIVEN** stock `3529` has disposal period `2025-06-01` to `2025-06-10`
- **WHEN** pipeline runs on `2025-06-05` and `3529` is in ETF holdings
- **THEN** `etf_holdings_snapshot` row for `3529` on `2025-06-05` has `is_disposal = TRUE`

#### Scenario: Stock not in any disposal period

- **WHEN** pipeline runs and a held stock has no active disposal record
- **THEN** `is_disposal` for that stock's snapshot row SHALL be `FALSE`

#### Scenario: DisposalDetectStep failure does not interrupt pipeline

- **WHEN** FinLab `disposal_information` fetch fails or UPDATE query fails
- **THEN** the step SHALL log the error and continue without raising
- **AND** `is_disposal` values for that day SHALL remain at their default `FALSE`

### Requirement: Schema migration for is_disposal column

The system SHALL add an `is_disposal BOOLEAN NOT NULL DEFAULT FALSE` column to the `etf_holdings_snapshot` table via a Supabase SQL migration.

#### Scenario: Existing rows unaffected

- **WHEN** migration is applied to a database with existing snapshot rows
- **THEN** all existing rows SHALL have `is_disposal = FALSE`
- **AND** no existing queries or frontend reads SHALL break

### Requirement: Step ordering in pipeline orchestrator

The `DisposalDetectStep` SHALL be inserted into the pipeline after `SaveSnapshotStep` and before `WeightHistoryStep`.

#### Scenario: Step executes after snapshot is saved

- **WHEN** pipeline runs the step sequence
- **THEN** `DisposalDetectStep` SHALL execute only after `etf_holdings_snapshot` rows for the current date exist in the database
