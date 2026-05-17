## ADDED Requirements

### Requirement: Strategy Page Factor IC Snapshot Badges

The strategy page (`/investment/strategy`) SHALL display a factor health row beneath each `StrategySignalCard` showing the current month's IC values as color-coded badges for the factors relevant to that strategy.

Factor-to-strategy mapping:
- `super8888`: `rev_6m_peak`, `vol_breakout`, `momentum_20d`
- `capital_layer`: `rev_momentum_3_12`, `rsv_180`, `broker_force`
- `low_vol_cap`: `rev_momentum_3_12`, `rsv_180`, `price_to_high_240`
- `broker_ranked`: `rev_momentum_3_12`, `broker_force`, `rsv_180`

Badge color rules (Rank IC thresholds):
- IC ≥ 0.04: green (`text-emerald-600`)
- 0.02 ≤ IC < 0.04: yellow (`text-yellow-600`)
- IC < 0.02 or negative: red (`text-rose-600`)

#### Scenario: Badges displayed on strategy card

- **WHEN** the user views `/investment/strategy`
- **THEN** each StrategySignalCard displays a row of badges, one per relevant factor, showing the factor name and its current-month `ic_20d` value with the appropriate color class
- **WHEN** `factor_ic_stats` has no data for the current month
- **THEN** the badge row is hidden (no error displayed)

##### Example: badge rendering

| factor_name       | ic_20d | badge color class    |
| ----------------- | ------ | -------------------- |
| rev_momentum_3_12 | 0.052  | text-emerald-600     |
| rsv_180           | 0.019  | text-yellow-600      |
| broker_force      | -0.003 | text-rose-600        |

### Requirement: Strategy Page Factor IC 12-Month Sparkline

Each factor badge on the strategy card SHALL be clickable to expand a 12-month Rank IC trend sparkline rendered via `FactorICSparkline` (SVG path, no external chart library).

#### Scenario: Sparkline expansion

- **WHEN** the user clicks a factor badge
- **THEN** a sparkline chart appears below the badge row showing the last 12 months of `ic_20d` for that factor
- **WHEN** fewer than 3 months of data exist
- **THEN** the sparkline is not shown and the badge is not clickable

### Requirement: Sector Page Factor IC Panel

The sector strength page (`/investment/sectors`) SHALL display a collapsible IC panel at the top of the page showing IC values for the four sector-proxy factors.

Sector proxy factors:
- `sector_ret_1d`: single-day return (proxy for `ret_1d > 0` filter)
- `sector_ret_5d`: 5-day return (proxy for `ret_5d > 0` filter)
- `vol_ratio_20d`: amount / 20-day MA (proxy for volume ratio filter)
- `above_ma20_pct`: fraction of days above MA20 in last 10 days (proxy for breadth)

The panel SHALL show both the current-month IC snapshot (bar) and a 12-month trend sparkline per factor.

#### Scenario: Panel visible on sector page

- **WHEN** the user navigates to `/investment/sectors`
- **THEN** a collapsible panel labelled "篩選條件效力（IC）" appears above the sector list
- **THEN** the panel shows four rows, one per proxy factor, each with ic_1d / ic_5d / ic_20d values and a 12-month sparkline
- **WHEN** the user clicks the panel header
- **THEN** the panel collapses/expands (default: collapsed)

### Requirement: getFactorIC Server Action

A Server Action `getFactorIC(factors: string[], months: number)` SHALL fetch IC data from `factor_ic_stats`.

- `factors`: array of factor names to retrieve
- `months`: number of recent months to return (max 24)
- Returns: `{ factor: string; month: string; ic_1d: number | null; ic_5d: number | null; ic_20d: number | null }[]`
- Uses the anon Supabase client (public read allowed by RLS)

#### Scenario: Normal fetch

- **WHEN** `getFactorIC(['rev_momentum_3_12', 'rsv_180'], 12)` is called
- **THEN** returns up to 24 rows (2 factors × 12 months) ordered by month descending
- **WHEN** the table is empty
- **THEN** returns an empty array without throwing
