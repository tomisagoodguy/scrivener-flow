## ADDED Requirements

### Requirement: Fetch stock news from MoneyDJ

The system SHALL fetch recent news articles for a given Taiwan stock code from MoneyDJ by parsing the HTML listing at `https://www.moneydj.com/KMDJ/News/NewsViewer.aspx?a={stock_code}`.

The system SHALL return a list of news items, each containing: `stock_code`, `title`, `url`, `pub_date`, `source`.

The system SHALL set `source` to `"MoneyDJ"` for all returned items.

The system SHALL limit results to the most recent 10 articles per stock.

The system SHALL silently return an empty list if the HTTP request fails, the HTML structure changes, or parsing errors occur.

The system SHALL include a 0.3-second delay between consecutive stock requests.

#### Scenario: Successfully fetch MoneyDJ news for a valid stock code

- **WHEN** `fetch_moneydj_news(["2330"])` is called
- **THEN** the function returns a list of dicts with keys `stock_code`, `title`, `url`, `pub_date`, `source`
- **THEN** `source` equals `"MoneyDJ"` for all items
- **THEN** `url` starts with `"https://www.moneydj.com/"`

#### Scenario: Graceful degradation when HTML structure changes

- **WHEN** the MoneyDJ page HTML lacks expected CSS selectors or table structure
- **THEN** the function returns an empty list without raising an exception
- **THEN** a warning is logged

#### Scenario: Graceful degradation on HTTP error

- **WHEN** the MoneyDJ server returns HTTP 4xx or 5xx
- **THEN** the function logs a warning and returns an empty list for that stock
