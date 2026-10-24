## MODIFIED Requirements

### Requirement: SyncBareKStep includes strategy stocks

`SyncBareKStep` SHALL, after fetching `watch_list` stocks, additionally query `strategy_signals` for the most recent date's `is_selected = true` stock codes, and merge them (de-duplicated) into the sync batch. `watch_list` stocks SHALL be placed before strategy stocks, and strategy stocks SHALL be placed before window-momentum stocks, so that, when truncated to `MAX_STOCKS` (200), watch_list entries are prioritized first and strategy entries second.

#### Scenario: Strategy stocks merged into BareK sync

- **WHEN** `strategy_signals` contains selected stocks for the latest date
- **THEN** those stock codes SHALL be appended after watch_list stocks and synced to `bare_k_snapshots` within the same `BareKService` session

#### Scenario: MAX_STOCKS limit exceeded

- **WHEN** total of watch_list + strategy + window-momentum stocks exceeds `MAX_STOCKS` (200)
- **THEN** the list SHALL be truncated to the first 200 entries, preserving watch_list stocks first, then strategy stocks, then as many window-momentum stocks as fit

#### Scenario: No strategy_signals data for latest date

- **WHEN** `strategy_signals` table has no rows for the most recent date
- **THEN** `SyncBareKStep` SHALL proceed with watch_list and window-momentum stocks only, logging a warning

## ADDED Requirements

### Requirement: SyncBareKStep includes window-momentum stocks

`SyncBareKStep` SHALL query `etf_diff_logs` for stocks that were net-accumulated by at least `MOMENTUM_MIN_ETF_COUNT` (2) ETFs over the last `MOMENTUM_WINDOW_DAYS` (5) trading days, and append them (de-duplicated) after strategy stocks. A (stock_code, etf_code) pair SHALL count as one accumulating ETF only when its `SUM(diff_shares)` within the window is greater than 0. Results SHALL be ordered by accumulating ETF count descending, then by summed net shares descending. These constants MUST match `DEFAULT_WINDOW` and `DEFAULT_MIN_COUNT` of the momentum page.

The window SHALL end at `ctx.date_str` (falling back to `date.today()` when empty) and SHALL start at the earliest of `ctx.date_str` and the 4 most recent `market_breadth_daily.date` values strictly earlier than `ctx.date_str`, because `SyncAdlStep` writes the current day's breadth row after `SyncBareKStep` runs. The start-date computation SHALL be the pure function `_momentum_window_start(prev_dates, today)`.

#### Scenario: Momentum stocks appended after strategy stocks

- **WHEN** watch_list is `['2330']`, strategy stocks are `['2330', '2454']`, and momentum stocks are `['2454', '3017']`
- **THEN** the sync batch SHALL be `['2330', '2454', '3017']`

#### Scenario: Net accumulation rule

- **WHEN** within the window stock 3017 has net diff_shares +5000 in 00981A, +2000 in 00980A, and -8000 in 00991A
- **THEN** 3017 SHALL count as accumulated by 2 ETFs and SHALL be included

##### Example: Window start computation

| today | prev_dates (descending) | Window start |
| ----- | ----------------------- | ------------ |
| 2026-10-23 | 2026-10-22, 2026-10-21, 2026-10-20, 2026-10-17 | 2026-10-17 |
| 2026-10-23 | 2026-10-22, 2026-10-21 | 2026-10-21 |
| 2026-10-23 | (none) | 2026-10-23 |

#### Scenario: Momentum query failure does not abort the step

- **WHEN** the momentum SQL query raises an exception
- **THEN** `SyncBareKStep` SHALL log an error, treat momentum stocks as an empty list, and continue syncing watch_list and strategy stocks without raising
