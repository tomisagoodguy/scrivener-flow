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

---

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

<!-- @trace
source: expand-etf-coverage-and-diff-schema
updated: 2026-06-10
-->

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