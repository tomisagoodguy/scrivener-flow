# 981a-json-scrape Specification

## Purpose

TBD - created by archiving change 'etf-981a-json-scraper'. Update Purpose after archive.

## Requirements

### Requirement: HTML page JSON extraction

The scraper SHALL fetch the ezmoney fund info HTML page (`https://www.ezmoney.com.tw/ETF/Fund/Info?FundCode=49YTW`) using `requests.Session` and extract holdings data from the `<div id="DataAsset" ... data-content="...">` attribute value without downloading any binary file.

#### Scenario: Successful JSON extraction

- **WHEN** the HTML page is fetched and the `div#DataAsset` element contains a valid `data-content` attribute
- **THEN** the scraper SHALL HTML-unescape the attribute value, JSON-parse it, and return a populated holdings DataFrame with `stock_code`, `stock_name`, `shares`, `weight` columns and a `data_date` string in `YYYY-MM-DD` format

##### Example: data-content round-trip

- **GIVEN** `data-content` attribute value is `&lt;holdings&gt;...` (HTML-escaped JSON array)
- **WHEN** the scraper processes the attribute
- **THEN** it SHALL unescape to valid JSON and parse it into a DataFrame with at least 1 row

#### Scenario: Missing or empty data-content attribute

- **WHEN** the HTML page is fetched but the `div#DataAsset` element is absent or its `data-content` attribute is empty
- **THEN** the method SHALL return `(None, None)` and log a warning without raising an exception

#### Scenario: Non-200 HTTP response

- **WHEN** the HTTP request returns a non-2xx status code
- **THEN** the method SHALL return `(None, None)` and log a warning without raising an exception


<!-- @trace
source: etf-981a-json-scraper
updated: 2026-05-09
code:
  - ETF/processors/__pycache__/diff_engine.cpython-313.pyc
  - ETF/scrapers/__pycache__/fhtrust_scraper.cpython-313.pyc
  - next-env.d.ts
  - ETF/scrapers/__pycache__/unified_scraper.cpython-313.pyc
-->

---
### Requirement: Excel XLSX as fallback

When JSON extraction fails, `FhTrustScraper` SHALL fall back to the existing Excel download path (`unified_scraper.download_file` → `xlsx_parser.parse_holdings_xlsx`) to maintain backward compatibility.

#### Scenario: JSON fails, Excel succeeds

- **WHEN** `_try_json_scrape()` returns `(None, None)`
- **THEN** `FhTrustScraper.run()` SHALL attempt the Excel download and return the parsed DataFrame and date string if successful

#### Scenario: Both paths fail

- **WHEN** both JSON extraction and Excel download return `(None, None)`
- **THEN** `FhTrustScraper.run()` SHALL return `(None, None)` so that `ScrapeStep` can apply its own higher-level fallback chain without crashing


<!-- @trace
source: etf-981a-json-scraper
updated: 2026-05-09
code:
  - ETF/processors/__pycache__/diff_engine.cpython-313.pyc
  - ETF/scrapers/__pycache__/fhtrust_scraper.cpython-313.pyc
  - next-env.d.ts
  - ETF/scrapers/__pycache__/unified_scraper.cpython-313.pyc
-->

---
### Requirement: Regex-based attribute extraction

The JSON scraper SHALL use a regex pattern to locate the `data-content` attribute value inside the raw HTML string, not rely on a full HTML parser, to minimize dependencies.

#### Scenario: Regex matches attribute in raw HTML

- **WHEN** the raw HTML contains `id="DataAsset"` with a `data-content` attribute on the same or adjacent element
- **THEN** the regex SHALL capture the full attribute value, including any HTML-escaped characters

##### Example: regex boundary cases

| Raw HTML fragment | Expected outcome |
|---|---|
| `<div id="DataAsset" data-content="[{&quot;code&quot;:&quot;2330&quot;}]">` | captured: `[{&quot;code&quot;:&quot;2330&quot;}]` |
| `<div id="DataAsset">` (no attribute) | returns `None` |
| `<div id="OtherAsset" data-content="...">` | no match (wrong id) |


<!-- @trace
source: etf-981a-json-scraper
updated: 2026-05-09
code:
  - ETF/processors/__pycache__/diff_engine.cpython-313.pyc
  - ETF/scrapers/__pycache__/fhtrust_scraper.cpython-313.pyc
  - next-env.d.ts
  - ETF/scrapers/__pycache__/unified_scraper.cpython-313.pyc
-->

---
### Requirement: No Playwright dependency for JSON path

The JSON extraction path SHALL NOT require Playwright or any headless browser. `unified_scraper.download_file_playwright` SHALL remain available only as part of the Excel fallback path.

#### Scenario: JSON path execution environment

- **WHEN** the JSON scrape path runs in a CI environment without Playwright installed
- **THEN** it SHALL complete successfully (or fail gracefully to the Excel path) without importing or invoking Playwright

<!-- @trace
source: etf-981a-json-scraper
updated: 2026-05-09
code:
  - ETF/processors/__pycache__/diff_engine.cpython-313.pyc
  - ETF/scrapers/__pycache__/fhtrust_scraper.cpython-313.pyc
  - next-env.d.ts
  - ETF/scrapers/__pycache__/unified_scraper.cpython-313.pyc
-->