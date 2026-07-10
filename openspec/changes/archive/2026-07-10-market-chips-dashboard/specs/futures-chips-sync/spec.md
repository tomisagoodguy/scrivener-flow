## ADDED Requirements

### Requirement: Futures institutional positions sync

The system SHALL fetch daily TAIFEX institutional open-interest data (futContractsDate) for TX, MXF, and TMF contracts covering dealer, trust, and foreign institutions, and upsert one row per (data_date, contract, institution) into `futures_institutional_daily` with long_oi, short_oi, and net_oi. The stage MUST be an auxiliary pipeline stage: a fetch failure is logged without interrupting the daily pipeline.

#### Scenario: Trading day sync

- **WHEN** the market-chips stage runs on a trading day after TAIFEX publishes data
- **THEN** nine institution rows (3 contracts × 3 institutions) exist for that date, and re-running the stage leaves row counts unchanged

#### Scenario: Source has no data yet

- **WHEN** TAIFEX has not yet published the current day's file
- **THEN** the futures segment skips with a log entry and writes no partial rows, while later segments still run

### Requirement: Retail long-short ratio for mini contracts

The system SHALL derive retail open interest for MXF and TMF as market OI minus the sum of the three institutions' OI, compute retail_ls_ratio = (retail_long − retail_short) / market_oi × 100, and store it on a per-contract summary row (institution = 'retail_summary'). The ratio MUST NOT be computed for TX.

#### Scenario: Retail ratio stored

- **WHEN** the futures segment completes for a trading day
- **THEN** exactly two retail_summary rows (MXF, TMF) exist for that date with retail_ls_ratio populated

##### Example: Ratio arithmetic

- **GIVEN** TMF market_oi = 100000, institutional long total = 40000, institutional short total = 55000
- **WHEN** retail values are derived (retail_long = 60000, retail_short = 45000)
- **THEN** retail_ls_ratio = (60000 − 45000) / 100000 × 100 = 15.0
