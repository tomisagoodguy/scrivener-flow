## ADDED Requirements

### Requirement: Strategy holding marks on chart

The strategy chart view SHALL query `strategy_trades` for the stocks shown in the chart and, on each stock's K-line panel, SHALL mark every `entry_signal_date` with a text marker "選" and every non-null `entry_date` with a text marker "買", both positioned above the bar. These markers SHALL be visually distinct from the fan-breakout markers (red up-arrows below the bar), which SHALL keep rendering unchanged. Trades from all strategies of the stock SHALL be included, regardless of the strategy filter selected in the filter bar. A date SHALL be marked only when the snapshot's `ohlcv` contains a drawn bar (non-null open and close) on that date; the same marker text SHALL appear at most once per date.

#### Scenario: Signal and entry dates are marked

- **WHEN** stock 2330 has a trade with `entry_signal_date` 2026-09-30 and `entry_date` 2026-10-01, and both dates are bars in the snapshot
- **THEN** the K-line panel shows "選" above the 2026-09-30 bar and "買" above the 2026-10-01 bar

#### Scenario: Dates outside the snapshot are skipped

- **WHEN** a trade's `entry_signal_date` is earlier than the first bar in the snapshot
- **THEN** no "選" marker is drawn for that trade and the chart renders without error

#### Scenario: Fan-breakout markers coexist

- **WHEN** a stock has both fan-breakout signal dates and strategy trades
- **THEN** the fan-breakout red up-arrows below the bar and the "選"/"買" text markers above the bar are all shown

#### Scenario: Trade query fails

- **WHEN** the `strategy_trades` query fails
- **THEN** the chart view still renders every stock's chart without "選"/"買" markers and without holding background, and the error is logged on the server

### Requirement: Holding period background on chart

The strategy chart view SHALL draw a single light background color on the K-line panel for every bar whose date falls inside a holding period. A holding period SHALL start at `entry_date` and end at `exit_date` inclusive; when `exit_date` is null the period SHALL extend to the last bar of the snapshot. Trades with null `entry_date` SHALL NOT produce a holding period. Holding periods of all strategies for the same stock SHALL be merged as a union and drawn in one color, so overlapping periods are not drawn darker. The background SHALL NOT change the K-line panel's price scale.

#### Scenario: Open position extends to latest bar

- **WHEN** stock 2330 has a trade with `entry_date` 2026-10-01 and null `exit_date`, and the snapshot's last bar is 2026-10-30
- **THEN** every bar from 2026-10-01 through 2026-10-30 has the holding background

#### Scenario: Overlapping strategies merge into one color

- **WHEN** stock 2454 is held by strategy A from 2026-09-01 to 2026-09-20 and by strategy B from 2026-09-15 to 2026-10-05
- **THEN** every bar from 2026-09-01 through 2026-10-05 has the same holding background color, and bars from 2026-09-15 to 2026-09-20 are not drawn darker

##### Example: union of holding periods

| trades (entry → exit) | last bar | bars with background |
| --------------------- | -------- | -------------------- |
| 09-01 → 09-20, 09-15 → 10-05 | 10-30 | 09-01 … 10-05 |
| 09-01 → 09-10, 10-01 → null | 10-30 | 09-01 … 09-10, 10-01 … 10-30 |
| entry null → null | 10-30 | none |

#### Scenario: Stock without trades

- **WHEN** a stock in the chart view has no `strategy_trades` rows
- **THEN** its K-line panel has no holding background and no "選"/"買" markers
