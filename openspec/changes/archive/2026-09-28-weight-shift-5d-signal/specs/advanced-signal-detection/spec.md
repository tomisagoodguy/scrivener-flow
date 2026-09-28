## ADDED Requirements

### Requirement: weight_shift_5d 訊號偵測

`SignalDetectStep` SHALL implement a fourth signal type `weight_shift_5d` that detects a stock's cumulative holding-weight change over the trailing 5 trading days within a single ETF, scoped to `00981A` and `00991A` only.

The system SHALL source both the current and historical weight from `etf_holdings_snapshot` (not `etf_diff_logs`), because `etf_diff_logs` only contains a row for a stock on days its position actually changed, while `etf_holdings_snapshot` is written unconditionally for every held stock on every trading day the pipeline runs — it is the only reliable source for "the weight exactly N trading days ago" regardless of whether that stock changed on intervening days.

For each `etf_code` in `('00981A', '00991A')`, the system SHALL determine the 6 most recent distinct `data_date` values present in `etf_holdings_snapshot` for that `etf_code` (today = index 0, five trading days ago = index 5). For each `stock_code` present in both the index-0 and index-5 snapshots, the system SHALL compute `delta = weight[index=0] - weight[index=5]`.

- WHEN `abs(delta) < 1.0` (pp), the system SHALL NOT emit a signal for that pair.
- WHEN `1.0 <= abs(delta) < 3.0` (pp), the system SHALL emit a signal with `strength = 1`.
- WHEN `abs(delta) >= 3.0` (pp), the system SHALL emit a signal with `strength = 2`.

The emitted signal SHALL be written with `signal_type = 'weight_shift_5d'`, `etf_codes = [etf_code]`, and `metadata` SHALL include `stock_name`, `weight_5d_ago`, `weight_now`, and `delta_pp` (signed, positive = 加碼 direction).

WHEN `etf_holdings_snapshot` has fewer than 6 distinct `data_date` values for that `etf_code`, or a `stock_code` present in the index-0 snapshot is absent from the index-5 snapshot (or vice versa), the system SHALL skip that pair without emitting a signal and without raising an exception.

This requirement reuses the existing `etf_signals` table schema defined by the `etf_signals 資料表` requirement; no new columns or migrations are introduced.

#### Scenario: Mid-term accumulation signal at exactly 1pp

- **WHEN** a stock's `curr_weight` in `00981A` rose from 4.0% five trading days ago to 5.0% today
- **THEN** the system emits a `weight_shift_5d` signal with `strength = 1` and `metadata.delta_pp = 1.0`

#### Scenario: Strong short-term signal at or above 3pp

- **WHEN** a stock's `curr_weight` in `00991A` fell from 8.5% five trading days ago to 5.0% today
- **THEN** the system emits a `weight_shift_5d` signal with `strength = 2` and `metadata.delta_pp = -3.5`

#### Scenario: Change below threshold produces no signal

- **WHEN** a stock's `curr_weight` changed by 0.6pp over the trailing 5 trading days
- **THEN** the system does not emit a `weight_shift_5d` signal for that stock

#### Scenario: Insufficient history is skipped silently

- **WHEN** `etf_holdings_snapshot` has fewer than 6 distinct `data_date` values for an `etf_code`, or a stock present today is absent from the 5-trading-days-ago snapshot
- **THEN** the system skips that pair and does not raise an exception

##### Example: Threshold boundaries

| weight 5d ago | weight now | delta_pp | strength |
| --- | --- | --- | --- |
| 4.0 | 4.5 | 0.5 | (no signal) |
| 4.0 | 5.0 | 1.0 | 1 |
| 4.0 | 6.9 | 2.9 | 1 |
| 4.0 | 7.0 | 3.0 | 2 |
| 8.5 | 5.0 | -3.5 | 2 |

### Requirement: Frontend weight_shift_5d 顯示

The `SignalBadge` component SHALL recognize `weight_shift_5d` as a valid `type` value and SHALL render a distinct Traditional Chinese label for it, consistent with the existing `TYPE_LABELS` mapping pattern used for `multi_fund_consensus`, `single_fund_overweight`, and `cross_product_accumulation`.

#### Scenario: Badge renders label for weight_shift_5d

- **WHEN** `SignalBadge` receives `type="weight_shift_5d"` and `strength={1}`
- **THEN** the badge SHALL display a label distinct from the other three existing signal type labels, using the existing strength-based color styles
