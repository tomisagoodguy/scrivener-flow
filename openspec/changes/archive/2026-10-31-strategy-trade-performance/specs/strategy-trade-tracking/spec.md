## Purpose

Persist each quantitative strategy's holding periods with entry/exit dates, entry/exit prices and price returns, derived from the full FinLab position history, so the strategy page can show how stocks perform after each rebalance.

## ADDED Requirements

### Requirement: Holding period derivation from position history

The pipeline SHALL derive holding periods for every active strategy from the full DataFrame returned by `get_positions()`. For each stock, a maximal run of consecutive rows whose value is truthy SHALL form one holding period: the first truthy row date is the entry signal date; the first falsy row date after the run is the exit signal date; a run that reaches the last row SHALL be an open holding period with no exit. Only holding periods whose exit signal date is within the last 365 calendar days, or that are still open, SHALL be kept, so a long holding that exits recently is retained. A strategy whose positions are empty or whose index cannot be parsed as dates SHALL be skipped with a warning.

#### Scenario: Run split into periods

- **WHEN** a stock's positions are True on 2026-06-10, False on 2026-07-10, True on 2026-08-10 and True on 2026-09-10 (the last row)
- **THEN** two holding periods are derived: one with entry signal date 2026-06-10 and exit signal date 2026-07-10, and one open period with entry signal date 2026-08-10

##### Example: Episode derivation

| Row dates (value)                                   | Expected periods (entry signal → exit signal) |
| --------------------------------------------------- | --------------------------------------------- |
| 06-10 T, 07-10 F, 08-10 T, 09-10 T                  | 06-10 → 07-10; 08-10 → open                   |
| 06-10 F, 07-10 F                                    | none                                          |
| 06-10 T, 07-10 T                                    | 06-10 → open                                  |

#### Scenario: Old closed period excluded

- **WHEN** a closed holding period has entry signal date 400 days and exit signal date 370 days before the run date
- **THEN** it is not kept

#### Scenario: Long holding exited recently is kept

- **WHEN** a holding period entered 425 days before the run date and exited 11 days before the run date
- **THEN** it is kept with both its entry and exit signal dates

### Requirement: Next-day open entry and exit pricing

The entry date SHALL be the first trading day after the entry signal date and the entry price SHALL be that day's raw opening price; the exit date and exit price SHALL follow the same rule from the exit signal date. Trading days SHALL be taken from the FinLab opening-price index. When no trading day exists after a signal date, the corresponding date and price SHALL be null (pending).

#### Scenario: Entry priced at next open

- **WHEN** the entry signal date is Friday 2026-10-09 and the next trading day is Monday 2026-10-12 with opening price 100
- **THEN** the entry date is 2026-10-12 and the entry price is 100

#### Scenario: Pending entry

- **WHEN** the entry signal date equals the latest trading day in the price data
- **THEN** entry date, entry price and holding return are null

### Requirement: Dividend-adjusted returns

Returns SHALL be computed with dividend-adjusted prices, where the adjusted open equals raw open × adjusted close ÷ raw close for the same stock and day. Holding return SHALL be exit adjusted open ÷ entry adjusted open − 1 for closed periods, and latest adjusted close ÷ entry adjusted open − 1 for open periods. Post-exit return SHALL be latest adjusted close ÷ exit adjusted open − 1 for closed periods and null for open periods. Returns SHALL be stored as decimal fractions. Raw entry price, raw exit price and the latest raw close with its date SHALL be stored for display. A missing required price SHALL make the dependent return null.

#### Scenario: Ex-dividend does not count as a loss

- **WHEN** a stock enters at raw open 100, pays a cash dividend of 5 during the holding, and the latest raw close is 95 with adjusted prices reflecting the dividend
- **THEN** the holding return is approximately 0 rather than −5%

##### Example: Return calculation

| Entry adj open | Exit adj open | Latest adj close | Holding return | Post-exit return |
| -------------- | ------------- | ---------------- | -------------- | ---------------- |
| 100            | 110           | 121              | 0.10           | 0.10             |
| 100            | (open)        | 90               | -0.10          | null             |

### Requirement: Idempotent daily persistence

A pipeline auxiliary step SHALL upsert the derived holding periods into `strategy_trades` keyed by `(strategy_id, stock_id, entry_signal_date)` on every run, refreshing exit fields, latest close and returns; for each strategy derived successfully it SHALL delete that strategy's rows inside the recompute window (no exit signal, or exit signal within 365 days) that were not derived in this run, and SHALL then delete rows whose exit date is more than 365 days before the run date. Re-running the step on the same day SHALL produce the same rows. Any exception in the step SHALL be logged without being raised so later pipeline steps still run. The step SHALL reuse the positions computed by the strategy signal step from the pipeline context instead of recomputing strategies.

#### Scenario: Re-run is idempotent

- **WHEN** the step runs twice on the same day with the same positions and prices
- **THEN** `strategy_trades` contains the same rows and values after the second run

#### Scenario: Step failure does not stop the pipeline

- **WHEN** the price fetch raises an exception inside the step
- **THEN** the error is logged and the pipeline continues to the next step

### Requirement: Public read access to strategy trades

The `strategy_trades` table SHALL have row level security enabled with a public SELECT policy, consistent with other investment tables, and SHALL be created only through a migration file under `supabase/migrations/`.

#### Scenario: Anonymous read

- **WHEN** an unauthenticated client selects from `strategy_trades`
- **THEN** rows are returned
