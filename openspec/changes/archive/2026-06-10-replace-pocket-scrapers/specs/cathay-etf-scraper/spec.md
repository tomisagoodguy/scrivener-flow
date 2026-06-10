## ADDED Requirements

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
