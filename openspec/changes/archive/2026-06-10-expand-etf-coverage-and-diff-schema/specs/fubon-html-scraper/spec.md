## ADDED Requirements

### Requirement: Fubon ETF 00982D and 00983D added to registry and fetched via HTML parsing

The system SHALL add 00982D (富邦動態入息) and 00983D (富邦複合收益) to `ETF/config/etf_registry.py` and `src/lib/investment/etfRegistry.ts` with `source: "official_api"`.

The system SHALL implement `_fetch_fubon()` in `ETF/scrapers/official_api_scraper.py` that performs a GET request to the Fubon Asset Management product page and parses the holdings table using BeautifulSoup. The parser SHALL locate the holdings section by finding an `<h6>` element whose text contains "持股明細" and reading the subsequent `<tbody>` rows.

Each `<tr>` row SHALL be parsed as `{code, name, shares, weight_pct}` where the columns are: [0] 代號, [1] 名稱, [2] 股數, [3] 權重(%).

Rows where `code` does not match `r'^\d{4,6}$'` SHALL be skipped.

#### Scenario: Successful Fubon HTML parse for 00982D

- **WHEN** `official_api_scraper.fetch_holdings("00982D")` is called
- **THEN** the function returns a DataFrame with at least one row where `code` is a 4-to-6-digit string and `weight` is positive

#### Scenario: Successful Fubon HTML parse for 00983D

- **WHEN** `official_api_scraper.fetch_holdings("00983D")` is called
- **THEN** the function returns a DataFrame equivalent in structure to 00982D

#### Scenario: Holdings section not found in HTML

- **WHEN** the page HTML does not contain an `<h6>` with "持股明細"
- **THEN** `_fetch_fubon()` logs a warning and returns an empty list; `fetch_holdings()` returns an empty DataFrame without raising
