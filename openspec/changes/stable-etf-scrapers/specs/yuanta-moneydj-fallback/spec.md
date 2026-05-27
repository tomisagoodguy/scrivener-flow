## ADDED Requirements

### Requirement: MoneyDJ HTML fallback for 00990A when Playwright fails

The system SHALL provide a `_fetch_moneydj_fallback(etf_code: str) -> pd.DataFrame` function in `ETF/scrapers/yuanta_scraper.py` that fetches holdings from MoneyDJ as a secondary source.

The fallback SHALL issue a GET request to `https://www.moneydj.com/ETF/X/Basic/Basic0007B.xdjhtm?etfid={etf_code}.TW` with standard browser User-Agent headers and SSL verification disabled (MoneyDJ uses a self-signed cert).

The fallback SHALL parse the response HTML with BeautifulSoup:
- Locate the `<table class="datalist">` element
- For each `<tr>` row (skip header), extract: stock code (column 0), stock name (column 1), weight percentage (column 2 or last column, strip `%`)
- The fallback SHALL set `shares=0` for all rows (MoneyDJ does not publish share counts)
- Only rows where stock code matches `^\d{4,6}$` SHALL be kept

The `fetch_holdings()` function SHALL trigger the MoneyDJ fallback under any of these conditions:
1. Playwright raises any exception during page navigation or evaluation
2. `window.__NUXT__` evaluates to `None` or empty
3. `_extract_stock_weights()` returns `None` or a list with fewer than 3 items

When the fallback is triggered, a warning SHALL be logged stating the reason (e.g., `"[Yuanta] Playwright failed, falling back to MoneyDJ"`).

#### Scenario: Playwright failure triggers fallback

- **WHEN** Playwright raises a `TimeoutError` loading the Yuanta page
- **THEN** `_fetch_moneydj_fallback("00990A")` is called automatically and its result is returned

#### Scenario: __NUXT__ too small triggers fallback

- **WHEN** `_extract_stock_weights()` returns a list with 2 items (< 3)
- **THEN** `_fetch_moneydj_fallback("00990A")` is called and a warning is logged with the count

#### Scenario: MoneyDJ fallback returns shares=0

- **WHEN** MoneyDJ fallback is used successfully
- **THEN** the returned DataFrame has `shares=0` for all rows and `weight > 0` for valid holdings

#### Scenario: Both Playwright and MoneyDJ fail

- **WHEN** Playwright fails and the MoneyDJ GET request also raises an exception
- **THEN** an empty DataFrame is returned and both errors are logged

##### Example: Fallback trigger conditions

| Condition | Fallback triggered? |
|---|---|
| Playwright succeeds, `__NUXT__` has 53 stocks | No |
| Playwright succeeds, `__NUXT__` has 2 stocks | Yes |
| Playwright raises TimeoutError | Yes |
| `window.__NUXT__` is None | Yes |
