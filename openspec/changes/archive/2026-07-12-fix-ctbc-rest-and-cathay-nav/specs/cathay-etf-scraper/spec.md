## MODIFIED Requirements

### Requirement: Cathay scraper fetches holdings from REST API

The system SHALL retrieve holdings for 00400A by calling two GET endpoints on `cwapi.cathaysite.com.tw`: `GetETFAssets?fundCode=EA` for NAV/AUM metadata and `GetIndexStockWeights?fundCode=EA` for constituent weights. The scraper SHALL NOT require any authentication headers. The `shares` field SHALL be set to `0` because the Cathay API does not expose share count. The scraper SHALL be implemented as `_fetch_cathay(fund_code)` in `ETF/scrapers/official_api_scraper.py` and SHALL return `list[dict]` with keys `code`, `name`, `shares`, `weight_pct`.

The `GetETFAssets` response SHALL be mapped to the fund asset summary as follows (field names verified against the live response on 2026-07-12): `result.fundNav` → aum (this field is the fund's TOTAL net asset value despite its name), `result.fundPerNav` → nav (net asset value per unit), `result.fundOutstandingShares` → units, and `result.preDate` converted from `YYYY/MM/DD` to `YYYY-MM-DD` → nav_date. Numeric fields SHALL have thousands-separator commas stripped before conversion. The mapped values SHALL pass the existing aum ≈ nav × units consistency check.

Any failure of the `GetETFAssets` call — HTTP error, `success != true`, or missing fields — SHALL be logged and yield a null fund asset summary without affecting the holdings result from `GetIndexStockWeights`.

#### Scenario: successful REST call returns holdings

- **WHEN** `fetch_holdings("00400A")` is called
- **THEN** the scraper returns a non-empty DataFrame where `shares` is 0 for all rows, and `attrs["fund_assets"]` carries aum, nav, units, and nav_date parsed from `GetETFAssets`

#### Scenario: fundNav naming trap guarded

- **WHEN** `GetETFAssets` returns `fundNav: "25,748,701,845"` and `fundPerNav: "14.2"`
- **THEN** the fund asset summary maps aum to 25748701845 and nav to 14.2 — never the reverse

#### Scenario: GetETFAssets failure does not affect holdings

- **WHEN** the `GetETFAssets` endpoint returns an HTTP error or `success != true` while `GetIndexStockWeights` succeeds
- **THEN** `fetch_holdings("00400A")` returns the holdings DataFrame with no `fund_assets` attribute, and no exception propagates

#### Scenario: API returns empty weights list

- **WHEN** `GetIndexStockWeights` returns `result.stockWeights == []`
- **THEN** `fetch_holdings()` logs a warning and returns an empty DataFrame without raising

#### Scenario: fund code is configurable via CATALOG

- **WHEN** a new Cathay ETF with `fundCode=EB` is added to CATALOG
- **THEN** `_fetch_cathay("EB")` uses the correct query parameter without code changes
