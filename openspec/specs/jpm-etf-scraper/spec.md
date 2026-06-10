# jpm-etf-scraper Specification

## Purpose

TBD — Defines the scraper for JPMorgan ETF holdings (00401A, 00989A), downloading constituent data from fixed XLSX files hosted on JPMorgan's CDN.

## Requirements

### Requirement: JPM scraper fetches holdings from fixed XLSX URL

The system SHALL download a fixed XLSX file from JPMorgan's CDN for each configured ETF and parse constituent holdings. The XLSX URL SHALL be stored in `CATALOG` under `providerConfig.xlsxUrl`. The scraper SHALL identify detail rows by `Record Type == "D"` and extract `Constituent Ticker`, `Constituent Description`, `Shares or PAR Amount`, and `Market Value Base`. Weight SHALL be computed as `Market Value Base / Estimated Total Market Value * 100`. The scraper SHALL be implemented as `_fetch_jpm(xlsx_url)` in `ETF/scrapers/official_api_scraper.py` and SHALL return `list[dict]` with keys `code`, `name`, `shares`, `weight_pct`.

#### Scenario: successful XLSX download and parse

- **WHEN** `fetch_holdings("00401A")` is called
- **THEN** the scraper downloads the XLSX, finds detail rows, and returns a non-empty DataFrame with columns `code`, `name`, `weight`, `shares`

#### Scenario: XLSX URL not reachable

- **WHEN** the XLSX URL returns a non-200 HTTP response
- **THEN** `fetch_holdings()` catches the exception, logs an error, and returns an empty DataFrame without raising

#### Scenario: both JPM ETFs use distinct XLSX URLs

- **WHEN** `fetch_holdings("00989A")` is called
- **THEN** the scraper uses the 00989A-specific XLSX URL, not the 00401A URL

##### Example: URL mapping

| ETF code | xlsxUrl suffix |
|----------|----------------|
| 00401A | `...pcf_updates_00401A_TW00000401A1.xlsx` |
| 00989A | `...pcf_updates_00989A_TW00000989A5.xlsx` |

<!-- @trace
source: replace-pocket-scrapers
updated: 2026-06-10
code:
  - ETF/config/etf_registry.py
  - EOCS/因子分析_公開版.py
  - ETF/scrapers/official_api_scraper.py
  - ETF/parsers/__pycache__/xlsx_parser.cpython-313.pyc
  - src/lib/investment/etfRegistry.ts
tests:
  - ETF/tests/test_new_scrapers.py
-->