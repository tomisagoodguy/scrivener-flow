## Purpose

Bounds the storage used by `bare_k_snapshots`. Each row already carries about 240 trading days of chart data, so only the newest row per stock is retained.

## ADDED Requirements

### Requirement: Keep only the latest snapshot per stock

The daily database cleanup SHALL delete every `bare_k_snapshots` row for which a row with the same `stock_id` and a later `date` exists. The cleanup SHALL NOT delete the row with the latest `date` of any `stock_id`.

#### Scenario: Older snapshots are removed

- **WHEN** the cleanup runs and a stock has snapshots on several dates
- **THEN** only the row with the latest date remains for that stock

##### Example: mixed stocks

- **GIVEN** rows (2330, 2026-11-02), (2330, 2026-11-03), (2317, 2026-10-01)
- **WHEN** the cleanup runs
- **THEN** the remaining rows are (2330, 2026-11-03) and (2317, 2026-10-01)

#### Scenario: Stock no longer synced keeps its last snapshot

- **WHEN** the cleanup runs and a stock's only row is older than every other stock's latest row
- **THEN** that row remains

#### Scenario: Repeated cleanup changes nothing

- **WHEN** the cleanup runs on a table that already has one row per stock
- **THEN** zero rows are deleted

### Requirement: Snapshot cleanup failure does not stop the pipeline

A failure in the `bare_k_snapshots` cleanup SHALL be logged as an error, SHALL roll back the cleanup transaction, and SHALL NOT raise to the caller.

#### Scenario: Cleanup statement fails

- **WHEN** executing the cleanup raises a database exception
- **THEN** `cleanup_old_data` logs the error and returns without raising
