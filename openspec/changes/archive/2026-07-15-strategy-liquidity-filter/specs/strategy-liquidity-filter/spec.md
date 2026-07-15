## ADDED Requirements

### Requirement: Liquidity enrichment on strategy signals

`StrategySignalStep` SHALL compute, for every selected signal row, the 20-trading-day rolling mean of daily turnover (FinLab `price:成交金額` via the shared `StrategyDataCache.amt`) and write it as `avg_turnover`, together with `liquidity_flag = (avg_turnover < LIQUIDITY_TURNOVER_THRESHOLD)`. The threshold SHALL be a module-level constant `LIQUIDITY_TURNOVER_THRESHOLD = 50_000_000` (NTD). The computation SHALL be implemented as a module-level pure function `compute_liquidity(amt, stock_ids, threshold)` that is testable with a synthetic DataFrame and no FinLab access.

#### Scenario: Turnover below threshold

- **WHEN** a selected stock's 20-day mean turnover is below the threshold
- **THEN** its signal row SHALL carry `liquidity_flag = true` and the computed `avg_turnover`

##### Example: below and above threshold

- **GIVEN** threshold 50,000,000; stock A with constant daily turnover 30,000,000 over 20+ days; stock B with constant daily turnover 200,000,000 over 20+ days
- **WHEN** `compute_liquidity` runs for stocks A and B
- **THEN** A yields `(30000000.0, True)` and B yields `(200000000.0, False)`

#### Scenario: Insufficient or missing turnover data

- **WHEN** a selected stock has fewer than 20 days of turnover history, or is absent from the turnover DataFrame
- **THEN** its row SHALL carry `avg_turnover = NULL` and `liquidity_flag = NULL` (unknown MUST NOT be recorded as true or false)

#### Scenario: Liquidity computation failure is non-fatal

- **WHEN** fetching or computing turnover raises any exception (including FinLab quota exhaustion)
- **THEN** the step SHALL log the error, write all signal rows with both liquidity fields as NULL, and complete signal persistence without raising

### Requirement: Signal persistence includes liquidity columns

`strategy_signals` SHALL gain nullable columns `avg_turnover NUMERIC` and `liquidity_flag BOOLEAN` via a SQL migration in `supabase/migrations/`. `upsert_strategy_signals` SHALL insert both columns and update them on conflict, and SHALL tolerate records missing these keys by defaulting to NULL.

#### Scenario: Upsert updates liquidity on re-run

- **WHEN** the pipeline re-runs for the same (strategy_id, date, stock_id) with new liquidity values
- **THEN** the existing row's `avg_turnover` and `liquidity_flag` SHALL be updated to the new values

#### Scenario: Legacy caller without liquidity keys

- **WHEN** `upsert_strategy_signals` receives records lacking `avg_turnover` / `liquidity_flag` keys
- **THEN** the rows SHALL be written with NULL in both columns and no exception SHALL be raised

### Requirement: Strategy page shows low-liquidity warning

`getStrategySignals` SHALL select and return `avg_turnover` and `liquidity_flag` per stock (types extended in `StrategyStock`), and its `unstable_cache` key SHALL be bumped to `strategy-signals-v3`. The `/investment/strategy` page SHALL render an amber warning badge on stocks whose `liquidity_flag` is true; rows with `liquidity_flag` NULL or false SHALL render unchanged. The badge color MUST use amber classes and MUST NOT use rose/emerald, which are reserved for the Taiwan up/down convention.

#### Scenario: Low-liquidity stock rendered with badge

- **WHEN** the strategy page renders a stock whose `liquidity_flag` is true
- **THEN** the row SHALL display an amber "低流動" badge alongside the stock, with the average daily turnover shown in 億-yuan formatting

#### Scenario: Unknown liquidity renders unchanged

- **WHEN** a stock's `liquidity_flag` is NULL (historical rows or missing data)
- **THEN** the row SHALL render exactly as before this change, with no badge or placeholder
