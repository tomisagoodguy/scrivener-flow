## MODIFIED Requirements

### Requirement: BuyingPatternStep auto-backfills incomplete future_returns

At the end of each `BuyingPatternStep.run()` execution, the step SHALL read `etf_buying_patterns` records from the past 35 days and select every record that has at least one due horizon missing, where a horizon h (1, 2, 3, 5, 7, 10, 15, 20, 25, 30 calendar days) is due when `event_date + h <= today`. The step SHALL process all selected records without truncating the selection to a fixed batch size. For each record, the step SHALL fill missing values using the shared `forward_return` function: the target day is `event_date + h`, and when it lacks a close price in `stock_prices_daily` the next 2 calendar days are tried. Updates SHALL be written in batches of at most 1000 records per database round trip, using the incremental merge pattern `future_returns = COALESCE(future_returns, '{}') || :new_data`. Horizons with insufficient price data SHALL be skipped without error.

#### Scenario: Old events are not starved by new events

- **WHEN** the 35-day window holds 1,500 events and the 300 oldest events lack their 20-day return while their prices exist
- **THEN** all 300 oldest events receive key `"20"` in the same run

#### Scenario: All returns already populated

- **WHEN** a record has values for every due horizon
- **THEN** the record is not selected and no UPDATE is issued for it

#### Scenario: Target day falls on a weekend

- **WHEN** an event on Friday 2026-07-03 needs horizon 1 and the next close is Monday 2026-07-06
- **THEN** key `"1"` is filled from the Monday close

#### Scenario: SyncOHLCVStep failed the prior day

- **WHEN** `stock_prices_daily` has no entry for a required date or the following 2 days due to a prior step failure
- **THEN** the backfill skips that horizon key without error, to be retried on the next pipeline run while the event is inside the window

### Requirement: Standalone backfill script exists

A standalone script at `ETF/pipeline/steps/backfill_future_returns.py` SHALL implement a full-history backfill of `etf_buying_patterns.future_returns` for all ten horizons using the same shared `forward_return` function as `BuyingPatternStep`. It SHALL page through the whole table by ascending `id` (at most 1000 records per page) until no records remain, select records with at least one due horizon missing, query `stock_prices_daily` for the stocks on that page, and apply incremental merges in batches. The script SHALL be safe to run multiple times (idempotent).

#### Scenario: Manual disaster recovery run

- **WHEN** the script is executed via `uv run python ETF/pipeline/steps/backfill_future_returns.py`
- **THEN** it processes every historical record with missing due horizons across all pages, prints a summary of updated records, and exits with code 0

#### Scenario: More than one page of incomplete records

- **WHEN** 2,500 records lack due horizons and their prices exist
- **THEN** a single run updates all 2,500 records

#### Scenario: No records need backfill

- **WHEN** all `etf_buying_patterns` records have values for every due horizon that has price data
- **THEN** the script prints "No records need backfill" and exits with code 0
