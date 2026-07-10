## ADDED Requirements

### Requirement: Market margin balance series

The system SHALL fetch the TWSE MI_MARGN market-level margin summary daily and upsert one row per trading date into `market_margin_daily` with margin_balance, margin_change, short_balance, and short_change. The segment runs inside the auxiliary market-chips stage; a failure is logged without aborting other segments.

#### Scenario: Daily margin row

- **WHEN** the market-chips stage runs on a trading day
- **THEN** `market_margin_daily` has exactly one row for that date, and a re-run does not duplicate it

#### Scenario: Margin trend readable

- **WHEN** 60 trading days have been synced
- **THEN** querying the table ordered by data_date yields a gap-free series for charting (gaps only on non-trading days)
