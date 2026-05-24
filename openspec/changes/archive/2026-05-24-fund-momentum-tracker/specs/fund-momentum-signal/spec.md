## ADDED Requirements

### Requirement: Daily fund momentum signal computation

`FundMomentumStep` SHALL compute multi-dimensional investment trust (投信) net-buy metrics for all stocks daily and persist the results to `strategy_signals` with `strategy_id = 'fund_momentum'`.

Metrics computed per stock per day:
- `fund_1d`: net-buy shares on the current day
- `fund_5d`: rolling 5-day cumulative net-buy shares
- `fund_20d`: rolling 20-day cumulative net-buy shares
- `consec_days`: count of consecutive days with positive net-buy ending today
- `fund_ratio_5d`: `fund_5d / volume_5d` (ratio of net-buy to total traded volume over 5 days)
- `score`: market-wide percentile rank of `fund_20d` mapped to 0–100 (higher = stronger relative buying)
- `is_selected`: `True` when `consec_days >= 3` AND `score >= 90`

#### Scenario: Normal trading day computation

- **WHEN** `FundMomentumStep.run()` is called with a valid pipeline context
- **THEN** the step SHALL fetch `institutional_investors_trading_summary:投信買賣超股數` and `price:成交股數` via FinLab
- **THEN** the step SHALL compute all six metrics for every stock with available data
- **THEN** the step SHALL upsert rows into `strategy_signals` with `(strategy_id, stock_id, date)` as the conflict key

##### Example: score and is_selected assignment

| fund_20d rank (pct) | consec_days | score | is_selected |
|---------------------|-------------|-------|-------------|
| 0.98 | 5 | 98 | True |
| 0.92 | 2 | 92 | False |
| 0.85 | 10 | 85 | False |
| 0.50 | 0 | 50 | False |

#### Scenario: Step failure isolation

- **WHEN** `FundMomentumStep` raises an exception during computation
- **THEN** the exception SHALL be caught and logged
- **THEN** the pipeline SHALL continue to the next step without re-raising
- **THEN** a LINE error notification SHALL NOT be sent for auxiliary step failures

#### Scenario: Accumulation confirmation LINE notification

- **WHEN** computation produces stocks with `is_selected = True` that were NOT `is_selected` on the previous day
- **THEN** the step SHALL send a LINE push message listing the newly confirmed stocks
- **THEN** `etf_notification_log` SHALL be upserted with key `(date, 'fund_momentum', stock_id)` to prevent duplicate notifications on the same day

### Requirement: metadata storage in strategy_signals

`FundMomentumStep` SHALL store per-stock metric detail in the `metadata` JSONB column of `strategy_signals`.

The `metadata` object SHALL contain keys: `fund_1d`, `fund_5d`, `fund_20d`, `consec_days`, `fund_ratio_5d`.

#### Scenario: metadata written correctly

- **WHEN** a stock has `fund_20d = 500000`, `consec_days = 7`, `fund_ratio_5d = 0.032`
- **THEN** `strategy_signals.metadata` SHALL equal `{"fund_1d": ..., "fund_5d": ..., "fund_20d": 500000, "consec_days": 7, "fund_ratio_5d": 0.032}`

### Requirement: Step placement in pipeline orchestrator

`FundMomentumStep` SHALL be registered in `PipelineOrchestrator` after `SyncOHLCVStep` (which provides volume data) and before `NotifyStep`.

#### Scenario: Execution order preserved

- **WHEN** the daily pipeline runs
- **THEN** `FundMomentumStep` SHALL execute after `SyncOHLCVStep` has completed
- **THEN** `FundMomentumStep` SHALL execute before `NotifyStep`
