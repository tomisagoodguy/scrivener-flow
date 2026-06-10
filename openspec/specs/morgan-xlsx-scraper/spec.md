# morgan-xlsx-scraper Specification

## Purpose

TBD - created by archiving change 'expand-etf-coverage-and-diff-schema'. Update Purpose after archive.

## Requirements

### Requirement: Morgan ETF holdings fetched via XLSX download

The system SHALL fetch 00401A (摩根台灣鑫收) and 00989A (摩根美國科技) holdings by downloading an XLSX file from the Morgan Asset Management official website, using a `Referer` header to avoid 403 rejection.

The system SHALL filter XLSX rows by `Record Type = "D"` to extract holdings rows, ignoring header and summary rows.

The CATALOG SHALL contain entries for `00401A` and `00989A` with `issuer: "morgan"` and the respective XLSX URL parameters.

The `source` field for both ETFs SHALL be updated from `pocket` to `official_api` in both registry files.

#### Scenario: Successful XLSX download and parse for 00401A

- **WHEN** `official_api_scraper.fetch_holdings("00401A")` is called
- **THEN** the function downloads an XLSX file and returns a DataFrame where each row with `Record Type = "D"` is parsed as `{code, name, weight, shares}`

#### Scenario: Successful XLSX download and parse for 00989A

- **WHEN** `official_api_scraper.fetch_holdings("00989A")` is called
- **THEN** the function returns a DataFrame with valid holdings; `code` values may be non-Taiwan stock codes (e.g., US tickers) and SHALL NOT be rejected on code format

#### Scenario: XLSX download fails — fallback to Pocket

- **WHEN** the XLSX URL returns non-200 or the downloaded bytes are not a valid ZIP/XLSX
- **THEN** `fetch_holdings()` returns an empty DataFrame and `multi_etf_step` falls back to `pocket_scraper`
