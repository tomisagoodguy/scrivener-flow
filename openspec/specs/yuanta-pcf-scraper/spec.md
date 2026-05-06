# Spec: yuanta-pcf-scraper

## Purpose

Fetch the complete PCF (Portfolio Creation File) holdings for Yuanta ETF 00990A from the official Yuanta ETF website via Playwright headless browser, and register 00990A in the pipeline's ETF registries so that scraping is dispatched to the official API path instead of pocket_scraper.

---

## Requirements

### Requirement: Fetch complete PCF holdings from Yuanta official website

The system SHALL fetch the complete PCF (Portfolio Creation File) holdings for ETF 00990A from the Yuanta ETF official website by launching a headless Chromium browser via Playwright, navigating to `https://www.yuantaetfs.com/tradeInfo/pcf/{etf_code}`, waiting for JavaScript to hydrate the Nuxt SSR state, and extracting `window.__NUXT__.data[].pcfData.FundWeights.StockWeights`.

The scraper SHALL return a `pd.DataFrame` with columns `code` (str), `name` (str), `shares` (int), `weight` (float, percent).

On any error or empty result, the scraper SHALL return an empty `pd.DataFrame` and MUST NOT raise an exception.

#### Scenario: Successful extraction of full holdings

- **WHEN** the Yuanta PCF page is navigated and Nuxt state is hydrated
- **THEN** the scraper returns a DataFrame with all holdings (typically 40–60 rows) where every row has a non-empty `code`, numeric `weight > 0`, and non-negative `shares`

##### Example: stock code cleanup

| Raw code from NUXT (s.code) | Expected `code` in DataFrame |
|-----------------------------|------------------------------|
| `"2330 TW"` | `"2330"` |
| `"2330"` | `"2330"` |
| `"LITE US"` | `"LITE"` |

#### Scenario: Empty NUXT state or missing pcfData

- **WHEN** `window.__NUXT__` is undefined or `pcfData.FundWeights.StockWeights` is missing
- **THEN** the scraper returns an empty DataFrame without raising an exception

#### Scenario: Page load timeout

- **WHEN** the Yuanta website does not respond within 60 seconds
- **THEN** the scraper logs a warning and returns an empty DataFrame


<!-- @trace
source: upgrade-yuanta-direct-api
updated: 2026-05-06
code:
  - ETF/scrapers/official_api_scraper.py
  - ETF/scrapers/yuanta_scraper.py
  - src/lib/investment/etfRegistry.ts
  - ETF/config/etf_registry.py
  - reference/etf_scratch/
-->

---
### Requirement: Register 00990A as official_api in ETF registries

The system SHALL register 00990A with `source = "official_api"` in both `ETF/config/etf_registry.py` and `dataSource = 'official_api'` in `src/lib/investment/etfRegistry.ts` so that the pipeline dispatches to `official_api_scraper` instead of `pocket_scraper`.

#### Scenario: Pipeline dispatch for 00990A after registry update

- **WHEN** `MultiEtfStep` processes 00990A
- **THEN** it calls `official_api_scraper.fetch_holdings("00990A", ...)` and NOT `pocket_scraper.scrape_holdings("00990A")`

#### Scenario: Fallback when official API returns empty

- **WHEN** `official_api_scraper.fetch_holdings("00990A", ...)` returns an empty DataFrame
- **THEN** `MultiEtfStep` falls back to `pocket_scraper.scrape_holdings("00990A")` as before


<!-- @trace
source: upgrade-yuanta-direct-api
updated: 2026-05-06
code:
  - ETF/scrapers/official_api_scraper.py
  - ETF/scrapers/yuanta_scraper.py
  - src/lib/investment/etfRegistry.ts
  - ETF/config/etf_registry.py
  - reference/etf_scratch/
-->

---
### Requirement: Integrate yuanta scraper into official_api_scraper dispatch

The system SHALL add `"00990A"` to `official_api_scraper.CATALOG` with `issuer = "yuanta"`, and `fetch_holdings()` SHALL dispatch to `yuanta_scraper.fetch_holdings(etf_code)` when `issuer == "yuanta"`.

#### Scenario: CATALOG lookup for 00990A

- **WHEN** `official_api_scraper.fetch_holdings("00990A", ...)` is called
- **THEN** the CATALOG entry for "00990A" is found with `issuer == "yuanta"` and `yuanta_scraper` is invoked

<!-- @trace
source: upgrade-yuanta-direct-api
updated: 2026-05-06
code:
  - ETF/scrapers/official_api_scraper.py
  - ETF/scrapers/yuanta_scraper.py
  - src/lib/investment/etfRegistry.ts
  - ETF/config/etf_registry.py
  - reference/etf_scratch/
-->