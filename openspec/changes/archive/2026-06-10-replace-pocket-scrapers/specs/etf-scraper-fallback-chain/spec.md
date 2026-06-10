## MODIFIED Requirements

### Requirement: Secondary ETF scraping uses a three-layer fallback chain

`MultiEtfStep` SHALL attempt to fetch holdings for each secondary ETF using the following ordered strategy: (1) `official_api_scraper`, (2) `moneydj_scraper`, (3) `pocket_scraper`. The step SHALL stop at the first successful layer and SHALL NOT attempt subsequent layers once data is obtained. ETFs 00400A, 00401A, 00983A, 00989A, and 00996A SHALL be registered in `CATALOG` within `official_api_scraper.py` with `source="official_api"` so that layer 1 is attempted first for these ETFs. ETF 00998A SHALL remain registered with `source="pocket"` and SHALL continue to use layer 3 directly.

#### Scenario: Official API succeeds

- **WHEN** `official_api_scraper.fetch_holdings(etf_code)` returns a non-empty DataFrame
- **THEN** the step records `source="official_api"` in the result and skips layers 2 and 3

#### Scenario: Official API fails, MoneyDJ succeeds

- **WHEN** `official_api_scraper.fetch_holdings(etf_code)` raises an exception or returns empty
- **AND** `moneydj_scraper.scrape_holdings(etf_code)` returns a non-empty DataFrame
- **THEN** the step records `source="moneydj"` and `used_fallback=True` in the result and skips layer 3

#### Scenario: Both official and MoneyDJ fail, Pocket succeeds

- **WHEN** layers 1 and 2 both fail
- **AND** `pocket_scraper.scrape_holdings(etf_code)` returns a non-empty DataFrame
- **THEN** the step records `source="pocket"` and `used_fallback=True` in the result

#### Scenario: All three layers fail

- **WHEN** all three scrapers raise exceptions or return empty DataFrames
- **THEN** the step logs an error for that ETF and continues to the next ETF (SHALL NOT abort the pipeline)

#### Scenario: 00400A uses official Cathay REST API

- **WHEN** `fetch_holdings("00400A")` is called via layer 1
- **THEN** `_fetch_cathay("EA")` is dispatched and returns holdings without Pocket.tw involvement

#### Scenario: 00401A and 00989A use JPM XLSX

- **WHEN** `fetch_holdings("00401A")` or `fetch_holdings("00989A")` is called via layer 1
- **THEN** `_fetch_jpm(xlsx_url)` is dispatched using the ETF-specific XLSX URL

#### Scenario: 00983A uses CTBC HTML scraper

- **WHEN** `fetch_holdings("00983A")` is called via layer 1
- **THEN** `_fetch_ctbc_html("00983A")` is dispatched, not the auth-token `_fetch_ctbc()` used for 00995A

#### Scenario: 00996A uses Mega HTML scraper with fund_id=23

- **WHEN** `fetch_holdings("00996A")` is called via layer 1
- **THEN** `_fetch_mega("23")` is dispatched successfully without fallback to Pocket

##### Example: CATALOG source mapping after this change

| ETF code | issuer | source in registry | Notes |
|----------|--------|-------------------|-------|
| 00400A | cathay | official_api | New |
| 00401A | jpm | official_api | New |
| 00983A | ctbc_html | official_api | New |
| 00989A | jpm | official_api | New |
| 00996A | mega | official_api | fund_id=23 filled |
| 00998A | fhtrust | pocket | Unchanged |
