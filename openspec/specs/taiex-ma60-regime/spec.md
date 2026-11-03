# taiex-ma60-regime Specification

## Purpose

Classify every close of the TAIEX below its 60-day moving average into first breaks, rebreaks while the average is rising, and breaks while the average is falling, persist the daily regime with historical forward-return statistics per class, and show it on the market breadth page. It exists so users judge a quarter-line break with the statistics of its own class instead of the first-break statistics.

## Requirements

### Requirement: MA60 break classification

The system SHALL compute, from the TAIEX daily close series starting 1999-01-01, the 60-trading-day simple moving average (`ma60`), the rising flag `ma_rising` (true when `ma60` is greater than `ma60` 20 trading days earlier), and `days_above` (consecutive trading days, including the current day, whose close is strictly greater than `ma60`). A trading day SHALL be a break when its close is not greater than `ma60` and the previous trading day's close was greater than the previous `ma60`. Each break SHALL be classified using `prev_days_above` (the previous day's `days_above`) as:

- `first_break` when `ma_rising` is true and `prev_days_above` is at least 40
- `rebreak_rising` when `ma_rising` is true and `prev_days_above` is less than 40
- `break_falling` when `ma_rising` is false

Days before `ma60` or the 20-day-earlier `ma60` exist SHALL NOT be classified as breaks.

#### Scenario: Break after a long run with a rising average

- **WHEN** the average is rising and the index closed above `ma60` for 45 consecutive days, then closes below `ma60`
- **THEN** that day is classified as `first_break`

#### Scenario: Break after a short run with a rising average

- **WHEN** the average is rising and the index closed above `ma60` for 36 consecutive days, then closes below `ma60`
- **THEN** that day is classified as `rebreak_rising`

#### Scenario: Break with a falling average

- **WHEN** `ma60` is not greater than its value 20 trading days earlier and the index crosses from above to below `ma60`
- **THEN** that day is classified as `break_falling` regardless of `prev_days_above`

##### Example: reconciliation with verified history

| Input | Expected Output | Notes |
| ----- | --------------- | ----- |
| FinLab TAIEX close 1999-01-01 to 2026-10-16 | 42 `first_break` events, first on 1999-05-31, last on 2026-07-17 | measured 2026-11-01 |
| same data | 91 `rebreak_rising` events | measured 2026-11-01 |
| same data | 133 events with `prev_days_above` below 40 (rebreak_rising plus break_falling with a short run) | measured 2026-11-01 |


<!-- @trace
source: taiex-ma60-regime
updated: 2026-11-03
code:
  - ETF/database/__pycache__/storage.cpython-313.pyc
  - src/app/investment/breadth/components/TaiexRegimeCard.tsx
  - supabase/migrations/20261101120100_add_taiex_ma60_regime_daily.sql
  - ETF/pipeline/orchestrator.py
  - src/lib/investment/taiexRegime.ts
  - src/app/investment/breadth/page.tsx
  - ETF/pipeline/steps/taiex_ma60_regime_step.py
  - src/app/actions/getTaiexRegime.ts
  - ETF/CLAUDE.md
tests:
  - src/app/actions/__tests__/getTaiexRegime.test.ts
  - src/app/investment/breadth/components/__tests__/TaiexRegimeCard.test.tsx
  - ETF/tests/fixtures/taiex_close_low_19990101_20261016.csv
  - ETF/tests/test_taiex_ma60_regime_step.py
  - src/lib/investment/__tests__/taiexRegime.test.ts
  - src/app/investment/breadth/__tests__/page.test.tsx
-->

---
### Requirement: Wave break count and next-day threshold

The system SHALL compute `wave_break_count` as the number of breaks of any class from the most recent `first_break` (inclusive) through the target date, and SHALL be null when no `first_break` exists on or before the target date. The system SHALL compute `next_break_threshold` as the sum of the latest 59 closes divided by 59, which is the close below which the next trading day becomes a break, and `next_break_type` as the class that a break on the next trading day would receive given the current `ma_rising` and `days_above`. Both `next_break_threshold` and `next_break_type` SHALL be null when the target date closes at or below `ma60`.

#### Scenario: Count breaks since the latest first break

- **WHEN** the latest `first_break` is 2026-07-17 and breaks occurred on 07-17, 07-24, 08-07, 08-19 and 08-24, and the target date 2026-10-16 is above `ma60` with `days_above` 36
- **THEN** `wave_break_count` is 5, `next_break_type` is `rebreak_rising`, and `next_break_threshold` rounds to 46077

#### Scenario: Target date already below the average

- **WHEN** the target date closes below `ma60`
- **THEN** `next_break_threshold` and `next_break_type` are null


