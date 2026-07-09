## ADDED Requirements

### Requirement: Six fund dual-track signal types

The system SHALL detect the following six signal types from `fund_holdings_monthly`, `fund_holdings_quarterly`, `etf_holdings_snapshot`, and `fund_manager_map`, and upsert results into `fund_signals` keyed by (signal_type, stock_code, period):

1. `quarterly_promotion` — a stock present in the previous quarter's >= 1% list enters the current month's Top 10 for the first time
2. `quarterly_latent_etf` — a stock in a fund's quarterly list but absent from its monthly Top 10, while the same manager's ETF daily holdings contain it
3. `fund_consensus` — at least 3 whitelisted funds hold the same stock in the same month; metadata records the cross-month aggregate weight trend
4. `consecutive_add` — a single fund's pct for one stock increases for at least 3 consecutive months
5. `high_weight_cut` — a holding that once reached >= 10% pct drops to <= 5%
6. `core_exit` — a stock held in Top 10 for at least 3 consecutive months disappears from the list

Each signal row MUST populate strength, fund_names (jsonb array of fund_short), and metadata sufficient to reconstruct why the signal fired without re-querying source tables.

#### Scenario: Fund consensus fires

- **WHEN** monthly data for 202606 shows 統一奔騰, 統一黑馬, and 復華高成長 all holding 2383 in Top 10
- **THEN** a `fund_consensus` row exists for (fund_consensus, 2383, 202606) with strength >= 3 and the three fund names in fund_names

#### Scenario: Dual-track latent detection uses manager mapping

- **WHEN** 呂宏宇's fund 復華高成長 lists stock 3231 in its quarterly >= 1% report but not in its monthly Top 10, and 00991A (mapped to 呂宏宇 in fund_manager_map) holds 3231 in the latest `etf_holdings_snapshot`
- **THEN** a `quarterly_latent_etf` row exists with metadata naming both the fund and the ETF

#### Scenario: No false consecutive_add on gap months

- **WHEN** a fund's pct for a stock is 3.0 in 202604, missing in 202605, and 4.0 in 202606
- **THEN** no `consecutive_add` signal fires, because the month sequence is not consecutive

### Requirement: Signal detection runs inside the monthly sync

Signal detection SHALL execute as the final stage of the monthly sync script after holdings upserts complete, and SHALL be re-runnable: recomputing a period replaces existing rows for that period via upsert instead of duplicating them. A signal-stage failure MUST NOT roll back the holdings upserts that already succeeded, and MUST surface via non-zero exit code.

#### Scenario: Re-run replaces signals

- **WHEN** the sync is executed twice for the same month
- **THEN** `fund_signals` row counts for that period are identical after the first and second runs
