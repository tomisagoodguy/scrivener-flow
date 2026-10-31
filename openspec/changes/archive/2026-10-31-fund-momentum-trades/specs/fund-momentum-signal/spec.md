## ADDED Requirements

### Requirement: Fund momentum holding periods

After writing the daily `fund_momentum` signals, `FundMomentumStep` SHALL compute a daily selection history for the most recent 300 trading days, where a stock is selected on a date when its consecutive positive fund-buy days (counted over non-missing values, as in the daily signal) are at least 3 and its 20-day rolling fund-buy sum ranks at or above the 90th percentile across all stocks on that date. The selection on the last date SHALL equal the daily `is_selected` written to `strategy_signals` for that date. The step SHALL pass this history as the positions of strategy `fund_momentum` to the same holding-period derivation, next-day-open pricing, upsert and prune used by `StrategyTradeStep`, so a selection run produces a holding period whose entry signal date is the first selected date and whose exit signal date is the first unselected date. A failure in this part SHALL be logged and SHALL NOT prevent the signals from being written or re-raise.

#### Scenario: Selection runs become holding periods

- **WHEN** stock 2330 is selected on 2026-10-13, 2026-10-14 and 2026-10-15 and unselected on 2026-10-16
- **THEN** `strategy_trades` receives a `fund_momentum` row for 2330 with entry signal date 2026-10-13 and exit signal date 2026-10-16

#### Scenario: Last row matches the daily signal

- **WHEN** the selection history and the daily signal are computed from the same fund-buy data
- **THEN** for every stock, the history's value on the last date equals that stock's daily `is_selected`

##### Example: consecutive days with missing values

| fund buy values (oldest → latest) | consecutive days on latest date |
| --------------------------------- | ------------------------------- |
| 100, 200, NaN, 300 | 3 |
| 100, -50, 200, 300 | 2 |
| 100, 200, 300, NaN | 3 |

#### Scenario: Trade derivation failure is isolated

- **WHEN** pricing the fund momentum holding periods raises an exception
- **THEN** the error is logged, the daily `fund_momentum` signals are still written, and the step does not re-raise
