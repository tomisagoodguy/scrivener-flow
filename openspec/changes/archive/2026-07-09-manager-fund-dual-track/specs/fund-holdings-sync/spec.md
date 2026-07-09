## ADDED Requirements

### Requirement: SITCA monthly Top 10 holdings sync

The system SHALL fetch the latest-period SITCA IN2629 monthly Top 10 fund holdings for every asset-management company (comid) present in `fund_manager_map`, normalize fund names to `fund_short`, and upsert rows into `fund_holdings_monthly` with `source = 'sitca'`. The scraper MUST reject requests for non-latest periods by raising an error, because SITCA server-side filtering is known to be broken for historical periods.

#### Scenario: Latest month sync succeeds

- **WHEN** the monthly sync script runs after SITCA publishes the latest monthly report
- **THEN** `fund_holdings_monthly` contains one row per (ym, fund_short, stock_code) for each whitelisted fund, each row carrying rank (1-10), pct, amount, and `source = 'sitca'`
- **THEN** re-running the sync for the same month does not create duplicate rows (idempotent upsert on the unique key)

#### Scenario: Historical period requested from SITCA

- **WHEN** the SITCA scraper is invoked with a period older than the latest published month
- **THEN** it raises a ValueError instead of returning silently wrong data

#### Scenario: Fund name not in whitelist

- **WHEN** SITCA returns a fund whose raw name cannot be normalized to any `fund_short` in `fund_manager_map`
- **THEN** the row is skipped, the raw name is logged, and the sync summary lists it under unmatched funds

### Requirement: SITCA quarterly >=1% holdings sync

The system SHALL fetch the latest-period SITCA IN2630 quarterly holdings (all positions >= 1%) for whitelisted funds and upsert rows into `fund_holdings_quarterly` keyed by (yq, fund_short, stock_code).

#### Scenario: Latest quarter sync succeeds

- **WHEN** the sync script runs after SITCA publishes the latest quarterly report
- **THEN** `fund_holdings_quarterly` contains all >= 1% positions for each whitelisted fund with pct and amount populated

### Requirement: MOPS historical monthly backfill

The system SHALL provide a backfill script that fetches MOPS t78sb39_q3 monthly Top 5 active-ETF-fund holdings for a caller-specified historical month range (ROC-year conversion handled internally), normalizes fund names, and upserts rows into `fund_holdings_monthly` with `source = 'mops'`. MOPS rows MUST NOT overwrite SITCA rows for the same (ym, fund_short, stock_code) because the unique key includes source.

#### Scenario: Backfill a past month

- **WHEN** the backfill script is invoked for a month where SITCA data is unavailable
- **THEN** `fund_holdings_monthly` gains Top 5 rows for that month with `source = 'mops'`

##### Example: SITCA and MOPS coexistence

- **GIVEN** SITCA already stored (202606, 統一奔騰, 2330, source=sitca, rank 1)
- **WHEN** MOPS backfill runs for 202606 and also returns 2330 for 統一奔騰
- **THEN** both rows exist, distinguished by source, and downstream readers prefer sitca rows when both exist for the same key

### Requirement: Fund-manager mapping table

The system SHALL maintain a `fund_manager_map` table linking each observed fund (`fund_short`, type 'fund') or ETF (type 'etf', with etf_code) to its comid and manager name, with validity dates (valid_from, valid_to). The initial seed SHALL cover the 19-instrument watchlist (6 active ETFs + 13 active funds) derived from the tw-active CATALOG.

#### Scenario: Seed data loaded

- **WHEN** the seed migration has been applied
- **THEN** `fund_manager_map` contains 19 active rows (valid_to IS NULL) and each ETF row's etf_code exists in the ETF registry

### Requirement: Monthly CI schedule

The system SHALL run the fund holdings sync automatically via a GitHub Actions workflow scheduled on the 12th and 15th of each month (Taipei time), exiting non-zero when the sync fails so the existing CI failure notification fires. A failure for a single comid MUST NOT abort fetching the remaining comids.

#### Scenario: One issuer fails, others proceed

- **WHEN** SITCA returns an HTTP error for one comid after 2 retries during a scheduled run
- **THEN** the remaining comids are still fetched and upserted, and the job exits non-zero with the failed comid named in the log
