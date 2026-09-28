## ADDED Requirements

### Requirement: Perfect-foresight ceiling computation

The system SHALL provide a module-level pure function `compute_perfect_foresight_ceiling(position, close, avg_n_stock, period=20)` in `ETF/optimizer/ga/evaluate.py` that computes a theoretical maximum annualized return achievable within a given candidate pool, using monthly rebalance dates derived from `position.resample('ME').last()`.

The function SHALL use the **full history** of monthly rebalance dates available in `position` — it SHALL NOT apply `_ic_decay_ok()`'s trailing-2-year cutoff. This is because the `actual_annual_return` compared against the ceiling (by `_leak_canary_ok`, below) is a full-history CAGR from `sim()` (`ETF/optimizer/run.py::get_position()` calls `sim()` without a start/end bound); comparing a full-history metric against a ceiling computed from only the trailing 2 years is a window mismatch that both under- and over-detects leakage depending on whether the trailing 2 years happened to be a bear or bull period.

`avg_n_stock` SHALL be validated as a finite number `>= 1` (via `np.isfinite`); when it is not (e.g. `NaN`), the function SHALL return `None` immediately, before attempting `round(avg_n_stock)`.

`position` is not always strictly boolean: under `strategy_mode='Scoring_System'` (the production default in `ETF/optimizer/run.py`), `combine_selected_conditions()` produces a continuous weighted-score DataFrame rather than `True`/`False` values. To work correctly across both `Compound_Conditions` (boolean) and `Scoring_System` (continuous score) modes, at each rebalance date the function SHALL treat a stock as eligible when `position.loc[date] > 0` (NaN compares as `False` and is therefore treated as ineligible; negative values are also `False` and therefore ineligible — a negative score represents a short/non-long signal, not a candidate for this ceiling). This reduces to exact `position == True` semantics for boolean `Compound_Conditions` output.

The eligible-stock index SHALL be intersected with `close.columns` before indexing `close` (`eligible.intersection(close.columns)`), because the candidate pool's columns are not guaranteed to be a subset of `close`'s columns (e.g. a condition can be built from a different FinLab data universe than `price:收盤價`); indexing `close` with columns it does not have SHALL NOT raise `KeyError`.

