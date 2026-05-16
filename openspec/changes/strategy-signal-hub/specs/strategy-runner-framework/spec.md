## ADDED Requirements

### Requirement: BaseStrategy interface

Every quantitative strategy SHALL implement the `BaseStrategy` abstract class located in `ETF/strategies/base_strategy.py`. The class SHALL expose:
- `strategy_id: str` — unique kebab-case identifier (e.g., `super8888`)
- `description: str` — human-readable name shown in the frontend
- `get_positions() -> FinlabDataFrame` — returns a Boolean/numeric DataFrame with DatetimeIndex and stock_id columns

The framework SHALL call `get_positions()` and extract the last row as today's signal.

#### Scenario: Strategy registered and called

- **WHEN** `StrategySignalStep` runs and a strategy class is registered in `ETF/strategies/__init__.py`
- **THEN** the framework calls `get_positions()`, extracts the last date row, and converts it to a list of `(stock_id, score, is_selected)` tuples

#### Scenario: Strategy raises an exception

- **WHEN** `get_positions()` raises any exception
- **THEN** the framework logs the error with the strategy_id and continues to the next strategy — it SHALL NOT re-raise the exception

### Requirement: strategy_signals table stores daily signals

The Supabase table `strategy_signals` SHALL exist with columns: `id` (BIGSERIAL PK), `strategy_id` (TEXT), `date` (DATE), `stock_id` (TEXT), `score` (FLOAT nullable), `is_selected` (BOOLEAN), `conditions` (JSONB nullable), `created_at` (TIMESTAMPTZ). The pair `(strategy_id, date, stock_id)` SHALL be UNIQUE.

On each pipeline run, the step SHALL upsert all selected stocks (is_selected=true) for the current date. Stocks not in the latest position are not written (no false rows for every stock in the universe).

#### Scenario: Daily upsert on repeated pipeline run

- **WHEN** the pipeline runs twice on the same date
- **THEN** the second run upserts the same rows (ON CONFLICT DO UPDATE), resulting in no duplicate rows

##### Example: upsert idempotency

- **GIVEN** a prior run wrote `(super8888, 2026-05-16, 2330, is_selected=true)`
- **WHEN** the pipeline runs again on 2026-05-16 with the same position
- **THEN** the row is updated in place; row count stays the same

### Requirement: StrategySignalStep is an auxiliary pipeline step

`StrategySignalStep` SHALL be added to `ETF/pipeline/orchestrator.py` as an auxiliary step (after `SaveSnapshotStep`, before `NotifyStep`). Failure SHALL NOT raise an exception that propagates to the orchestrator — it SHALL log the error and return normally.

#### Scenario: FinLab API unavailable

- **WHEN** FinLab raises a quota or network error during `get_positions()` execution
- **THEN** the step logs the error and returns without raising, allowing `NotifyStep` to execute

### Requirement: Strategy auto-discovery via registry

All active strategies SHALL be listed in `ETF/strategies/__init__.py` as a list `ALL_STRATEGIES: list[BaseStrategy]`. Adding a new strategy requires only appending an instance to this list — no changes to `StrategySignalStep` or the orchestrator.

#### Scenario: New strategy added

- **WHEN** a developer appends `MyNewStrategy()` to `ALL_STRATEGIES`
- **THEN** the next pipeline run automatically picks up and executes the new strategy with no other code changes