<!-- @trace
source: taiex-ma60-regime
updated: 2026-11-03
code:
  - ETF/database/__pycache__/storage.cpython-313.pyc
  - src/app/investment/breadth/components/TaiexRegimeCard.tsx
  - supabase/migrations/20261101120100_add_taiex_ma60_regime_daily.sql
  - ETF/pipeline/orchestrator.py
  - src/lib/investment/taiexRegime.ts
  - src/app/investment/breadth/page.tsx
  - ETF/pipeline/steps/taiex_ma60_regime_step.py
  - src/app/actions/getTaiexRegime.ts
  - ETF/CLAUDE.md
tests:
  - src/app/actions/__tests__/getTaiexRegime.test.ts
  - src/app/investment/breadth/components/__tests__/TaiexRegimeCard.test.tsx
  - ETF/tests/fixtures/taiex_close_low_19990101_20261016.csv
  - ETF/tests/test_taiex_ma60_regime_step.py
  - src/lib/investment/__tests__/taiexRegime.test.ts
  - src/app/investment/breadth/__tests__/page.test.tsx
-->

---
### Requirement: Regime state

The system SHALL assign each target date one `state`: `above` when close is greater than `ma60`; otherwise `below_after_first_break`, `below_after_rebreak` or `below_ma_falling` according to the class of the break that started the current run below `ma60`.

#### Scenario: Second day below after a first break

- **WHEN** the index broke as `first_break` yesterday and closes below `ma60` again today
- **THEN** today's `state` is `below_after_first_break`


<!-- @trace
source: taiex-ma60-regime
updated: 2026-11-03
code:
  - ETF/database/__pycache__/storage.cpython-313.pyc
  - src/app/investment/breadth/components/TaiexRegimeCard.tsx
  - supabase/migrations/20261101120100_add_taiex_ma60_regime_daily.sql
  - ETF/pipeline/orchestrator.py
  - src/lib/investment/taiexRegime.ts
  - src/app/investment/breadth/page.tsx
  - ETF/pipeline/steps/taiex_ma60_regime_step.py
  - src/app/actions/getTaiexRegime.ts
  - ETF/CLAUDE.md
tests:
  - src/app/actions/__tests__/getTaiexRegime.test.ts
  - src/app/investment/breadth/components/__tests__/TaiexRegimeCard.test.tsx
  - ETF/tests/fixtures/taiex_close_low_19990101_20261016.csv
  - ETF/tests/test_taiex_ma60_regime_step.py
  - src/lib/investment/__tests__/taiexRegime.test.ts
  - src/app/investment/breadth/__tests__/page.test.tsx
-->

---
### Requirement: Historical class statistics

For each break class and for the baseline of all down days (close lower than previous close), the system SHALL compute statistics over events that have 20 subsequent trading days of data: `n`, `next_day_up_rate` (share of events whose next close is higher), `median_r20` and `mean_r20` (return from the event close to the close 20 trading days later), `up_rate_r20`, `back_above_within20` (count of events where any close in trading days 1 to 20 is above `ma60`; baseline excluded), `median_min_low20` (median of the minimum intraday low over trading days 1 to 20 divided by the event close, minus 1), `count_min_low_below_5pct`, `sample_start` and `sample_end`. Returns SHALL use index closes without dividends or costs. Intraday lows SHALL come from `taiex_total_index:最低指數`.

#### Scenario: First-break statistics match the verified study

- **WHEN** statistics are computed on FinLab data ending 2026-10-16
- **THEN** `first_break` has `n` 42, `next_day_up_rate` 0.548 (23 of 42), `median_r20` 0.0213, `mean_r20` 0.0300, `back_above_within20` 34, `median_min_low20` -0.0235 and `count_min_low_below_5pct` 13, each rounded to the shown precision

#### Scenario: Events without a full forward window

- **WHEN** a break occurred fewer than 20 trading days before the latest data date
- **THEN** it is excluded from every statistic and `sample_end` is earlier than that break


<!-- @trace
source: taiex-ma60-regime
updated: 2026-11-03
code:
  - ETF/database/__pycache__/storage.cpython-313.pyc
  - src/app/investment/breadth/components/TaiexRegimeCard.tsx
  - supabase/migrations/20261101120100_add_taiex_ma60_regime_daily.sql
  - ETF/pipeline/orchestrator.py
  - src/lib/investment/taiexRegime.ts
  - src/app/investment/breadth/page.tsx
  - ETF/pipeline/steps/taiex_ma60_regime_step.py
  - src/app/actions/getTaiexRegime.ts
  - ETF/CLAUDE.md
