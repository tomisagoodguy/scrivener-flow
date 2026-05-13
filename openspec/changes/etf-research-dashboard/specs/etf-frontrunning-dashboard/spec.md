## ADDED Requirements

### Requirement: Display add events from etf_frontrunning_stats

The page at `/investment/frontrunning` SHALL fetch and display all rows from `etf_frontrunning_stats` ordered by `event_date DESC`. Each row SHALL show: `etf_code`, `stock_code`, `event_date`, `delta_shares` (converted to 張: ÷1000), `delta_pct` (%), `is_new_position`, `r_t0`, `r_t1`, `r_t2`.

#### Scenario: Normal data display

- **WHEN** the page loads with data
- **THEN** a table SHALL render with one row per event, sorted by event_date descending

#### Scenario: r_t0 color coding

- **WHEN** `r_t0 >= 2.0`
- **THEN** the cell SHALL display in `text-rose-600` (台股紅色 = 顯著異常)
- **WHEN** `r_t0 < 2.0` or `r_t0 IS NULL`
- **THEN** the cell SHALL display in default text color

##### Example: ratio display

| r_t0 value | Display |
|---|---|
| 3.5 | `3.50×` in rose-600 |
| 1.2 | `1.20×` in default |
| null | `—` |

### Requirement: ETF and stock filter

The page SHALL provide a dropdown to filter by `etf_code` and a text input to filter by `stock_code`. Filters SHALL be applied client-side on the fetched dataset.

#### Scenario: ETF filter applied

- **WHEN** user selects an ETF from the dropdown
- **THEN** only rows matching that `etf_code` SHALL be visible in the table

### Requirement: Server Action data fetch

A Server Action `getEtfFrontrunningEvents()` at `src/app/actions/getEtfFrontrunningEvents.ts` SHALL query `etf_frontrunning_stats` using the Supabase server client. It SHALL return at most 500 rows ordered by `event_date DESC`.

#### Scenario: Empty result

- **WHEN** the table is empty (pipeline hasn't run yet)
- **THEN** the page SHALL display "尚無資料，等待 Pipeline 執行後自動更新" instead of an empty table
