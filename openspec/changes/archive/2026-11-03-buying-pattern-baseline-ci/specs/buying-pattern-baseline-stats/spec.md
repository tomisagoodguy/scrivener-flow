## Purpose

Compare each ETF buying pattern's forward returns against an ordinary-day baseline drawn from the same stocks over the same period, with week-block bootstrap confidence intervals, so the buying-patterns page can show whether a pattern is genuinely better, worse, or indistinguishable from picking any day.

## ADDED Requirements

### Requirement: Ordinary-day baseline forward returns

The system SHALL build a baseline sample consisting of every trading day with a close price in `stock_prices_daily`, for every `stock_code` that appears in `etf_buying_patterns`, between the earliest and latest `event_date`. Each baseline start day SHALL get forward returns for all ten horizons (1, 2, 3, 5, 7, 10, 15, 20, 25, 30 calendar days) using the same `forward_return` function that fills event returns, including the rule that a target day without a price scans forward at most 2 calendar days. Baseline start days SHALL NOT exclude days that are also event days.

#### Scenario: Baseline uses the event return definition

- **WHEN** stock 2330 has closes on 2026-07-03 (Friday, 100.0) and 2026-07-06 (Monday, 104.0) and none on 2026-07-04 or 2026-07-05
- **THEN** the baseline 1-day return for start day 2026-07-03 is 0.04, identical to what an event on 2026-07-03 would store under key `"1"`

#### Scenario: Missing target price is skipped

- **WHEN** a baseline start day's target day and the following 2 calendar days all lack a close price
- **THEN** that start day contributes no sample at that horizon and no value is estimated

### Requirement: Week-block bootstrap excess intervals

For each pattern and horizon, the system SHALL compute the excess win rate and excess mean return (pattern statistic minus baseline statistic) and their 95% intervals by resampling ISO calendar weeks with replacement 5,000 times. Each replicate SHALL apply the same sampled weeks to both the pattern events and the baseline samples. The random generator SHALL use a fixed seed so identical inputs produce identical intervals. A replicate in which the pattern has zero events SHALL be ignored when taking the 2.5th and 97.5th percentiles. When a pattern has fewer than 30 events or covers fewer than 8 distinct weeks at a horizon, the four interval values SHALL be null.

#### Scenario: Reproducible intervals

- **WHEN** the bootstrap runs twice on the same event and baseline samples
- **THEN** both runs return identical interval bounds

#### Scenario: Clearly better pattern

- **WHEN** a pattern has 200 events spread over 20 weeks, every event return is +0.05, and every baseline return in those weeks is 0.00
- **THEN** the excess mean-return interval lower bound is greater than 0

#### Scenario: Insufficient sample

- **WHEN** a pattern has 11 events at the 20-day horizon
- **THEN** `excess_win_lo`, `excess_win_hi`, `excess_ret_lo`, and `excess_ret_hi` are null for that pattern and horizon

### Requirement: Daily stats table refresh

After filling forward returns, `BuyingPatternStep` SHALL recompute all pattern and horizon statistics and replace the contents of `etf_buying_pattern_stats` within a single transaction. Each row SHALL hold `pattern_type`, `horizon`, `n`, `n_weeks`, `win_rate`, `avg_return`, `baseline_n`, `baseline_win_rate`, `baseline_avg_return`, the four excess interval bounds, `period_start`, `period_end`, and `computed_at`, with rates and returns stored as decimals. If computation or writing fails, the step SHALL log the error, SHALL NOT raise, and the previous table contents SHALL remain.

#### Scenario: Successful refresh

- **WHEN** the pipeline runs and events exist for 6 patterns with returns at all 10 horizons
- **THEN** `etf_buying_pattern_stats` contains 60 rows with today's `computed_at`, and no rows from the previous run remain

#### Scenario: Computation failure keeps previous stats

- **WHEN** the price query for the baseline raises an exception
- **THEN** the step logs an error, the pipeline continues to the next step, and `etf_buying_pattern_stats` still holds the previous run's rows

### Requirement: Stats read with verdict

`getBuyingPatternStats` SHALL read `etf_buying_pattern_stats` instead of aggregating raw events, and SHALL return per pattern the existing `avgReturns` and `winRates` maps plus a `byHorizon` map containing sample size, pattern and baseline win rate and mean return, both excess intervals, and a verdict. The verdict SHALL be `insufficient` when the excess mean-return interval is null, `better` when its lower bound is above 0, `worse` when its upper bound is below 0, and `indistinguishable` otherwise. A query error SHALL be thrown inside the cache function and converted to an empty result outside it, so that a failure is not cached.

#### Scenario: Verdict classification

- **WHEN** excess mean-return intervals are (0.01, 0.05), (-0.04, -0.002), (-0.01, 0.03), and null
- **THEN** the verdicts are `better`, `worse`, `indistinguishable`, and `insufficient` respectively

#### Scenario: Query failure is not cached

- **WHEN** the Supabase query returns an error
- **THEN** the page receives an empty list and the next request queries the database again

### Requirement: Baseline comparison table on buying-patterns page

The `/investment/buying-patterns` page SHALL show, below the existing charts, a comparison table listing for each pattern the 5-, 10-, and 20-day horizons with sample size, win rate versus baseline win rate, excess win-rate interval, mean return versus baseline mean return, excess mean-return interval, and a verdict badge. Badge colors SHALL follow the Taiwan market convention: `better` uses rose, `worse` uses emerald, and `indistinguishable` and `insufficient` use gray. A note under the table SHALL state the baseline definition, the week-block bootstrap, the sample period from `period_start` to `period_end`, and that an interval crossing zero means the pattern cannot be distinguished from an ordinary day.

#### Scenario: Table renders verdicts

- **WHEN** stats contain `window_break` at horizon 20 with verdict `better` and `sustained_buy` at horizon 20 with verdict `insufficient`
- **THEN** the `window_break` 20-day row shows a rose badge reading 較好 and the `sustained_buy` 20-day row shows a gray badge reading 樣本不足

#### Scenario: No stats yet

- **WHEN** `etf_buying_pattern_stats` is empty
- **THEN** the comparison table area shows a message that statistics have not been computed yet, and the existing charts still render
