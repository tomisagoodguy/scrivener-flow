## MODIFIED Requirements

### Requirement: Atomic price upsert with visible failure

`SQLStorage.upsert_stock_prices` SHALL write all records in a single transaction using multi-row upserts keyed on (stock_code, data_date). On conflict it SHALL update every price column only when at least one price column differs from the stored row (compared with `IS DISTINCT FROM`); a conflicting row whose price columns all equal the incoming values SHALL be left untouched. If any part fails, the transaction SHALL be rolled back and the error raised. `SyncOHLCVStep` SHALL catch that error, log it at error level including the message, and SHALL NOT raise, so the pipeline continues. The return value SHALL remain the number of records submitted for writing, not the number of rows actually changed.

#### Scenario: Write failure is logged and the pipeline continues

- **WHEN** the database rejects the upsert during `SyncOHLCVStep`
- **THEN** the step logs an error containing `OHLCV upsert failed` and the database message, returns normally, and no partial batch is committed

#### Scenario: Successful write reports the count

- **WHEN** 3 of 4 rows have a close price
- **THEN** `upsert_stock_prices` writes 3 rows in one commit and returns 3

#### Scenario: Unchanged prices are not rewritten

- **WHEN** `upsert_stock_prices` receives a row for (2330, 2026-11-20) whose open, high, low, close, volume, amount, margin_ratio, margin_pct_rank, it_buy and currency equal the stored row
- **THEN** the executed SQL contains `WHERE (stock_prices_daily.open, ` followed by the remaining price columns and `IS DISTINCT FROM`, and the stored row is not rewritten
