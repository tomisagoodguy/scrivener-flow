# ctbc-rest-etf-scraper Specification

## Purpose

TBD - created by archiving change 'fix-ctbc-rest-and-cathay-nav'. Update Purpose after archive.

## Requirements

### Requirement: CTBC REST scraper fetches 00995A holdings with a non-empty trade date

The system SHALL fetch 00995A (中信台灣卓越) holdings via the CTBC two-step authenticated REST API: first POST `home/AuthToken` to obtain a short-lived session token, then POST `etf/ETFHoldingWeight` with `{token, FID, StartDate}`. On both calls the token SHALL additionally be carried as a URL query parameter (`?token=...`) — sending it only in the JSON body makes the API respond `ResultCode: 1`「Token 無效或過期」(verified 2026-07-12). The `AuthToken` seed token SHALL be the full domain `www.ctbcinvestments.com.tw` (including `.tw`). The `StartDate` field SHALL be a dash-formatted date (`YYYY-MM-DD`) — the caller-supplied query date when provided, otherwise the most recent Taipei-timezone trading day. The scraper SHALL NOT send an empty string as `StartDate`, because the live API responds to an empty `StartDate` with `ResultCode: 1` and no holdings data (verified 2026-07-12).

Holdings SHALL be parsed from the response structure `Data.FundAssetsDetail`, which is a list of sections each carrying a `Code` field; the scraper SHALL select the section whose `Code == "STOCK"` and iterate its `Data` list, mapping per-item fields `code_` → code, `name_` → name, `weights_` → weight percentage, and `qty_` → shares (stripping thousands-separator commas before numeric conversion).

On any failure — HTTP error, `ResultCode != 0`, missing or empty STOCK section — the scraper SHALL return an empty holdings list without raising, so `multi_etf_step` falls back to `pocket_scraper` via the existing fallback chain.

#### Scenario: Successful fetch on a trading day

- **WHEN** `fetch_holdings("00995A")` is called on a trading day and the CTBC API returns a STOCK section with items
- **THEN** the function returns a non-empty DataFrame with columns `code`, `name`, `weight`, `shares`, where shares values have thousands-separator commas removed

#### Scenario: StartDate is never empty

- **WHEN** the scraper builds the `ETFHoldingWeight` request without a caller-supplied date
- **THEN** the request body contains `StartDate` equal to the most recent Taipei-timezone trading day in `YYYY-MM-DD` format, not an empty string

#### Scenario: API returns ResultCode 1 — fallback preserved

- **WHEN** the `ETFHoldingWeight` response carries `ResultCode: 1` or an empty STOCK section
- **THEN** the scraper returns an empty holdings list without raising, and `multi_etf_step` falls back to `pocket_scraper`


<!-- @trace
source: fix-ctbc-rest-and-cathay-nav
updated: 2026-07-12
code:
  - ETF/CLAUDE.md
  - ETF/scrapers/official_api_scraper.py
tests:
  - ETF/tests/test_new_scrapers.py
-->

---
### Requirement: CTBC REST scraper extracts fund asset summary from the same response

The scraper SHALL extract the fund asset summary from `Data.FundAssets[0]` of the same `ETFHoldingWeight` response used for holdings, without issuing any additional HTTP request. Field mapping (keys verified against the live response on 2026-07-12, including Chinese-language keys): `基金淨資產` → aum, `基金每單位淨值` → nav, `基金在外流通單位數` → units, and `NAV_DT` truncated at the `T` separator → nav_date. The mapped values SHALL pass through the existing `_fund_assets_or_none()` construction and aum ≈ nav × units consistency check before being returned alongside holdings from `_dispatch`.

When `FundAssets` is absent, empty, or unparseable, the scraper SHALL return a null fund asset summary and SHALL still return the parsed holdings.

#### Scenario: Fund assets parsed alongside holdings

- **WHEN** the `ETFHoldingWeight` response contains `FundAssets[0]` with the Chinese-language asset keys and `NAV_DT: "2026-07-09T00:00:00"`
- **THEN** `fetch_holdings("00995A")` returns a DataFrame whose `attrs["fund_assets"]` carries numeric aum, nav, units and `nav_date == "2026-07-09"`

#### Scenario: Missing FundAssets does not affect holdings

- **WHEN** the response contains a valid STOCK section but no usable `FundAssets` entry
- **THEN** the scraper returns the parsed holdings with a null fund asset summary, and no exception propagates

<!-- @trace
source: fix-ctbc-rest-and-cathay-nav
updated: 2026-07-12
code:
  - ETF/CLAUDE.md
  - ETF/scrapers/official_api_scraper.py
tests:
  - ETF/tests/test_new_scrapers.py
-->