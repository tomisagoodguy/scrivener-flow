## MODIFIED Requirements

### Requirement: Fetch complete PCF holdings from Yuanta official website

The system SHALL fetch the complete PCF (Portfolio Creation File) holdings for ETF 00990A from the Yuanta ETF official website by launching a headless Chromium browser via Playwright, navigating to `https://www.yuantaetfs.com/tradeInfo/pcf/{etf_code}`, waiting for JavaScript to hydrate the Nuxt SSR state, and extracting `window.__NUXT__.data[].pcfData.FundWeights.StockWeights`.

If Playwright raises any exception, `window.__NUXT__` evaluates to `None`, or the extracted stock weights list contains fewer than 3 items, the system SHALL automatically invoke `_fetch_moneydj_fallback(etf_code)` and return its result instead. A warning SHALL be logged stating the reason for the fallback.

The scraper SHALL return a `pd.DataFrame` with columns `code` (str), `name` (str), `shares` (int), `weight` (float, percent).

On any error or empty result from both Playwright and MoneyDJ fallback, the scraper SHALL return an empty `pd.DataFrame` and MUST NOT raise an exception.

#### Scenario: Successful extraction of full holdings

- **WHEN** the Yuanta PCF page is navigated and Nuxt state is hydrated
- **THEN** the scraper returns a DataFrame with all holdings (typically 40–60 rows) where every row has a non-empty `code`, numeric `weight > 0`, and non-negative `shares`

##### Example: stock code cleanup

| Raw code from NUXT (s.code) | Expected `code` in DataFrame |
|-----------------------------|------------------------------|
| `"2330 TW"` | `"2330"` |
| `"2330"` | `"2330"` |
| `"LITE US"` | `"LITE"` |

#### Scenario: Empty NUXT state or missing pcfData

- **WHEN** `window.__NUXT__` is undefined or `pcfData.FundWeights.StockWeights` is missing
- **THEN** the scraper automatically tries MoneyDJ fallback and returns its result; if MoneyDJ also fails, returns an empty DataFrame

#### Scenario: Page load timeout

- **WHEN** the Yuanta website does not respond within 60 seconds
- **THEN** the scraper logs a warning, automatically tries MoneyDJ fallback, and returns its result

#### Scenario: NUXT returns fewer than 3 stocks

- **WHEN** `_extract_stock_weights()` returns a list with 0, 1, or 2 items
- **THEN** the scraper logs a warning with the count and automatically tries MoneyDJ fallback
