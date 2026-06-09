# etf-consensus-direction Specification

## Purpose
TBD - created by archiving change etf-consensus-direction. Update Purpose after archive.

## Requirements

### Requirement: Consensus direction counts persisted in etf_stock_overlap

The `etf_stock_overlap` table SHALL contain two additional integer columns:
- `consensus_buy_count`: number of distinct ETFs that executed a BUY or IN event on this stock within the last 7 calendar days, with `abs(diff_weight) >= 0.05`
- `consensus_sell_count`: number of distinct ETFs that executed a SELL or OUT event on this stock within the last 7 calendar days, with `abs(diff_weight) >= 0.05`

Both columns SHALL default to `0` and SHALL be updated on every `OverlapComputeStep` execution.

#### Scenario: Pipeline run computes buy consensus

- **WHEN** `OverlapComputeStep` executes and `etf_diff_logs` contains BUY/IN rows for a stock within the last 7 calendar days with `abs(diff_weight) >= 0.05`
- **THEN** `consensus_buy_count` for that stock is set to the count of distinct `etf_code` values meeting the criteria

##### Example: two ETFs buying same stock

| etf_code | stock_code | data_date  | change_type | diff_weight |
|----------|------------|------------|-------------|-------------|
| 00981A   | 2330       | 2026-05-07 | BUY         | 0.12        |
| 00980A   | 2330       | 2026-05-06 | IN          | 0.30        |
| 00991A   | 2330       | 2026-05-07 | BUY         | 0.03        |

- **GIVEN** target_date = 2026-05-09, 7-day window = 2026-05-02 ~ 2026-05-09
- **WHEN** OverlapComputeStep runs
- **THEN** `consensus_buy_count` for stock 2330 = 2 (00981A and 00980A qualify; 00991A excluded because abs(0.03) < 0.05)

#### Scenario: Pipeline run computes sell consensus

- **WHEN** `OverlapComputeStep` executes and `etf_diff_logs` contains SELL/OUT rows within the last 7 calendar days with `abs(diff_weight) >= 0.05`
- **THEN** `consensus_sell_count` for that stock is set to the count of distinct `etf_code` values meeting the criteria

#### Scenario: No qualifying events in window

- **WHEN** no `etf_diff_logs` rows match the criteria for a given stock in the 7-day window
- **THEN** `consensus_buy_count` and `consensus_sell_count` for that stock are set to `0`

#### Scenario: Same ETF has multiple qualifying events in window

- **WHEN** one ETF has two BUY log entries for the same stock within the 7-day window
- **THEN** that ETF is counted only once in `consensus_buy_count` (DISTINCT etf_code)

---
### Requirement: Consensus direction threshold constant defined in diff_engine

The `ETF/processors/diff_engine.py` module SHALL define a constant `CONSENSUS_WEIGHT_THRESHOLD = 0.05`.
This constant SHALL be used exclusively by the consensus direction calculation in `OverlapComputeStep` and SHALL NOT alter the existing `is_significant` logic which uses `WEIGHT_CHANGE_THRESHOLD = 0.10`.

#### Scenario: Constants are independent

- **WHEN** `CONSENSUS_WEIGHT_THRESHOLD` is read by `OverlapComputeStep`
- **THEN** `WEIGHT_CHANGE_THRESHOLD` remains `0.10` and `is_significant` flags in `etf_diff_logs` are unchanged

---
### Requirement: Consensus direction displayed on consensus page

The `/investment/consensus` page SHALL display `consensus_buy_count` and `consensus_sell_count` for each row.
- A non-zero `consensus_buy_count` SHALL be rendered as a rose-colored badge (台股加碼訊號)
- A non-zero `consensus_sell_count` SHALL be rendered as an emerald-colored badge (台股減碼訊號)
- Zero values SHALL NOT render a badge (empty cell)

#### Scenario: Row with buy consensus shown in rose

- **WHEN** a stock has `consensus_buy_count = 3` and `consensus_sell_count = 0`
- **THEN** a rose badge "3買" (or equivalent label) is displayed; no emerald badge appears

#### Scenario: Row with both directions non-zero

- **WHEN** a stock has `consensus_buy_count = 2` and `consensus_sell_count = 1`
- **THEN** both rose badge "2買" and emerald badge "1賣" are displayed side by side

#### Scenario: Row with zero consensus counts

- **WHEN** both `consensus_buy_count = 0` and `consensus_sell_count = 0`
- **THEN** the consensus direction cell is empty with no badges rendered

---
### Requirement: Consensus page renders divergence tab alongside existing tabs

The `/investment/consensus` page SHALL include a "分歧" tab as an additional navigation tab alongside existing consensus tabs. The tab content SHALL be sourced from the `etf_stock_divergence` table (defined in the `etf-divergence-detection` spec). No existing tabs or their data sources SHALL be removed or modified.

#### Scenario: Divergence tab visible in tab navigation

- **WHEN** a user navigates to `/investment/consensus`
- **THEN** the tab bar includes a "分歧" tab entry that, when clicked, renders the divergence content panel

---
### Requirement: Database migration adds consensus columns

A new Supabase migration file SHALL add `consensus_buy_count INTEGER NOT NULL DEFAULT 0` and `consensus_sell_count INTEGER NOT NULL DEFAULT 0` to the `etf_stock_overlap` table.
The migration SHALL be idempotent (use `ADD COLUMN IF NOT EXISTS`).
Existing rows SHALL remain valid with default value `0` after migration.

#### Scenario: Migration applied to existing table

- **WHEN** migration `20260509000000_add_consensus_counts_to_overlap.sql` is executed against a database with existing `etf_stock_overlap` rows
- **THEN** all existing rows gain `consensus_buy_count = 0` and `consensus_sell_count = 0`
- **THEN** no existing rows are deleted or modified in other columns
