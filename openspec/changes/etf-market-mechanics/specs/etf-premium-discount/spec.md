## ADDED Requirements

### Requirement: Daily premium/discount computation

The system SHALL compute each ETF's daily premium_pct as (close − nav) / nav × 100, where close is the ETF's own closing price from FinLab and nav comes from `etf_aum_series.nav`, and store close and premium_pct on the same `etf_aum_series` row. When either close or nav is unavailable for a date, premium_pct MUST be NULL — the system MUST NOT substitute estimated NAV values.

#### Scenario: Both inputs available

- **WHEN** the daily pipeline runs for an ETF whose issuer JSON provides NAV and FinLab provides the closing price
- **THEN** that date's `etf_aum_series` row carries close and premium_pct

##### Example: Premium computation

- **GIVEN** close = 10.25 and nav = 10.00 for 00981A on a trade date
- **WHEN** premium_pct is computed
- **THEN** the stored value is 2.50

#### Scenario: NAV source not connected

- **WHEN** the pipeline runs for an ETF whose issuer JSON has no verified NAV field
- **THEN** premium_pct is NULL for that date and no estimated value is written

### Requirement: NAV coverage expansion

The system SHALL review all issuer JSON payloads already fetched by the official API scraper and extract NAV for every issuer where a NAV field can be verified against the issuer's public website, extending coverage beyond the current three issuers (nomura, allianz, capital). Issuers without a verifiable NAV field SHALL be listed in the ETF module documentation as not connected.

#### Scenario: Newly verified issuer

- **WHEN** an issuer's JSON is confirmed to contain a NAV field matching its public website value
- **THEN** subsequent pipeline runs populate nav for that issuer's ETFs and premium_pct starts computing

### Requirement: Premium/discount chart

The `/investment/[etf]` deep-dive page SHALL render a premium/discount line chart with ±1% reference bands inside the market-mechanics tab. For ETFs whose NAV source is not connected, the chart area MUST show an explicit notice naming the missing NAV source instead of an empty chart.

#### Scenario: Connected ETF chart

- **WHEN** a user opens the market-mechanics tab for an ETF with premium_pct history
- **THEN** the line chart renders the series with ±1% bands, using rose for positive premium and emerald for discount per Taiwan market convention
