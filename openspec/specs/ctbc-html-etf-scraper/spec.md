# ctbc-html-etf-scraper Specification

## Purpose

TBD — Defines the HTML scraper for CTBC ETF 00983A holdings, parsing the ASP.NET disclosure page at `ctbcinvestments.com.tw`. This is distinct from the existing auth-token REST scraper used for 00995A.

## Requirements

### Requirement: CTBC HTML scraper parses ASP.NET holdings page for 00983A

The system SHALL fetch the ASP.NET page at `https://www.ctbcinvestments.com.tw/CTWEB/Content/ETF/pcd.aspx?ETF_ID={etf_code}` without authentication and parse holdings from HTML `<tr><td>` rows. The scraper SHALL extract the disclosure date from the element with `id="Label_AUM01"`. Holdings rows SHALL contain exactly 4 `<td>` cells in order: code, name, shares, weight. The scraper SHALL be implemented as `_fetch_ctbc_html(etf_code)` in `ETF/scrapers/official_api_scraper.py` and SHALL coexist with the existing `_fetch_ctbc()` function which handles 00995A via a separate auth-token REST API. The `issuer` key in `CATALOG` for 00983A SHALL be `"ctbc_html"` to distinguish it from `"ctbc"` (00995A).

#### Scenario: successful HTML parse returns holdings

- **WHEN** `fetch_holdings("00983A")` is called
- **THEN** the scraper fetches the ASP.NET page, finds `<tr>` rows with 4 cells, and returns a non-empty DataFrame

#### Scenario: issuer routing distinguishes 00983A from 00995A

- **WHEN** `_dispatch("ctbc_html", ...)` is called
- **THEN** it calls `_fetch_ctbc_html()`, not `_fetch_ctbc()` (the auth-token variant)

#### Scenario: disclosure date extracted from Label_AUM01

- **WHEN** the page contains `<span id="Label_AUM01">2026/04/21</span>`
- **THEN** the scraper captures `"2026/04/21"` as the disclosure date (logged only; not returned in DataFrame)

#### Scenario: SSL verification disabled for CTBC domain

- **WHEN** `_fetch_ctbc_html()` makes the HTTP request
- **THEN** it uses `verify_ssl=False` consistent with other CTBC scraper calls in `official_api_scraper.py`

---

### Requirement: CTBC ARK ETF holdings fetched via official API

The system SHALL fetch 00983A (中信 ARK 創新) holdings using the existing CTBC two-step authenticated REST API (`_fetch_ctbc()`), with its fund ID (FID) configured in CATALOG.

The system SHALL set the `source` field of 00983A to `official_api` in `ETF/config/etf_registry.py` and `src/lib/investment/etfRegistry.ts`.

If the CTBC API returns empty data or FID is not confirmed, the system SHALL fall back to the existing Pocket.tw scraper via the fallback chain.

#### Scenario: Successful CTBC API fetch for 00983A

- **WHEN** `official_api_scraper.fetch_holdings("00983A")` is called
- **THEN** the function returns a DataFrame with columns `code`, `name`, `weight`, `shares` containing at least one row with a valid 4-to-6-digit `code`

#### Scenario: CTBC API returns empty — fallback to Pocket

- **WHEN** the CTBC two-step API returns an empty `FundAssetsDetail` list
- **THEN** `fetch_holdings()` returns an empty DataFrame, and `multi_etf_step` falls back to `pocket_scraper`

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