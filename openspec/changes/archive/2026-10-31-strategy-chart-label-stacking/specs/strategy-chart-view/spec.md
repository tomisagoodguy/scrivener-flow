## MODIFIED Requirements

### Requirement: Strategy holding marks on chart

The strategy chart view SHALL query `strategy_trades` for the stocks shown in the chart and, on each stock's K-line panel, SHALL draw a filled rounded label with white bold text "買" above the bar on every non-null `entry_date`, and a filled rounded label with white bold text "賣" below the bar on every non-null `exit_date`. The "買" label SHALL use a red fill (#e11d48) and the "賣" label a green fill (#059669), with text no smaller than 12 CSS pixels independent of the chart's axis font size. The "賣" label SHALL be offset far enough below the bar not to overlap the fan-breakout up-arrow drawn below the same bar. The chart SHALL NOT mark `entry_signal_date`. Fan-breakout markers (red up-arrows below the bar) SHALL keep rendering unchanged. Trades from all strategies of the stock SHALL be included, regardless of the strategy filter selected in the filter bar. A date SHALL be labeled only when the snapshot's `ohlcv` contains a drawn bar (non-null open and close) on that date; the same label text SHALL appear at most once per date. No label SHALL overlap any candlestick body or wick: a "買" label SHALL sit above the highest high, and a "賣" label below the lowest low, of every bar horizontally covered by the label. When strategy trades are present, the K-line panel's price scale SHALL reserve enough top and bottom margin that labels at the chart's extreme highs and lows stay inside the panel. Labels SHALL NOT overlap each other: when a label's rectangle would intersect an already placed label on the same side ("買" above, "賣" below), it SHALL be moved one label height plus 2 CSS px further away from the bars (up for "買", down for "賣"), repeating until it no longer intersects; labels SHALL be placed in ascending time order.

#### Scenario: Entry and exit dates are labeled

- **WHEN** stock 2330 has a trade with `entry_signal_date` 2026-09-30, `entry_date` 2026-10-01 and `exit_date` 2026-10-15, and all three dates are bars in the snapshot
- **THEN** the K-line panel shows a red "買" label above the 2026-10-01 bar, a green "賣" label below the 2026-10-15 bar, and no label on 2026-09-30

#### Scenario: Open position has no sell label

- **WHEN** a trade has `entry_date` 2026-10-13 and null `exit_date`
- **THEN** only the "買" label is drawn for that trade

#### Scenario: Dates outside the snapshot are skipped

- **WHEN** a trade's `entry_date` is earlier than the first bar in the snapshot
- **THEN** no "買" label is drawn for that trade and the chart renders without error

#### Scenario: Fan-breakout markers coexist

- **WHEN** a stock has both fan-breakout signal dates and strategy trades
- **THEN** the fan-breakout red up-arrows below the bar and the "買"/"賣" labels are all shown, and a "賣" label on the same date as a fan-breakout arrow does not cover the arrow

#### Scenario: Trade query fails

- **WHEN** the `strategy_trades` query fails
- **THEN** the chart view still renders every stock's chart without "買"/"賣" labels and without holding background, and the error is logged on the server

#### Scenario: Label clears neighbouring taller candles

- **WHEN** a "買" label is drawn on a bar whose high is 100, and a neighbouring bar covered by the label's width has a high of 110
- **THEN** the label's bottom edge is placed above the 110 high, not above the 100 high

##### Example: anchor selection

| label | label x | bars (x, high y, low y) in px | half width | anchor y |
| ----- | ------- | ----------------------------- | ---------- | -------- |
| 買 | 100 | (96, 50, 80), (100, 60, 90), (104, 40, 70), (130, 10, 20) | 12 | 40 |
| 賣 | 100 | (96, 50, 80), (100, 60, 90), (104, 40, 95), (130, 10, 120) | 12 | 95 |

#### Scenario: Adjacent buy labels are stacked

- **WHEN** stock 1815 has "買" labels on 2026-10-08 and 2026-10-13 whose x positions are 8 px apart and whose anchors give the same top position
- **THEN** the 2026-10-08 label stays at its anchor position and the 2026-10-13 label is drawn 18 px higher, and the two labels do not overlap

##### Example: stacking tops (label width 20 px, height 16 px, gap 2 px)

| label | x | initial top | placed tops before it | final top |
| ----- | - | ----------- | --------------------- | --------- |
| 買 | 100 | 50 | (none) | 50 |
| 買 | 108 | 50 | (100, 50) | 32 |
| 買 | 112 | 52 | (100, 50), (108, 32) | 16 |
| 買 | 140 | 50 | (100, 50), (108, 32), (112, 16) | 50 |
| 賣 | 104 | 80 | (100, 78) | 98 |
