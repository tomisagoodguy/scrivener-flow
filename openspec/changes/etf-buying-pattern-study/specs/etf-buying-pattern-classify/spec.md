## ADDED Requirements

### Requirement: BuyingPatternStep classifies seven buying behavior patterns

The `BuyingPatternStep` SHALL classify each BUY or IN event from `etf_diff_logs` into one or more of seven named patterns and write the result to the `etf_buying_patterns` table.

The seven patterns and their classification rules are:

| Pattern | Rule |
|---------|------|
| `volume_spike` | `abs(diff_shares)` exceeds the mean plus 5.5× std of the stock's `abs(diff_shares)` values over the past 20 trading days in the same ETF |
| `chase_high` | On `event_date`, the stock's `close >= high * 0.99` AND `(close - prev_close) / prev_close >= 0.03` in `stock_prices_daily` |
| `single_lot` | `abs(diff_shares)` is between 800 and 1200 (i.e., approximately one trading lot of 1,000 shares) |
| `window_break` | The ETF has no BUY or IN record for this stock in `etf_diff_logs` for the 60 calendar days preceding `event_date` |
| `sustained_buy` | The ETF has BUY or IN records for this stock on at least 20 of the last 20 trading days preceding and including `event_date` in `etf_diff_logs` |
| `new_position` | `change_type = 'IN'` (ETF had zero shares in the prior snapshot) |
| `dip_buy` | On `event_date`, the stock's `close <= low * 1.01` AND `(close - prev_close) / prev_close <= -0.02` in `stock_prices_daily` |

A single event MAY match multiple patterns; all matching pattern rows SHALL be inserted.

#### Scenario: Event with volume spike is classified

- **WHEN** an ETF BUY event occurs where `abs(diff_shares)` exceeds the 20-day mean + 5.5 std for that stock-ETF pair
- **THEN** a row with `pattern_type = 'volume_spike'` SHALL be inserted into `etf_buying_patterns`

##### Example: volume spike threshold

- **GIVEN** 20-day `abs(diff_shares)` values have mean = 10,000 and std = 2,000 (threshold = 10,000 + 5.5 × 2,000 = 21,000)
- **WHEN** an event has `abs(diff_shares) = 25,000`
- **THEN** the event is classified as `volume_spike`

- **GIVEN** same distribution
- **WHEN** an event has `abs(diff_shares) = 20,000`
- **THEN** the event is NOT classified as `volume_spike`

#### Scenario: New position event is classified

- **WHEN** `change_type = 'IN'` appears in `etf_diff_logs`
- **THEN** a row with `pattern_type = 'new_position'` SHALL be inserted into `etf_buying_patterns`

#### Scenario: Window break is classified after 60-day gap

- **WHEN** an ETF executes a BUY for a stock, and no BUY or IN exists for that stock-ETF pair in the 60 calendar days before the event
- **THEN** a row with `pattern_type = 'window_break'` SHALL be inserted

#### Scenario: Duplicate events are idempotent

- **WHEN** `BuyingPatternStep` runs again on the same `event_date`
- **THEN** existing rows in `etf_buying_patterns` for that date SHALL NOT be duplicated (upsert on `(pattern_type, stock_code, etf_code, event_date)`)

### Requirement: etf_buying_patterns table stores one row per pattern-event

The `etf_buying_patterns` table SHALL have the following columns:

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL PK | Auto-increment |
| `pattern_type` | TEXT NOT NULL | One of the seven pattern names |
| `stock_code` | TEXT NOT NULL | Stock identifier |
| `etf_code` | TEXT NOT NULL | ETF identifier |
| `event_date` | DATE NOT NULL | Date of the buy event |
| `future_returns` | JSONB | `{"1": 0.012, "5": 0.034, ...}` keys are day-horizon strings |
| `created_at` | TIMESTAMPTZ | Defaults to NOW() |

A unique constraint SHALL exist on `(pattern_type, stock_code, etf_code, event_date)`.

#### Scenario: Table is created via migration

- **WHEN** the migration `20260512000000_add_etf_buying_patterns.sql` is applied
- **THEN** the `etf_buying_patterns` table SHALL exist with the schema above
