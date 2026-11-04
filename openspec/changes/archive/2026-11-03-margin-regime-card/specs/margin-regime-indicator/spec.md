## Purpose

Show, next to the market margin balance chart, whether margin financing is at a one-year high together with the historical 60-day drawdown rates after margin highs versus ordinary days, so readers do not mistake a margin high for a sell signal or a safety signal.

## ADDED Requirements

### Requirement: Daily margin regime record

`MarginRegimeStep` SHALL run after `TaiexMa60RegimeStep` and upsert one row per data date into `market_margin_regime_daily` with `margin_balance` (TWSE plus TPEx margin amount in hundred-million TWD), `margin_1y_high` (balance at or above the maximum of the 250 trading days ending that day), `index_near_high` (TAIEX close at or above 97% of its 250-day high close), and `stats`. Any failure SHALL be logged without raising and SHALL NOT write a row.

#### Scenario: Daily row written

- **WHEN** the pipeline runs for 2026-11-02 and FinLab has data for that date
- **THEN** `market_margin_regime_daily` has one row dated 2026-11-02, and a re-run updates that row instead of adding another

#### Scenario: Failure keeps previous rows

- **WHEN** fetching `margin_balance:融資券總餘額` raises an exception
- **THEN** the step logs an error, the pipeline continues, and no row is written for that date

### Requirement: Historical drawdown statistics by margin state

The step SHALL recompute `stats` from 2008-01-01 over all days with a complete 60-trading-day forward window. A 10% drawdown occurs when the minimum TAIEX intraday low over the next 1 to 60 trading days is at or below 90% of that day's close; the 60-day return is the close 60 trading days later divided by that day's close minus 1. Days where the one-year-high condition cannot be computed SHALL be excluded from every group. `stats` SHALL report count, drawdown rate, and mean 60-day return for the groups margin one-year high, all days, and index one-year high without margin high; 95% intervals of the drawdown-rate difference for margin high minus all days and margin high minus index-high-only, computed with `bootstrap_excess` using calendar months as blocks; and the share of days with `index_near_high` among margin-high days and among all days.

#### Scenario: Reproduces the verified study

- **WHEN** statistics are computed from the fixture `ETF/tests/fixtures/margin_regime_20080101_20261102.csv`
- **THEN** the margin one-year-high group has 588 days with a drawdown rate of 13.8% ± 0.5 pp, all days have 20.1% ± 0.5 pp, the index-high-only group has 196 days with 10.2% ± 0.5 pp, and the near-high share is 93.5% ± 0.5 pp for margin-high days versus 40.0% ± 0.5 pp for all days

#### Scenario: Interval semantics

- **WHEN** a difference interval is [-0.136, 0.015], another is [0.02, 0.10], another is [-0.10, -0.02], and another is null
- **THEN** they are classified indistinguishable, higher, lower, and insufficient respectively

### Requirement: Margin regime card on market chips page

The market chips page SHALL render `MarginRegimeCard` inside the margin balance section, below the chart, using the latest `market_margin_regime_daily` row. The card SHALL show the date, margin balance in 億, and a gray label reading 「融資創一年新高」 when `margin_1y_high` is true, otherwise 「未創一年新高」. It SHALL list count, 60-day drawdown rate, and mean 60-day return for the groups margin one-year high, index high without margin high, and all days; a conclusion sentence whose interval and wording (「分不出高低」 when the interval crosses zero, otherwise 「顯著較高」 or 「顯著較低」) come from `stats.diff.margin_high_vs_all`, or a sentence stating the sample is insufficient to compare when that interval is null; a shadow sentence with the two near-high shares; the sample period; and that the figures are historical statistics, not predictions or investment advice. The card SHALL NOT use rose or emerald colors. When no row exists or the query fails, the card SHALL show 「融資狀態尚未更新」.

#### Scenario: Margin high with indistinguishable risk

- **WHEN** the latest row has `margin_1y_high` true and the margin-high-minus-all interval is [-0.136, 0.015]
- **THEN** the card shows a gray label 「融資創一年新高」 and a sentence stating the drawdown rate after margin highs is 分不出高低 versus ordinary days with the interval -13.6 ～ +1.5 pp

#### Scenario: No data

- **WHEN** `market_margin_regime_daily` is empty
- **THEN** the card shows 「融資狀態尚未更新」 and the margin chart still renders
