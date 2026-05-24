## ADDED Requirements

### Requirement: SyncBareKStep includes strategy stocks

`SyncBareKStep` SHALL, after fetching `watch_list` stocks, additionally query `strategy_signals` for the most recent date's `is_selected = true` stock codes, and merge them (de-duplicated) into the sync batch. `watch_list` stocks SHALL be placed before strategy stocks so that, when truncated to `MAX_STOCKS`, watch_list entries are prioritized.

#### Scenario: Strategy stocks merged into BareK sync

- **WHEN** `strategy_signals` contains selected stocks for the latest date
- **THEN** those stock codes SHALL be appended after watch_list stocks and synced to `bare_k_snapshots` within the same `BareKService` session

#### Scenario: MAX_STOCKS limit exceeded

- **WHEN** total of watch_list + strategy stocks exceeds `MAX_STOCKS` (50)
- **THEN** the list SHALL be truncated to the first 50 entries, preserving all watch_list stocks and as many strategy stocks as fit

#### Scenario: No strategy_signals data for latest date

- **WHEN** `strategy_signals` table has no rows for the most recent date
- **THEN** `SyncBareKStep` SHALL proceed with watch_list stocks only, logging a warning

#### Scenario: strategy_signals query failure

- **WHEN** the `strategy_signals` query raises an exception
- **THEN** `SyncBareKStep` SHALL log the error and proceed with watch_list stocks only, without raising (step remains non-blocking for this secondary query)

##### Example: stock list merge and truncation

| watch_list count | strategy_signals count | merged total | after truncation |
| ---------------- | ---------------------- | ------------ | ---------------- |
| 20               | 10                     | 30 (unique)  | 30 (no truncation) |
| 40               | 20                     | 55 (unique)  | 50 (5 strategy stocks dropped) |
| 50               | 15                     | 60 (unique)  | 50 (all 15 strategy stocks dropped) |
