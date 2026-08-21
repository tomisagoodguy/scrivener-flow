## ADDED Requirements

### Requirement: Compare view tab switch

The `/investment` page ETF holdings comparison section SHALL present two view modes via tabs: "card view" (existing per-ETF card layout) and "table view" (new per-stock grouped table). The card view SHALL remain the default selected tab, preserving current behavior for users who do not interact with the tabs.

#### Scenario: Default view unchanged

- **WHEN** a user loads `/investment` without interacting with the compare section
- **THEN** the page renders the existing per-ETF card layout, identical to current behavior

#### Scenario: Switching to table view

- **WHEN** a user clicks the "table view" tab
- **THEN** the compare section renders a table with one row per stock instead of one card per ETF

### Requirement: Per-stock overlap row computation

The system SHALL derive, entirely on the client from the existing `EtfData[]` array (no new server query or database column), one row per distinct `stock_code` across all ETFs, containing: `stock_code`, `stock_name`, `held_by` (list of ETF codes holding this stock), `held_count` (`held_by.length`), `coverage_pct` (`held_count / totalEtfs * 100`, or `0` when `totalEtfs` is `0`), `avg_weight` (arithmetic mean of the stock's `weight` value across all ETFs holding it), and `total_weight` (sum of the stock's `weight` value across all ETFs holding it).

The row set SHALL include every stock present in any ETF's holdings, including stocks held by only one ETF (`held_count === 1`), not only stocks that appear in `overlap.byCount` (which only tracks `n >= 2`).

#### Scenario: Stock held by multiple ETFs

- **WHEN** a stock appears in the holdings of 3 out of 5 ETFs with weights 2.0%, 3.0%, 4.0%
- **THEN** its row shows `held_count = 3`, `coverage_pct = 60`, `avg_weight = 3.0`, `total_weight = 9.0`, and `held_by` lists the 3 ETF codes

##### Example: coverage and weight aggregation

| held_by (weights) | totalEtfs | held_count | coverage_pct | avg_weight | total_weight |
| --- | --- | --- | --- | --- | --- |
| A(2.0), B(3.0), C(4.0) | 5 | 3 | 60 | 3.0 | 9.0 |
| A(1.5) | 5 | 1 | 20 | 1.5 | 1.5 |
| (none, totalEtfs=0) | 0 | 0 | 0 | 0 | 0 |

#### Scenario: Zero total ETFs guards against division by zero

- **WHEN** `overlap.totalEtfs` is `0` (no ETF has data for the current snapshot)
- **THEN** `coverage_pct` SHALL be `0` for all rows instead of `NaN` or throwing an error

### Requirement: Table view sorting

The table view SHALL sort rows by `held_count` descending by default. Clicking a column header for `held_count`, `coverage_pct`, `avg_weight`, or `total_weight` SHALL re-sort the table by that column; clicking the same header again SHALL reverse the sort direction.

#### Scenario: Default sort order

- **WHEN** the table view is first rendered
- **THEN** rows are ordered by `held_count` from highest to lowest

#### Scenario: Toggling sort direction

- **WHEN** a user clicks the `held_count` column header twice in a row
- **THEN** the sort direction flips from descending to ascending between the first and second click

### Requirement: Empty data fallback

When `etfs` is an empty array (no holdings data available), the table view SHALL display the same "no overlap data" message style as the existing card view's summary component, and SHALL NOT render an empty table frame.

#### Scenario: No holdings data

- **WHEN** `etfs` is an empty array
- **THEN** the table view shows a "no overlap data" message instead of an empty table
