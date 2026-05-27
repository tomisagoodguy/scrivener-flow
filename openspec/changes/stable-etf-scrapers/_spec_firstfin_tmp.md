## ADDED Requirements

### Requirement: Fetch 00994A holdings via First Financial REST API

The system SHALL fetch complete holdings for ETF 00994A (主動第一金台股優) by issuing a POST request to `https://www.fsitc.com.tw/WebAPI.aspx/Get_hd` with JSON body `{"pStrFundID": "182", "pStrDate": ""}`. An empty `pStrDate` string SHALL cause the API to return the latest available data.

The system SHALL parse the response as follows:
- The outer response body is JSON with a `"d"` field containing a JSON string
- The `"d"` field SHALL be parsed with a second `json.loads()` call
- Each holding record SHALL contain stock code, stock name, share count, and weight percentage fields (exact field names to be confirmed against live response)

The function SHALL be integrated into `ETF/scrapers/official_api_scraper.py` as `_fetch_first_financial(fund_id: str) -> list[dict]` and SHALL be registered in the CATALOG under key `"00994A"` with `issuer="first_financial"` and `fund_code="182"`.

The function SHALL return a `pd.DataFrame` with columns `code(str), name(str), shares(int), weight(float)` via the existing `fetch_holdings()` dispatcher. On any exception it SHALL return an empty DataFrame.

#### Scenario: Successful REST API call

- **WHEN** `fetch_holdings("00994A")` is called and the API returns a valid JSON response
- **THEN** a non-empty DataFrame is returned with correct code, name, shares, and weight values

#### Scenario: API returns non-JSON or error status

- **WHEN** the POST request fails or the response cannot be parsed as JSON
- **THEN** an empty DataFrame is returned and the error is logged

#### Scenario: Double JSON decode

- **WHEN** the API response has `{"d": "<json-string>"}` structure
- **THEN** the inner JSON string is decoded correctly into a list of holding records

##### Example: Double-decode

- **GIVEN** API response body: `{"d": "[{\"stockCode\":\"2330\",\"stockName\":\"台積電\",\"shares\":500000,\"weight\":5.2}]"}`
- **WHEN** `_fetch_first_financial("182")` is called
- **THEN** returns one record with `{code: "2330", name: "台積電", shares: 500000, weight: 5.2}`
