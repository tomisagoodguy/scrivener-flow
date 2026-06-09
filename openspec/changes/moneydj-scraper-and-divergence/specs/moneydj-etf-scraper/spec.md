## ADDED Requirements

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

`multi_etf_step.py` SHALL, for each ETF with `source='pocket'`, first attempt the Pocket.tw scraper. If the Pocket.tw scraper returns `None` or raises an exception, it SHALL attempt `scrape_moneydj(etfid)`. If MoneyDJ also returns `None`, the ETF SHALL be logged as skipped for that run (existing behavior).

#### Scenario: Pocket fails, MoneyDJ succeeds

- **WHEN** `pocket_scraper.scrape(etfid)` returns `None`
- **AND** `moneydj_scraper.scrape_moneydj(etfid)` returns a valid DataFrame
- **THEN** the ETF holdings are saved using the MoneyDJ data and a warning log entry is written noting the fallback

#### Scenario: Both Pocket and MoneyDJ fail

- **WHEN** both scrapers return `None`
- **THEN** the ETF is logged as skipped; no exception propagates and no partial data is written
