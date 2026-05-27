## ADDED Requirements

### Requirement: Fetch 00995A holdings via CTBC two-step authenticated REST API

The system SHALL fetch complete holdings for ETF 00995A (主動中信台灣卓越) using a two-step process:

**Step 1 — Obtain auth token:**
POST `https://www.ctbcinvestments.com.tw/API/home/AuthToken` with body `{"token": "www.ctbcinvestments.com"}`. The response JSON SHALL contain `Data.token` (string). The token SHALL be obtained fresh on every holdings fetch and SHALL NOT be cached between pipeline runs.

**Step 2 — Fetch holdings:**
POST `https://www.ctbcinvestments.com.tw/API/etf/ETFHoldingWeight` with body `{"token": <token>, "FID": "E0036", "StartDate": ""}`. The response SHALL be parsed at `Data.FundAssetsDetail`, filtered to records where the asset code field equals `"STOCK"`.

Each holding record SHALL expose: stock code, stock name, share count, and weight percentage.

The function SHALL be integrated into `ETF/scrapers/official_api_scraper.py` as `_fetch_ctbc(fid: str) -> list[dict]` and registered in CATALOG under `"00995A"` with `issuer="ctbc"` and `fund_code="E0036"`.

On token fetch failure the system SHALL raise immediately so the outer `fetch_holdings()` catches it and returns an empty DataFrame. On holdings fetch failure the system SHALL similarly raise.

#### Scenario: Successful two-step fetch

- **WHEN** `fetch_holdings("00995A")` is called and both API calls succeed
- **THEN** a non-empty DataFrame with stock-only holdings is returned

#### Scenario: Auth token request fails

- **WHEN** the AuthToken POST request returns an HTTP error or the response lacks `Data.token`
- **THEN** an empty DataFrame is returned and the error is logged

#### Scenario: Non-STOCK assets filtered out

- **WHEN** the FundAssetsDetail list contains both STOCK and BOND records
- **THEN** only STOCK records appear in the returned DataFrame

##### Example: Asset type filtering

- **GIVEN** FundAssetsDetail: `[{assetCode: "STOCK", stockCode: "2330", weight: 5.0}, {assetCode: "BOND", stockCode: "TW1234", weight: 2.0}]`
- **WHEN** `_fetch_ctbc("E0036")` is called
- **THEN** returns only `{code: "2330", weight: 5.0}`, the BOND record is excluded
