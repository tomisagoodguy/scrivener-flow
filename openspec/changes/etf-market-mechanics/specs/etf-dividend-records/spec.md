## ADDED Requirements

### Requirement: Dividend source verification spike

Before implementing the dividend scraper, the system's implementer SHALL verify, for at least 00981A and 00984D, that one candidate public source (TWSE OpenAPI ex-dividend datasets, issuer websites, or MOPS announcements) yields all of: period, cash per unit, and ex-dividend date. The chosen source and evidence MUST be recorded in the change's task notes before scraper implementation proceeds. If no candidate source provides these fields, the scope SHALL fall back to manual seeding plus announcement monitoring and the user MUST be informed.

#### Scenario: Spike succeeds

- **WHEN** a candidate source returns period, cash per unit, and ex-date for both probe ETFs
- **THEN** the scraper implementation proceeds against that source and the task notes name the endpoint

### Requirement: Dividend records storage and sync

The system SHALL maintain an `etf_dividend_records` table keyed by (etf_code, period) with cash_per_unit, ex_date, pay_date (nullable), yield_pct (nullable), and source. A daily auxiliary pipeline stage SHALL upsert dividend records for all registry ETFs idempotently; a fetch failure for one ETF MUST be logged without aborting the pipeline.

#### Scenario: Idempotent daily sync

- **WHEN** the dividend stage runs on two consecutive days with no new announcements
- **THEN** `etf_dividend_records` row counts are unchanged after the second run

#### Scenario: ETF without dividend policy

- **WHEN** the scraper finds no dividend records for an accumulating ETF
- **THEN** no rows are written for that ETF and no error is raised

### Requirement: Dividend timeline display

The `/investment/[etf]` market-mechanics tab SHALL render the ETF's dividend history as a timeline showing period, cash per unit, and ex-date markers. ETFs with no records SHALL show an explicit "no dividend policy or no records" state.

#### Scenario: Dividend-paying ETF

- **WHEN** a user opens the market-mechanics tab for an ETF with rows in `etf_dividend_records`
- **THEN** each record renders with its period, amount, and ex-date on the timeline
