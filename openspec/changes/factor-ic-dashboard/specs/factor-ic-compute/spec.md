## ADDED Requirements

### Requirement: Monthly Factor IC Computation

The system SHALL compute Rank IC (Information Coefficient) for each strategy's core continuous factors on a monthly basis using FinLab data, and persist results to Supabase.

Factors to compute:
- `rev_momentum_3_12`: 3-month / 12-month rolling average revenue ratio
- `rsv_180`: 180-day RSV (raw stochastic value, not ranked)
- `rs_100`: 100-day relative strength (close / close.shift(100))
- `ma_trend_score`: MA5 > MA20 alignment score (0–2 continuous)
- `broker_force`: Top-15 broker net-volume rolling mean / std (60-day)
- `vol_breakout`: Amount / 60-day rolling average amount
- `smallcap_pct`: 1 minus market-cap percentile rank
- `price_to_high_240`: Close / 240-day rolling high

IC horizons: 1-day, 5-day, 20-day forward returns (Rank IC = Spearman correlation).

The computation script SHALL use the FINLAB_API_KEY environment variable for authentication, not interactive browser login.

#### Scenario: Normal monthly run

- **WHEN** `ETF/compute_factor_ic.py` is executed on the first trading day of the month
- **THEN** the script computes Rank IC for each of the 8 factors at horizons 1d, 5d, 20d using the prior 252 trading days of data
- **THEN** results are upserted into `factor_ic_stats` with `month = first day of current month`

#### Scenario: Existing month overwrite

- **WHEN** the script is run twice in the same month
- **THEN** the second run MUST overwrite (upsert) existing rows without creating duplicates

##### Example: IC values written to DB

| month      | factor_name        | ic_1d  | ic_5d  | ic_20d |
| ---------- | ------------------ | ------ | ------ | ------ |
| 2026-05-01 | rev_momentum_3_12  | 0.031  | 0.045  | 0.052  |
| 2026-05-01 | rsv_180            | 0.028  | 0.039  | 0.041  |
| 2026-05-01 | broker_force       | 0.019  | 0.024  | 0.018  |

### Requirement: factor_ic_stats Database Schema

The `factor_ic_stats` table SHALL have the following schema:

```sql
CREATE TABLE factor_ic_stats (
  month        date    NOT NULL,
  factor_name  text    NOT NULL,
  ic_1d        float,
  ic_5d        float,
  ic_20d       float,
  computed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (month, factor_name)
);
```

RLS policy: public read (anon), write restricted to service role.

#### Scenario: Schema enforces uniqueness

- **WHEN** an upsert occurs for the same (month, factor_name) pair
- **THEN** the existing row is updated, not duplicated

### Requirement: Monthly GitHub Actions Workflow

The system SHALL include a `.github/workflows/factor_ic_monthly.yml` workflow that executes `ETF/compute_factor_ic.py` on the first day of each month at UTC 15:00 (Taiwan 23:00).

#### Scenario: Scheduled trigger

- **WHEN** the cron schedule `0 15 1 * *` fires
- **THEN** the workflow runs `uv run python ETF/compute_factor_ic.py` using the repository secrets `FINLAB_API_KEY`, `SUPABASE_DB_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`
- **THEN** if the script exits with non-zero code, the workflow is marked as failed
