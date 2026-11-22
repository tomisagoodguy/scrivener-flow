## Purpose

Keep the ETF pipeline's recurring upserts from rewriting rows whose content has not changed, so that repeated daily and weekly re-fetches of the same data consume no database write IO.

## ADDED Requirements

### Requirement: Conflict update clause builder

The module `ETF/database/upsert_sql.py` SHALL provide a function `conflict_update_clause(table: str, columns: Sequence[str], touch: Sequence[str] = ()) -> str` that returns the text of a `DO UPDATE` clause for an `INSERT ... ON CONFLICT (...)` statement. The clause SHALL set every name in `columns` to `EXCLUDED.<name>`, SHALL set every name in `touch` to `NOW()`, and SHALL end with `WHERE (<table>.<c1>, ...) IS DISTINCT FROM (EXCLUDED.<c1>, ...)` listing exactly the names in `columns`, in the given order. Names in `touch` SHALL NOT appear in the WHERE comparison. The function SHALL raise `ValueError` when `columns` is empty, or when a name appears in both `columns` and `touch`.

#### Scenario: Clause with a touch column

- **WHEN** `conflict_update_clause("stock_broker_transactions", ["buy_amount", "sell_amount"], touch=["created_at"])` is called
- **THEN** it returns `DO UPDATE SET buy_amount = EXCLUDED.buy_amount, sell_amount = EXCLUDED.sell_amount, created_at = NOW() WHERE (stock_broker_transactions.buy_amount, stock_broker_transactions.sell_amount) IS DISTINCT FROM (EXCLUDED.buy_amount, EXCLUDED.sell_amount)`

#### Scenario: Empty column list is rejected

- **WHEN** `conflict_update_clause("t", [])` is called
- **THEN** it raises `ValueError`

#### Scenario: Overlapping touch column is rejected

- **WHEN** `conflict_update_clause("t", ["a", "updated_at"], touch=["updated_at"])` is called
- **THEN** it raises `ValueError`

### Requirement: Recurring upserts skip unchanged rows

Every in-scope recurring upsert SHALL build its `DO UPDATE` clause with `conflict_update_clause`, so that a conflicting row whose updated columns all equal the incoming values (NULL compared equal to NULL) is left untouched and produces no new row version. A conflicting row with at least one differing column SHALL be updated with all incoming values. Rows without a conflict SHALL be inserted as before. The in-scope writers are: `SQLStorage.upsert_stock_prices`, `SQLStorage.save_diff_logs`, `SQLStorage.upsert_revenue_data`, `SQLStorage.upsert_shareholder_data`, `SQLStorage.upsert_broker_transactions`, `SQLStorage.upsert_strategy_trades`, `SQLStorage.upsert_strategy_signals`; the sector, sector-stock and equity-distribution upserts in `SectorStrengthStep`; the futures, margin, institutional and institutional-signal upserts in `MarketChipsStep`; the snapshot upsert in `SyncBareKStep`; the position and PnL-series upserts in `PositionSummaryStep`; the flow and cross-buy-signal upserts in `FlowComputeStep`; the signal upsert in `SignalDetectStep`; the overlap upsert in `OverlapComputeStep`; the treemap upsert in `SyncTreemapStep`; the diff-log upsert in `MultiEtfStep`; and the upserts in `ETF/sync_equity_distribution.py`, `ETF/run_strategies.py` and `ETF/run_fund_momentum.py`.

#### Scenario: Re-fetching identical broker data writes nothing

- **WHEN** `upsert_broker_transactions` receives a record for (2330, 2026-11-20) whose buy_amount, sell_amount, net_volume and force_metric equal the stored row
- **THEN** the executed SQL contains `IS DISTINCT FROM` and the stored row, including its `created_at`, is unchanged

#### Scenario: Changed value is updated

- **WHEN** `upsert_broker_transactions` receives a record for (2330, 2026-11-20) whose net_volume differs from the stored row
- **THEN** the stored row takes all incoming values and `created_at` is set to the current time

##### Example: NULL handling

| Stored value | Incoming value | Row updated |
| ------------ | -------------- | ----------- |
| NULL | NULL | no |
| NULL | 5 | yes |
| 5 | NULL | yes |
| 5 | 5 | no |

### Requirement: Touch timestamps record content changes

For in-scope writers whose update previously set `created_at`, `updated_at` or `computed_at` to `NOW()` unconditionally, that column SHALL be passed as a `touch` column, so it is refreshed only when the row content changes. Its meaning SHALL be "time of the last content change", not "time of the last pipeline run".

#### Scenario: Unchanged sector stock keeps its timestamp

- **WHEN** `SectorStrengthStep` re-runs for 2026-11-20 and a `sector_strength_stocks` row's values are identical to the stored row
- **THEN** that row's `created_at` keeps its previous value

### Requirement: Consensus count update skips unchanged rows

`OverlapComputeStep._update_consensus_counts` SHALL update an `etf_stock_overlap` row's `consensus_buy_count`, `consensus_sell_count` and `updated_at` only when the newly computed buy or sell count differs from the stored value (compared with `IS DISTINCT FROM`). A row whose stored counts equal the computed counts SHALL be left untouched, including its `updated_at`.

#### Scenario: Unchanged consensus counts are not rewritten

- **WHEN** the step re-runs for 2026-11-20 and stock 2330's computed buy_count 3 and sell_count 0 equal the stored consensus_buy_count 3 and consensus_sell_count 0
- **THEN** the executed UPDATE contains `IS DISTINCT FROM (c.buy_count, c.sell_count)` and that row, including `updated_at`, is unchanged

### Requirement: Guard is covered by tests

`ETF/tests/test_upsert_sql.py` SHALL test `conflict_update_clause`, and for each in-scope writer a test SHALL capture the SQL it executes (by mocking the connection or `_bulk_upsert`) and assert that the SQL contains `IS DISTINCT FROM` and contains no `= NOW()` assignment before the `WHERE` keyword other than through a touch column produced by the builder.

#### Scenario: Writer SQL lacks the guard

- **WHEN** an in-scope writer's SQL is built without `conflict_update_clause`
- **THEN** the corresponding test fails because `IS DISTINCT FROM` is missing
