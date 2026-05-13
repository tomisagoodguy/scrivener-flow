## ADDED Requirements

### Requirement: BuyingPatternStep auto-backfills incomplete future_returns

At the end of each `BuyingPatternStep.run()` execution, the step SHALL query `etf_buying_patterns` for records from the past 30 days where `future_returns` contains null-valued keys for any standard horizon (1, 5, 10, 20 trading days). For each such record, the step SHALL attempt to fill the missing return values from `stock_prices_daily`, using the incremental merge pattern `future_returns = COALESCE(future_returns, '{}') || :new_data`. Records with insufficient price history SHALL be skipped without error.

#### Scenario: Prior day has missing 1-day return

- **WHEN** yesterday's buying pattern record has `future_returns = {"1": null, "5": 0.03, "10": null, "20": null}`
- **THEN** the step queries `stock_prices_daily` for day +1 close and fills `future_returns["1"]`; keys where price data exists are updated; keys still lacking price data remain null

#### Scenario: All returns already populated

- **WHEN** a record has all four horizon keys with non-null values
- **THEN** the record is skipped; no UPDATE is issued

#### Scenario: SyncOHLCVStep failed the prior day

- **WHEN** `stock_prices_daily` has no entry for a required date due to a prior step failure
- **THEN** the backfill skips that horizon key without error, to be retried on the next pipeline run

### Requirement: Standalone backfill script exists

A standalone script at `ETF/pipeline/steps/backfill_future_returns.py` SHALL implement a full-history backfill of `etf_buying_patterns.future_returns`. When executed, it SHALL scan all records where any horizon key is null, query `stock_prices_daily` for the required dates, and apply incremental merges. The script SHALL be safe to run multiple times (idempotent).

#### Scenario: Manual disaster recovery run

- **WHEN** the script is executed via `uv run python ETF/pipeline/steps/backfill_future_returns.py`
- **THEN** it processes all historical records with missing returns, prints a summary of updated records, and exits with code 0

#### Scenario: No records need backfill

- **WHEN** all `etf_buying_patterns` records have complete `future_returns`
- **THEN** the script prints "No records need backfill" and exits with code 0

### Requirement: Incremental merge preserves existing values

All backfill UPDATE statements SHALL use `COALESCE(future_returns, '{}') || :new_data` to merge only new keys, never overwriting existing non-null values.

#### Scenario: Partial overwrite is rejected

- **WHEN** a record already has `future_returns = {"1": 0.02}` and backfill computes `{"1": 0.03, "5": 0.07}`
- **THEN** the final stored value is `{"1": 0.02, "5": 0.07}` (existing key preserved, new key added)
