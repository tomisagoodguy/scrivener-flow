## ADDED Requirements

### Requirement: Small holder percentage computed from TDCC tiers

The sync script SHALL compute `small_holder_pct` as the sum of `custody_ratio` for tiers where `tier <= 3` (excluding tier 17 aggregate row), and SHALL compute `small_holder_pct_change` as the difference between the latest and previous period values (in percentage points).

#### Scenario: Small holder pct computed correctly

- **WHEN** the sync script runs with inventory data for a stock
- **THEN** `small_holder_pct` equals the sum of `custody_ratio` for tier 1, 2, and 3 rows
- **THEN** tier 17 rows are excluded from the sum

##### Example: tier summation
| Tier | custody_ratio | Included? |
|------|--------------|-----------|
| 1    | 2.5          | YES       |
| 2    | 8.3          | YES       |
| 3    | 4.1          | YES       |
| 4    | 6.2          | NO        |
| 17   | 100.0        | NO (aggregate) |

- **GIVEN** the rows above for a single stock in one period
- **WHEN** `small_holder_pct` is computed
- **THEN** result is 14.9 (= 2.5 + 8.3 + 4.1)

#### Scenario: Week-over-week change computed

- **WHEN** two consecutive weekly snapshots exist for a stock
- **THEN** `small_holder_pct_change` equals `small_holder_pct_latest − small_holder_pct_previous` rounded to 3 decimal places

#### Scenario: Backfill populates new columns

- **WHEN** `--force-backfill` flag is passed
- **THEN** `small_holder_pct` is populated for all historical snapshot dates
- **THEN** `small_holder_pct_change` is set to NULL for backfill rows (only current-run delta is computed)

### Requirement: equity_distribution_stats stores small holder columns

The `equity_distribution_stats` table SHALL contain `small_holder_pct NUMERIC(7,3)` and `small_holder_pct_change NUMERIC(7,3)` columns. Both columns SHALL be nullable (no DEFAULT) to allow backfill rows to omit the change value.

#### Scenario: Migration is additive

- **WHEN** the migration is applied to an existing table
- **THEN** existing rows are unaffected
- **THEN** new columns have NULL value for existing rows

### Requirement: QuantFilter includes shareholder signal fields

`fetchQuantFilters` SHALL query `equity_distribution_stats` for the most recent snapshot per stock code and populate `big_holder_pct_change` and `small_holder_pct_change` fields on the returned `QuantFilter` object. Both fields SHALL be `number | null`.

#### Scenario: Recent snapshot fetched

- **WHEN** `fetchQuantFilters` is called with a list of stock codes
- **THEN** for each stock code, the row with the latest `snapshot_date` is used
- **THEN** `big_holder_pct_change` and `small_holder_pct_change` are populated from that row

#### Scenario: Missing snapshot handled gracefully

- **WHEN** a stock code has no entry in `equity_distribution_stats`
- **THEN** `big_holder_pct_change` and `small_holder_pct_change` are `null` for that stock
- **THEN** no error is thrown

### Requirement: HoldingRow displays shareholder signal badges

`HoldingRow` SHALL display a 💎 badge when `big_holder_pct_change > 0` and a 👤 badge when `small_holder_pct_change < 0` (散戶持股比例下降). Each badge SHALL show a tooltip with the exact pp value rounded to 2 decimal places.

#### Scenario: Big holder increasing shows diamond badge

- **WHEN** `big_holder_pct_change` is positive (e.g., +0.8 pp)
- **THEN** a 💎 badge is rendered with tooltip "大戶增持 +0.80pp"

#### Scenario: Small holder decreasing shows person badge

- **WHEN** `small_holder_pct_change` is negative (e.g., -0.5 pp)
- **THEN** a 👤 badge is rendered with tooltip "散戶減持 -0.50pp"

#### Scenario: Neutral or missing data shows no badge

- **WHEN** `big_holder_pct_change` is 0 or null
- **THEN** no 💎 badge is rendered
- **WHEN** `small_holder_pct_change` is 0 or null or positive
- **THEN** no 👤 badge is rendered

##### Example: badge visibility table
| big_holder_pct_change | small_holder_pct_change | 💎 shown | 👤 shown |
|-----------------------|------------------------|----------|----------|
| +0.8                  | -0.5                   | YES      | YES      |
| +0.2                  | +0.1                   | YES      | NO       |
| -0.3                  | -0.4                   | NO       | YES      |
| 0                     | 0                      | NO       | NO       |
| null                  | null                   | NO       | NO       |