tests:
  - src/app/actions/__tests__/getTaiexRegime.test.ts
  - src/app/investment/breadth/components/__tests__/TaiexRegimeCard.test.tsx
  - ETF/tests/fixtures/taiex_close_low_19990101_20261016.csv
  - ETF/tests/test_taiex_ma60_regime_step.py
  - src/lib/investment/__tests__/taiexRegime.test.ts
  - src/app/investment/breadth/__tests__/page.test.tsx
-->

---
### Requirement: Daily regime persistence

The pipeline SHALL run the regime computation as an auxiliary step after `SyncAdlStep`, and SHALL upsert one row keyed by date into `taiex_ma60_regime_daily` for `ctx.date_str`, or for the latest available index date when the target date has no index data. A failure in fetching data, computing, or writing SHALL be logged as an error and SHALL NOT stop the pipeline. The step SHALL be skipped in dry-run mode. The table SHALL allow public read access.

#### Scenario: Normal daily run

- **WHEN** the pipeline runs for a trading day with TAIEX data available
- **THEN** exactly one row for that date exists in `taiex_ma60_regime_daily` containing close, ma60, ma_rising, days_above, break_type, state, wave_break_count, next_break_threshold, next_break_type and the per-class statistics

#### Scenario: FinLab fetch fails

- **WHEN** fetching `taiex_total_index:收盤指數` raises an error
- **THEN** the step logs an error, writes no row, and the next pipeline step runs


<!-- @trace
source: taiex-ma60-regime
updated: 2026-11-03
code:
  - ETF/database/__pycache__/storage.cpython-313.pyc
  - src/app/investment/breadth/components/TaiexRegimeCard.tsx
  - supabase/migrations/20261101120100_add_taiex_ma60_regime_daily.sql
  - ETF/pipeline/orchestrator.py
  - src/lib/investment/taiexRegime.ts
  - src/app/investment/breadth/page.tsx
  - ETF/pipeline/steps/taiex_ma60_regime_step.py
  - src/app/actions/getTaiexRegime.ts
  - ETF/CLAUDE.md
tests:
  - src/app/actions/__tests__/getTaiexRegime.test.ts
  - src/app/investment/breadth/components/__tests__/TaiexRegimeCard.test.tsx
  - ETF/tests/fixtures/taiex_close_low_19990101_20261016.csv
  - ETF/tests/test_taiex_ma60_regime_step.py
  - src/lib/investment/__tests__/taiexRegime.test.ts
  - src/app/investment/breadth/__tests__/page.test.tsx
-->

---
### Requirement: Regime card on the breadth page

The `/investment/breadth` page SHALL show a TAIEX quarter-line regime card from the latest `taiex_ma60_regime_daily` row, displaying the data date, close, `ma60`, the state label, `days_above` when above, `wave_break_count`, the next-day break threshold with the class it would fall into when above, and a statistics table for the relevant class next to the down-day baseline. The relevant class SHALL be `next_break_type` when the state is `above`, and the class of the break that started the current run otherwise. The card SHALL show the text "歷史統計，非預測或投資建議". When no row exists, the card SHALL show "季線狀態尚未更新" and the rest of the page SHALL render unchanged.

#### Scenario: Above the average after several rebreaks

- **WHEN** the latest row has state `above`, `days_above` 36, `wave_break_count` 5, `next_break_type` `rebreak_rising`
- **THEN** the card shows that the index has been above the quarter line for 36 days, that this wave has 5 breaks, that a close below the threshold on the next trading day would be a rebreak while rising, and the `rebreak_rising` statistics next to the down-day baseline

#### Scenario: No regime data

- **WHEN** `taiex_ma60_regime_daily` has no rows
- **THEN** the card shows "季線狀態尚未更新" and the ADL chart still renders

<!-- @trace
source: taiex-ma60-regime
updated: 2026-11-03
code:
  - ETF/database/__pycache__/storage.cpython-313.pyc
  - src/app/investment/breadth/components/TaiexRegimeCard.tsx
  - supabase/migrations/20261101120100_add_taiex_ma60_regime_daily.sql
  - ETF/pipeline/orchestrator.py
  - src/lib/investment/taiexRegime.ts
  - src/app/investment/breadth/page.tsx
  - ETF/pipeline/steps/taiex_ma60_regime_step.py
  - src/app/actions/getTaiexRegime.ts
  - ETF/CLAUDE.md
tests:
  - src/app/actions/__tests__/getTaiexRegime.test.ts
  - src/app/investment/breadth/components/__tests__/TaiexRegimeCard.test.tsx
  - ETF/tests/fixtures/taiex_close_low_19990101_20261016.csv
  - ETF/tests/test_taiex_ma60_regime_step.py
  - src/lib/investment/__tests__/taiexRegime.test.ts
  - src/app/investment/breadth/__tests__/page.test.tsx
-->