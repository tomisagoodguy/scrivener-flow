# cathay-etf-scraper Specification

## Purpose

TBD — Defines the scraper for Cathay ETF holdings, fetching constituent data from the official Cathay REST API (`cwapi.cathaysite.com.tw`) for ETFs such as 00400A.

## Requirements

### Requirement: Cathay scraper fetches holdings from REST API

The system SHALL retrieve holdings for 00400A by calling two GET endpoints on `cwapi.cathaysite.com.tw`: `GetETFAssets?fundCode=EA` for NAV/AUM metadata and `GetIndexStockWeights?fundCode=EA` for constituent weights. The scraper SHALL NOT require any authentication headers. The `shares` field SHALL be set to `0` because the Cathay API does not expose share count. The scraper SHALL be implemented as `_fetch_cathay(fund_code)` in `ETF/scrapers/official_api_scraper.py` and SHALL return `list[dict]` with keys `code`, `name`, `shares`, `weight_pct`.

#### Scenario: successful REST call returns holdings

- **WHEN** `fetch_holdings("00400A")` is called
- **THEN** the scraper calls both endpoints in parallel and returns a non-empty DataFrame where `shares` is 0 for all rows

#### Scenario: API returns empty weights list

- **WHEN** `GetIndexStockWeights` returns `result.stockWeights == []`
- **THEN** `fetch_holdings()` logs a warning and returns an empty DataFrame without raising

#### Scenario: fund code is configurable via CATALOG

- **WHEN** a new Cathay ETF with `fundCode=EB` is added to CATALOG
- **THEN** `_fetch_cathay("EB")` uses the correct query parameter without code changes

---
### Requirement: Cathay ETF holdings fetched via official REST API

The system SHALL fetch 00400A (國泰動能高息) holdings via a GET request to the Cathay Asset Management REST API that returns `stockWeights[]`.

The CATALOG entry for 00400A SHALL use `issuer: "cathay"` and include the fund's REST API endpoint parameters.

The `source` field of 00400A SHALL be updated from `pocket` to `official_api` in both registry files.

#### Scenario: Successful Cathay REST API fetch

- **WHEN** `official_api_scraper.fetch_holdings("00400A")` is called
- **THEN** the function returns a DataFrame with at least one row; each row has a valid `code`, non-null `weight`, and non-negative `shares`

#### Scenario: Cathay API returns HTTP error — fallback to Pocket

- **WHEN** the Cathay REST endpoint returns a non-200 status code
- **THEN** `fetch_holdings()` returns an empty DataFrame (does not raise), and `multi_etf_step` falls back to `pocket_scraper`

##### Example: parsed holdings row

| Field    | Expected value       | Notes                          |
|----------|---------------------|--------------------------------|
| `code`   | `"2330"`             | 4-digit TW stock code          |
| `name`   | `"台積電"`            | Chinese name                   |
| `weight` | `8.5`                | percentage (not decimal)       |
| `shares` | `1500000`            | raw shares (not lots)          |

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