At each rebalance date, when the number of eligible stocks (after the `close.columns` intersection) is less than `round(avg_n_stock)`, or when `round(avg_n_stock) / len(eligible) > 0.5` (the candidate pool is not meaningfully larger than the number of stocks being picked, so the "top N" ceiling degenerates toward the pool's mean and would unfairly flag legitimate weighted/risk-managed strategies as leakage), that rebalance date SHALL be skipped and SHALL NOT contribute a period return.

Among the eligible stocks that pass the above checks, the function SHALL compute each stock's forward return over `period` trading days, select the `round(avg_n_stock)` stocks with the highest forward return, and use their average forward return as that period's ceiling return. The per-period ceiling returns SHALL be compounded and annualized (using 252 trading days per year) to produce the final ceiling value.

The function SHALL return `None` when the ceiling cannot be computed (`close` is `None`, `avg_n_stock` is not a finite number `>= 1`, fewer than 6 monthly rebalance dates exist in `position`'s full history, or every rebalance date was skipped and no period return was collected), and the caller SHALL treat `None` as "allow" (fail-open).

**Known limitation** (documented, not fixed by this requirement): under `strategy_mode='Scoring_System'`, the eligibility rule above yields a *union* of stocks satisfying any condition (since scores are summed), not the *intersection* `Compound_Conditions` produces; and `sim()` normalizes non-boolean `position` into weights rather than holding the ceiling's assumed "equal-weight top N". The ceiling is therefore a looser, weaker reference bound under `Scoring_System` than under `Compound_Conditions`.

#### Scenario: Ceiling computed from candidate pool

- **WHEN** `position` has at least 6 monthly rebalance dates in its full history, `close` covers the forward-return windows for at least one of those dates, and that date has more eligible stocks (after intersecting with `close.columns`) than `round(avg_n_stock) * 2`
- **THEN** `compute_perfect_foresight_ceiling` returns a finite float representing the annualized compounded return of always picking the top `avg_n_stock` performers within the eligible pool at each contributing rebalance date

##### Example: two-period compounding

- **GIVEN** two rebalance periods (20 trading days each) where the top-`avg_n_stock` average forward return is +5% in period 1 and +3% in period 2, and no other period contributes a valid return
- **WHEN** `compute_perfect_foresight_ceiling` compounds and annualizes these two periods
- **THEN** the returned ceiling reflects `(1.05 * 1.03)` compounded and annualized to a full-year equivalent (using the elapsed trading days of the two contributing periods), not a simple sum of the two returns

#### Scenario: Insufficient data returns None

- **WHEN** `close` is `None`, `avg_n_stock` is `NaN` or `< 1`, fewer than 6 monthly rebalance dates exist in `position`'s full history, or every rebalance date is skipped (missing forward-return data, or eligible-stock count below `round(avg_n_stock)`, or `round(avg_n_stock) / len(eligible) > 0.5`)
- **THEN** `compute_perfect_foresight_ceiling` returns `None`

#### Scenario: Negative-score stocks are not eligible

- **WHEN** a stock's `position` value at a rebalance date is negative (non-zero)
- **THEN** the function SHALL NOT treat that stock as eligible for that date, regardless of its forward return

#### Scenario: Candidate columns absent from close do not raise

- **WHEN** the eligible-stock set (from `position`) contains a column name that does not exist in `close.columns`
- **THEN** the function SHALL exclude that column via `intersection` before indexing `close`, and SHALL NOT raise `KeyError`

### Requirement: Leak canary gate in GA fitness evaluation

The system SHALL provide a module-level pure function `_leak_canary_ok(position, config, actual_annual_return, avg_n_stock)` in `ETF/optimizer/ga/evaluate.py` that gates GA individual fitness on suspected data leakage.

The function SHALL read `config.get('leak_canary_enabled', True)`; when `False`, it SHALL return `True` unconditionally without computing a ceiling. When enabled, it SHALL call `compute_perfect_foresight_ceiling(...)`; when that call returns `None` **or a value `<= 0`**, `_leak_canary_ok` SHALL return `True` (fail-open) — a non-positive ceiling means the candidate pool produced no valid positive-return reference over the available history, so it cannot serve as a meaningful upper bound, and (see below) scaling a non-positive ceiling by `leak_canary_margin` would invert the margin's intended "widen tolerance" semantics. Otherwise, it SHALL read `config.get('leak_canary_margin', 1.0)` and return `False` when `actual_annual_return > ceiling * leak_canary_margin`, and `True` otherwise.

`ETF/optimizer/ga/evaluate.py::_compute()` SHALL call `_leak_canary_ok(...)` after obtaining `metrics` from `get_metrics_compat(report)` and before calling `Score(metrics, config).evaluate()`, reading `annualReturn` and `avgNStock` via `metrics.get("profitability", {})` (not a bare `metrics["profitability"]` index) so a missing `profitability` key SHALL NOT raise `KeyError`. When `_leak_canary_ok(...)` returns `False`, `_compute()` SHALL return `0.0` as the individual's fitness value, matching the existing "disqualified individual" behavior used for `_ic_decay_ok()` failures, zero trade count, and insufficient average held-stock count.

When `config.get('print_enabled')` is truthy and `_leak_canary_ok` determines leakage (returns `False`), the system SHALL print a warning line showing the actual annualized return and the computed ceiling.

#### Scenario: Individual exceeds ceiling is disqualified

- **WHEN** `leak_canary_enabled` is `True` (or unset), `compute_perfect_foresight_ceiling` returns a finite ceiling, and `actual_annual_return` exceeds `ceiling * leak_canary_margin`
- **THEN** `_leak_canary_ok` returns `False`, and `_compute()` returns fitness `0.0` for that individual

#### Scenario: Individual within ceiling passes

- **WHEN** `actual_annual_return` is less than or equal to `ceiling * leak_canary_margin`
- **THEN** `_leak_canary_ok` returns `True`, and `_compute()` proceeds to call `Score(metrics, config).evaluate()` as before

#### Scenario: Feature disabled via config

- **WHEN** `config.get('leak_canary_enabled')` is explicitly `False`
- **THEN** `_leak_canary_ok` returns `True` without calling `compute_perfect_foresight_ceiling`, regardless of `actual_annual_return`

#### Scenario: Fail-open on missing data

- **WHEN** `compute_perfect_foresight_ceiling` returns `None` (insufficient data)
- **THEN** `_leak_canary_ok` returns `True`, leaving existing GA scoring behavior unaffected

#### Scenario: Fail-open on non-positive ceiling regardless of margin

- **WHEN** `compute_perfect_foresight_ceiling` returns a finite value `<= 0` (e.g. the candidate pool's best performers still lost money over the available history)
- **THEN** `_leak_canary_ok` returns `True` regardless of `actual_annual_return` or `leak_canary_margin`, and SHALL NOT apply `leak_canary_margin` to the non-positive ceiling
