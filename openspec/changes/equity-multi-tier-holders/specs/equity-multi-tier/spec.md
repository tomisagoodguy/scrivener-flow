## ADDED Requirements

### Requirement: DB stores three holder tier percentages

The system SHALL store three holder tier percentages and their weekly changes in `equity_distribution_stats`:
- `mid_holder_pct` / `mid_holder_pct_change`: tier >= 11 (200+ lots)
- `big_holder_pct` / `big_holder_pct_change`: tier >= 12 (400+ lots, existing)
- `whale_holder_pct` / `whale_holder_pct_change`: tier >= 15 (1000+ lots)

All four new columns SHALL be nullable NUMERIC(7,3) to accommodate stocks with no data yet.

#### Scenario: Weekly sync writes all three tiers

- **WHEN** `sync_equity_distribution.py` runs successfully
- **THEN** each upserted row in `equity_distribution_stats` SHALL contain non-null values for `mid_holder_pct`, `big_holder_pct`, and `whale_holder_pct`

#### Scenario: Missing tier data does not block sync

- **WHEN** a stock has no tier >= 15 holders in TDCC data
- **THEN** `whale_holder_pct` SHALL be stored as 0.0 (not NULL), and `whale_holder_pct_change` SHALL be computed normally as the difference from the previous period

##### Example: tier computation

- **GIVEN** stock 2330 has custody_ratio: tier11=1.42%, tier12=1.03%, tier13=0.93%, tier14=0.74%, tier15=85.58%
- **WHEN** computing tier percentages
- **THEN** `mid_holder_pct` = 1.42+1.03+0.93+0.74+85.58 = 89.70, `big_holder_pct` = 1.03+0.93+0.74+85.58 = 88.28, `whale_holder_pct` = 85.58

---

### Requirement: Frontend tier selector controls which column is ranked

The system SHALL provide a tier selector on `/investment/equity` that controls which `*_holder_pct_change` column drives the ranking order. The selector SHALL be implemented as a `?tier=200|400|1000` URL query parameter.

Default tier SHALL be `400` when the parameter is absent.

#### Scenario: Default view shows 400+ ranking

- **WHEN** user visits `/investment/equity` without a `tier` param
- **THEN** the left table SHALL be sorted by `big_holder_pct_change` descending

#### Scenario: Selecting 200+ tier changes ranking column

- **WHEN** user selects the 200張+ tier button
- **THEN** the URL SHALL update to `?tier=200` and the left table SHALL be sorted by `mid_holder_pct_change` descending

#### Scenario: Selecting 1000+ tier changes ranking column

- **WHEN** user selects the 1000張+ tier button
- **THEN** the URL SHALL update to `?tier=1000` and the left table SHALL be sorted by `whale_holder_pct_change` descending

---

### Requirement: Column header displays active tier threshold

The system SHALL display the active tier threshold in the column header of the left ranking table so users know which level they are viewing.

#### Scenario: Header reflects selected tier

| Selected tier param | Expected column header |
|---|---|
| absent or `400` | 大戶增持（400張+）|
| `200` | 大戶增持（200張+）|
| `1000` | 大戶增持（1000張+）|
