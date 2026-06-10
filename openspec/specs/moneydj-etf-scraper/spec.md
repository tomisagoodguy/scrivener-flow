# moneydj-etf-scraper Specification

## Purpose

Provides a MoneyDJ-based ETF holdings scraper as a fallback data source when Pocket.tw is unavailable. Implemented in `ETF/scrapers/moneydj_scraper.py` and integrated into `multi_etf_step.py`.

## Requirements

### Requirement: MoneyDJ scraper fetches all holdings via curl

`ETF/scrapers/moneydj_scraper.py` SHALL fetch the full holdings page for a given ETF code from MoneyDJ `Basic0007B.xdjhtm?etfid={code}.TW` using a subprocess `curl` call with a Chrome User-Agent string. The function SHALL verify that `curl` is available on the system PATH before executing; if not found, it SHALL raise a `RuntimeError` with a descriptive message.

#### Scenario: Successful fetch returns HTML

- **WHEN** `fetch_html(etfid)` is called with a valid ETF code (e.g., `"00998A"`)
- **THEN** the function returns the raw HTML string from MoneyDJ

#### Scenario: curl not found on PATH

- **WHEN** `shutil.which("curl")` returns `None`
- **THEN** the function raises `RuntimeError("curl not found on PATH")`

#### Scenario: curl returns non-zero exit code

- **WHEN** `curl` exits with a non-zero return code
- **THEN** the function raises `RuntimeError` containing the ETF code and exit code

---
### Requirement: MoneyDJ parser extracts data_date and holdings

`parse_html(html_text, etfid)` SHALL extract:
- `data_date` from the `sdate3` pattern matching `\d{4}/\d{2}/\d{2}`, normalized to `YYYY-MM-DD` format
- `fund_name` from `<title>` tag (text before `-{etfid}.TW`)
- All holdings rows matching the `col05/col06/col07` CSS class pattern, extracting: ticker code, stock name (HTML-unescaped, parenthetical exchange suffix removed), weight percentage (`float`), shares (`int`, commas stripped)

The function SHALL raise `RuntimeError` if `data_date` cannot be found. The function SHALL raise `RuntimeError` if the holdings list is empty after parsing.

#### Scenario: Full page parsed successfully

- **WHEN** `parse_html(html, "00998A")` is called with a valid MoneyDJ holdings page
- **THEN** the result is a dict with keys `etfid`, `fund_name`, `data_date` (YYYY-MM-DD), `holdings` (non-empty dict keyed by ticker)

#### Scenario: Holdings name cleaned of exchange suffix

- **WHEN** a holding row contains name `"台積電(2330.TW)"`
- **THEN** `holdings["2330"]["name"]` equals `"台積電"` (suffix removed)

#### Scenario: date not found in HTML

- **WHEN** the HTML does not contain the `sdate3` pattern
- **THEN** `parse_html` raises `RuntimeError` with the ETF code in the message

#### Scenario: No holdings rows parsed

- **WHEN** the regex finds zero matching rows (e.g., page structure changed)
- **THEN** `parse_html` raises `RuntimeError` indicating no holdings found

---
### Requirement: MoneyDJ scraper returns standardized DataFrame

`scrape_moneydj(etfid)` SHALL call `fetch_html` then `parse_html`, and return a `pandas.DataFrame` with columns: `stock_code`, `stock_name`, `shares`, `weight_pct`, and a `data_date` attribute on the DataFrame (or as a separate return value). On any exception, the function SHALL return `None` and log the error via the module logger; it SHALL NOT re-raise.

#### Scenario: Successful scrape returns DataFrame

- **WHEN** `scrape_moneydj("00998A")` is called and MoneyDJ is reachable
- **THEN** the function returns a DataFrame with at least one row and columns `stock_code`, `stock_name`, `shares`, `weight_pct`

#### Scenario: Network or parse failure returns None

- **WHEN** `fetch_html` raises a `RuntimeError`
- **THEN** `scrape_moneydj` returns `None` and logs an error message

---
### Requirement: MultiEtfStep falls back to MoneyDJ when Pocket.tw fails

`multi_etf_step.py` SHALL, for each secondary ETF, execute the three-layer fallback chain defined in `etf-scraper-fallback-chain`: (1) `official_api_scraper`, (2) `moneydj_scraper`, (3) `pocket_scraper`. The previous behavior of calling only Pocket.tw first (for `source='pocket'` ETFs) is superseded by the unified three-layer chain. The step SHALL record `source` and `used_fallback` per ETF in `ctx.scrape_results`. If all three layers return `None` or raise exceptions, the ETF SHALL be logged as skipped for that run (no exception propagates, no partial data is written).

#### Scenario: official_api succeeds (layer 1)

- **WHEN** `official_api_scraper.fetch_holdings(etf_code)` returns a non-empty DataFrame
- **THEN** the step saves the data and records `source="official_api"`, `used_fallback=False`

#### Scenario: official_api fails, MoneyDJ succeeds (layer 2)

- **WHEN** `official_api_scraper.fetch_holdings(etf_code)` raises an exception or returns empty
- **AND** `moneydj_scraper.scrape_holdings(etf_code)` returns a valid DataFrame
- **THEN** the step saves the data and records `source="moneydj"`, `used_fallback=True`

#### Scenario: official_api and MoneyDJ fail, Pocket succeeds (layer 3)

- **WHEN** layers 1 and 2 both fail
- **AND** `pocket_scraper.scrape_holdings(etf_code)` returns a valid DataFrame
- **THEN** the step saves the data and records `source="pocket"`, `used_fallback=True`

#### Scenario: All three layers fail

- **WHEN** all three scrapers return `None` or raise exceptions
- **THEN** the ETF is logged as skipped with the reason for each layer failure; no exception propagates and no partial data is written

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