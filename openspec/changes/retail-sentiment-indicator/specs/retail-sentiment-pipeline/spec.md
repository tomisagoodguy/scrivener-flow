## ADDED Requirements

### Requirement: Retail sentiment pipeline step

The system SHALL include a `RetailSentimentStep` as an auxiliary ETF pipeline step that computes market-level retail participation indicators from FinLab `etl:inventory` data and persists results to `market_breadth_daily`.

The step SHALL:
- Fetch `etl:inventory:小於十張佔比` and `etl:inventory:零股佔比` from FinLab
- Compute the market-level median across all stock columns
- Compute the 12-week rolling change in small-holder percentage
- Compute rolling 156-week P90/P10/mean/std for the 12-week change
- Compute Z-score relative to rolling mean/std
- Determine `is_retail_accelerating` = (12w change > rolling P90)
- Determine `is_odd_lot_fragmented` = (odd-lot pct > rolling P90 of odd-lot pct)
- Persist results to `market_breadth_daily` for the latest available data date
- Return early without writing if the current week's data has already been persisted
- Log error and NOT raise on any exception, so downstream steps are unaffected

#### Scenario: Weekly data available and not yet persisted

- **WHEN** the pipeline runs and FinLab inventory data has a new week's snapshot not yet in `market_breadth_daily`
- **THEN** the step computes all 5 indicator values and writes them to the matching date row in `market_breadth_daily`

#### Scenario: Current week already persisted

- **WHEN** the pipeline runs and `market_breadth_daily` already has non-null `small_holder_chg_12w` for the latest inventory date
- **THEN** the step returns early without writing

#### Scenario: FinLab data fetch fails

- **WHEN** the FinLab API raises an exception during data fetch
- **THEN** the step logs the error, sets `ctx.retail_sentiment = {}`, and does NOT raise so subsequent steps continue

### Requirement: market_breadth_daily schema extension

The `market_breadth_daily` table SHALL include the following nullable columns for retail sentiment data:

| Column | Type | Description |
|--------|------|-------------|
| `small_holder_chg_12w` | NUMERIC | 12-week change in median small-holder (<10 lots) percentage |
| `small_holder_z_score` | NUMERIC | Z-score vs rolling 156-week mean/std |
| `is_retail_accelerating` | BOOLEAN | True when chg_12w > rolling P90 (bullish signal) |
| `is_odd_lot_fragmented` | BOOLEAN | True when odd-lot pct > rolling P90 (bearish long-term signal) |

The migration SHALL use `ADD COLUMN IF NOT EXISTS` to be idempotent.

#### Scenario: Migration applied to existing table

- **WHEN** the migration SQL is executed on a database that already has `market_breadth_daily`
- **THEN** the four new columns are added with NULL as default; existing rows are unaffected

##### Example: new column defaults

| Existing row date | small_holder_chg_12w | is_retail_accelerating |
|-------------------|----------------------|------------------------|
| 2026-06-01 | NULL | NULL |
| 2026-06-06 (new) | 0.5 | true |
