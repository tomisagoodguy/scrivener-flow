## Purpose

Defines how ETF holdings history is stored: `etf_holdings_snapshot` is the single, permanently retained source of per-day ETF holdings, and `etf_weight_history` is a read-only view derived from it. This keeps holdings history that cannot be re-scraped while staying within the database size budget.

## ADDED Requirements

### Requirement: ETF holdings snapshot is retained permanently

The scheduled cleanup (`SQLStorage.cleanup_old_data`) SHALL NOT delete any row from `etf_holdings_snapshot`, regardless of the row's `data_date`. The retention of every other table handled by the cleanup SHALL remain unchanged.

#### Scenario: Old snapshot rows survive cleanup

- **WHEN** `cleanup_old_data` runs
- **THEN** no statement it executes deletes from `etf_holdings_snapshot`

##### Example: row older than the former 260-day window

- **GIVEN** `etf_holdings_snapshot` contains a row with `data_date` = 2026-03-02 and today is 2026-11-20
- **WHEN** `cleanup_old_data` runs
- **THEN** the row still exists afterwards

#### Scenario: Other retention rules unchanged

- **WHEN** `cleanup_old_data` runs
- **THEN** `stock_prices_daily` and `stock_broker_transactions` are still deleted after 260 days and `institutional_stock_daily` after 90 days

### Requirement: Stock attribute columns are cleared outside the latest two dates per ETF

The scheduled cleanup SHALL set the stock attribute columns of `etf_holdings_snapshot` (`price`, `currency`, `amount`, `margin_ratio`, `change_percent`, `volatility`, `market_cap`, `is_high_5d`, `is_high_20d`, `is_high_200d`, `monthly_revenue`, `revenue_yoy`, `revenue_mom`, `revenue_momentum_rank`, `is_disposal`) to NULL for every row whose `data_date` is not among the two most recent distinct `data_date` values of the same `etf_code`. The columns `etf_code`, `stock_code`, `stock_name`, `data_date`, `weight`, `shares`, and `updated_at` SHALL NOT be modified. Rows whose attribute columns are already all NULL SHALL NOT be updated again.

#### Scenario: Attributes cleared on older dates only

- **WHEN** `cleanup_old_data` runs
- **THEN** rows on the latest and second-latest `data_date` of each ETF keep their attribute values, and rows on older dates have all attribute columns NULL while `weight` and `shares` are unchanged

##### Example: three dates for one ETF

| etf_code | data_date | price before | price after | weight after |
| -------- | --------- | ------------ | ----------- | ------------ |
| 00981A | 2026-11-13 | 1050 | 1050 | 9.12 |
| 00981A | 2026-11-12 | 1040 | 1040 | 9.10 |
| 00981A | 2026-11-11 | 1035 | NULL | 9.05 |

#### Scenario: Latest dates are evaluated per ETF

- **WHEN** ETF A's latest dates are 2026-11-13 and 2026-11-12 and ETF B's latest dates are 2026-11-07 and 2026-11-06
- **THEN** ETF B's rows on 2026-11-07 and 2026-11-06 keep their attribute values

#### Scenario: Repeated cleanup touches no already-cleared rows

- **WHEN** `cleanup_old_data` runs twice with no new snapshot data in between
- **THEN** the second run updates zero rows of `etf_holdings_snapshot`

### Requirement: Weight history is derived from the snapshot

`etf_weight_history` SHALL be a database view over `etf_holdings_snapshot` exposing the columns `etf_code`, `stock_code`, `stock_name`, `data_date`, `weight`, `shares`, and `rank`, where `rank` is the 1-based position of the row within its `(etf_code, data_date)` ordered by `weight` descending and then `stock_code` ascending. The view SHALL be created with `security_invoker = true` so that the row level security of `etf_holdings_snapshot` applies to readers. Existing readers that select these columns from `etf_weight_history` SHALL keep working without code changes.

#### Scenario: Rank computed per ETF and date

- **WHEN** a reader selects from `etf_weight_history` filtered by `etf_code` and `stock_code`
- **THEN** each returned row's `rank` equals that stock's weight rank among all holdings of the same ETF on the same date

##### Example: tie on weight

- **GIVEN** on 2026-11-13 ETF 00981A holds 2330 (weight 9.0), 2317 (weight 5.0), 2454 (weight 5.0)
- **WHEN** selecting `rank` from `etf_weight_history` for that ETF and date
- **THEN** 2330 has rank 1, 2317 has rank 2, 2454 has rank 3

#### Scenario: View reflects snapshot history

- **WHEN** a snapshot row exists for a given `(etf_code, stock_code, data_date)`
- **THEN** `etf_weight_history` returns one row with the same `weight`, `shares`, and `stock_name`

### Requirement: Pipeline does not write weight history

The ETF pipeline SHALL NOT insert, update, or delete rows of `etf_weight_history`. Snapshot persistence through the existing snapshot save path SHALL be the only write that makes new weight history visible.

#### Scenario: Pipeline run without weight history writes

- **WHEN** the daily ETF pipeline runs end to end
- **THEN** no executed SQL statement or REST request targets `etf_weight_history`, and no pipeline step named `WeightHistoryStep` is registered

### Requirement: Snapshot lookups by stock code use an index

`etf_holdings_snapshot` SHALL have a btree index on `(stock_code, data_date)` so that queries filtered by `stock_code` do not require a sequential scan of the table.

#### Scenario: Stock detail lookup uses index

- **WHEN** `EXPLAIN` is run for `SELECT * FROM etf_holdings_snapshot WHERE stock_code = '2330' ORDER BY data_date DESC LIMIT 1`
- **THEN** the plan uses an index scan on the `(stock_code, data_date)` index rather than a sequential scan
