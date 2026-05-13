## ADDED Requirements

### Requirement: Display matched pairs detail table

The page at `/investment/matched-pairs` SHALL fetch the latest `computed_date` from `etf_matched_pairs` and render a table with columns: `stock_code`, `stock_name`, `n_active_events`, `n_passive_events`, `active_median_r`, `passive_median_r`, `diff_median`. Rows SHALL be sorted by `|diff_median|` descending.

#### Scenario: diff_median color coding

- **WHEN** `diff_median > 0.05`
- **THEN** the cell SHALL display in `text-rose-600` (主動 ETF 異常量更高)
- **WHEN** `diff_median < -0.05`
- **THEN** the cell SHALL display in `text-emerald-600` (被動 ETF 異常量更高)
- **WHEN** `-0.05 <= diff_median <= 0.05`
- **THEN** default text color (無顯著差異)

##### Example: interpretation display

| diff_median | Color | Label |
|---|---|---|
| +0.82 | rose-600 | 主動顯著較高 |
| -0.31 | emerald-600 | 被動顯著較高 |
| +0.03 | default | 無顯著差異 |

### Requirement: Summary banner

Above the table, the page SHALL display a summary banner from `etf_matched_pairs_summary`: `n_pairs`、`n_active_higher`、`n_passive_higher`、`median_of_diffs`.

#### Scenario: Summary banner layout

- **WHEN** summary data is available
- **THEN** four stat chips SHALL show: 有效配對數、主動較高數、被動較高數、diff 中位數

### Requirement: Server Action data fetch

A Server Action `getEtfMatchedPairs()` at `src/app/actions/getEtfMatchedPairs.ts` SHALL query both `etf_matched_pairs` (detail) and `etf_matched_pairs_summary` for the latest `computed_date` and return both datasets.

#### Scenario: Empty table

- **WHEN** no overlap stocks exist (insufficient events)
- **THEN** the page SHALL display "本期無重疊配對股票"

#### Scenario: Latest date

- **WHEN** multiple `computed_date` exist
- **THEN** only the most recent date's rows SHALL be shown
