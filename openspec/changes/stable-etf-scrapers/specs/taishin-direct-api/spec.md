## ADDED Requirements

### Requirement: Fetch 00987A holdings via Taishin official HTML page

The system SHALL fetch complete holdings for ETF 00987A (台新優勢成長) by issuing a GET request to `https://www.tsit.com.tw/ETF/Home/ETFSeriesDetail/00987A` and parsing the resulting server-side rendered HTML. The system SHALL NOT require Selenium or any headless browser for this ETF.

The fetcher SHALL extract:
- Data date from the `<input id="PUB_DATE">` element's `value` attribute (format YYYY-MM-DD)
- Holdings table by locating the `<th>` cell containing "代號", then reading each `<tr>` row with four `<td>` cells: stock code, stock name, shares (integer, comma-separated), weight percentage (float, strip `%`)
- Only rows whose stock code matches the pattern `^\d{4,6}$` SHALL be kept

The function SHALL return a `pd.DataFrame` with columns `code(str), name(str), shares(int), weight(float)`. On any exception it SHALL return an empty DataFrame and log the error without re-raising.

#### Scenario: Successful fetch

- **WHEN** `_fetch_taishin("00987A")` is called and the page responds with valid HTML containing the holdings table
- **THEN** a non-empty DataFrame with columns `code, name, shares, weight` is returned, data_date is populated in the YYYY-MM-DD format, and no exception is raised

#### Scenario: Page unavailable

- **WHEN** the GET request fails (HTTP error or network timeout)
- **THEN** an empty DataFrame is returned and an error is logged

#### Scenario: Table not found

- **WHEN** the page responds but contains no `<th>` element with text "代號"
- **THEN** an empty DataFrame is returned and a warning is logged

##### Example: Parsed row

| Raw HTML cell values | Expected DataFrame row |
|---|---|
| code=`2330`, name=`台積電`, shares=`1,000,000`, weight=`8.5%` | `{code: "2330", name: "台積電", shares: 1000000, weight: 8.5}` |
| code=`AAPL US`, name=`Apple`, shares=`500`, weight=`2.1%` | filtered out (non-numeric code) |
