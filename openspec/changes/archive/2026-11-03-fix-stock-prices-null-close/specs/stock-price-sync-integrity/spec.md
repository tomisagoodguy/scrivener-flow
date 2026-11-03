## Purpose

Keep `stock_prices_daily` free of price rows without a close price, make write failures visible and atomic, and provide a repair path for rows that were written without prices.

## ADDED Requirements

### Requirement: Price rows require a close price

The OHLCV writer SHALL only write rows whose `close` value is present. Rows whose close is NaN SHALL be excluded before writing, so that a stock with no price on a date (not yet published, no trade, or delisted) produces no row and never overwrites an existing row with a NULL close. Positive or negative infinity in any numeric column SHALL be written as NULL. Missing `volume`, `margin_ratio`, and `it_buy` SHALL be written as 0, and a missing `margin_pct_rank` value or column SHALL be written as NULL.

#### Scenario: Margin-only row is not written

- **WHEN** the OHLCV frame contains stock 2330 on 2026-05-29 with `close` NaN and `margin_ratio` 0.43
- **THEN** no record for (2330, 2026-05-29) is produced for writing

#### Scenario: Infinite values become NULL

- **WHEN** a row has `close` 100.0 and `amount` positive infinity
- **THEN** the produced record has `close` 100.0 and `amount` NULL

##### Example: record defaults

| close | volume | margin_ratio | it_buy | margin_pct_rank | Expected record |
| ----- | ------ | ------------ | ------ | --------------- | --------------- |
| 50.0 | NaN | NaN | NaN | NaN | volume 0, margin_ratio 0, it_buy 0, margin_pct_rank NULL |
| 8.0 | 1000 | 25.0 | 3 | 2.0 | volume 1000, margin_ratio 25.0, it_buy 3, margin_pct_rank 2.0 |
| NaN | 1000 | 25.0 | 3 | 2.0 | no record |

### Requirement: Atomic price upsert with visible failure

`SQLStorage.upsert_stock_prices` SHALL write all records in a single transaction using multi-row upserts keyed on (stock_code, data_date), updating every price column on conflict. If any part fails, the transaction SHALL be rolled back and the error raised. `SyncOHLCVStep` SHALL catch that error, log it at error level including the message, and SHALL NOT raise, so the pipeline continues.

#### Scenario: Write failure is logged and the pipeline continues

- **WHEN** the database rejects the upsert during `SyncOHLCVStep`
- **THEN** the step logs an error containing `OHLCV upsert failed` and the database message, returns normally, and no partial batch is committed

#### Scenario: Successful write reports the count

- **WHEN** 3 of 4 rows have a close price
- **THEN** `upsert_stock_prices` writes 3 rows in one commit and returns 3

### Requirement: Repair script for missing close prices

A script at `ETF/scripts/repair_stock_prices.py` SHALL accept `--since YYYY-MM-DD` and `--dry-run`. It SHALL find stocks having rows with NULL close on or after the since date, fetch their OHLCV from FinLab covering that period, keep only rows on or after the since date that have a close price, and upsert them with `upsert_stock_prices`. It SHALL print the number of repaired rows and the number of rows still NULL in the period. With `--dry-run` it SHALL print the planned row count without writing.

#### Scenario: Dry run does not write

- **WHEN** the script runs with `--since 2026-04-01 --dry-run` and FinLab returns 1,200 priced rows for the affected stocks
- **THEN** it prints that 1,200 rows would be repaired and performs no database write

#### Scenario: Rows before the since date are not touched

- **WHEN** FinLab returns rows dated 2026-03-31 and 2026-04-01 for an affected stock
- **THEN** only the 2026-04-01 row is upserted
