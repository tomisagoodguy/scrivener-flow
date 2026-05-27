## ADDED Requirements

### Requirement: Fetch 00986A holdings via Mega Funds official HTML page

The system SHALL fetch complete holdings for ETF 00986A (主動兆豐台灣主動) by issuing a GET request to `https://www.megafunds.com.tw/MEGA/etf/etf_product.aspx?id={fund_id}` and parsing the server-side rendered HTML with BeautifulSoup.

The CATALOG entry for `"00986A"` SHALL include a `fund_id` field. If `fund_id` is `None` or empty, the function SHALL immediately return an empty DataFrame and log a warning (rather than raising), so that the fallback to `pocket_scraper` is triggered by the existing `multi_etf_step` logic.

The fetcher SHALL extract:
- Data date by searching for the first regex match of `(\d{4})/(\d{2})/(\d{2})` in the page text, converted to `YYYY-MM-DD`
- Holdings by locating `<div id="fund_content_list_1">` and iterating all child `<div class="fund-info">` elements
- Within each `fund-info` div, the four columns of `<div class="fund-content">` yield: stock code, stock name, share count (remove commas), weight percentage (remove `%`)
- Only records whose stock code matches `^\d{4,6}$` SHALL be kept

#### Scenario: fund_id not configured

- **WHEN** `_fetch_mega(fund_id=None)` is called
- **THEN** returns an empty DataFrame and logs a warning containing "fund_id not configured"

#### Scenario: Successful fetch with known fund_id

- **WHEN** `_fetch_mega(fund_id="<valid_id>")` is called and the page returns valid HTML
- **THEN** a non-empty DataFrame with columns `code, name, shares, weight` is returned

#### Scenario: Holdings container absent

- **WHEN** the page responds but `<div id="fund_content_list_1">` is missing
- **THEN** an empty DataFrame is returned and a warning is logged

##### Example: fund_id None guard

- **GIVEN** CATALOG entry `"00986A"` has `fund_id=None`
- **WHEN** `fetch_holdings("00986A")` is called
- **THEN** returns empty DataFrame without making any HTTP request, logs `"[MEGA] fund_id not configured for 00986A"`
