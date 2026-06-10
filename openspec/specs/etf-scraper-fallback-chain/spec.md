# etf-scraper-fallback-chain Specification

## Purpose

TBD — Defines the three-layer fallback strategy for secondary ETF scraping in `MultiEtfStep`: official API → MoneyDJ → Pocket.tw. Ensures data is obtained from the most reliable available source and results are recorded in pipeline context.

## Requirements

### Requirement: Secondary ETF scraping uses a three-layer fallback chain

`MultiEtfStep` SHALL attempt to fetch holdings for each secondary ETF using the following ordered strategy: (1) `official_api_scraper`, (2) `moneydj_scraper`, (3) `pocket_scraper`. The step SHALL stop at the first successful layer and SHALL NOT attempt subsequent layers once data is obtained.

The `official_api_scraper` CATALOG SHALL include dispatch entries for the following issuers: `uni`, `fhtrust`, `nomura`, `allianz`, `capital`, `yuanta`, `taishin`, `first_financial`, `ctbc`, `mega`, `cathay`, `morgan`, `alliance_bernstein`, `fubon`.

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

---
### Requirement: Fallback results are recorded in pipeline context

After each ETF is scraped, the step SHALL append an entry to `ctx.scrape_results` containing `{ etf_code, source, used_fallback, data_date }`.

#### Scenario: Context records fallback usage

- **WHEN** an ETF is fetched via a non-primary layer
- **THEN** `ctx.scrape_results[etf_code].used_fallback` is `True`
- **AND** `ctx.scrape_results[etf_code].source` is `"moneydj"` or `"pocket"`

##### Example: fallback source values

| Layer used | source value | used_fallback |
|------------|-------------|---------------|
| official_api | "official_api" | False |
| moneydj | "moneydj" | True |
| pocket | "pocket" | True |

<!-- @trace
source: etf-scraper-resilience
updated: 2026-06-10
code:
  - ETF/pipeline/orchestrator.py
  - ETF/pipeline/signals.py
  - ETF/pipeline/steps/multi_etf_step.py
  - ETF/parsers/xlsx_parser.py
  - ETF/parsers/__pycache__/xlsx_parser.cpython-313.pyc
  - ETF/pipeline/context.py
  - ETF/pipeline/steps/base.py
  - ETF/pipeline/steps/__init__.py
  - ETF/pipeline/steps/check_trade_date_step.py
-->
