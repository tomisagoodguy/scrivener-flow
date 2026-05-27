## ADDED Requirements

### Requirement: Fetch stock news from UDN Economic Daily

The system SHALL fetch recent news articles for a given Taiwan stock code from 經濟日報 (UDN) using the public search API endpoint `https://udn.com/api/more?page=1&id=search&type=news&kw={stock_code}`.

The system SHALL return a list of news items, each containing: `stock_code`, `title`, `url`, `pub_date`, `source`.

The system SHALL set `source` to `"經濟日報"` for all returned items.

The system SHALL limit results to the most recent 10 articles per stock.

The system SHALL silently return an empty list if the HTTP request fails, the JSON structure changes, or parsing errors occur.

The system SHALL include a 0.3-second delay between consecutive stock requests.

#### Scenario: Successfully fetch UDN news for a valid stock code

- **WHEN** `fetch_udn_news(["2330"])` is called
- **THEN** the function returns a list of dicts with keys `stock_code`, `title`, `url`, `pub_date`, `source`
- **THEN** `source` equals `"經濟日報"` for all items
- **THEN** `url` starts with `"https://udn.com/"` or `"https://money.udn.com/"`

#### Scenario: Graceful degradation when API returns unexpected JSON

- **WHEN** the UDN API response does not contain expected keys
- **THEN** the function returns an empty list without raising an exception

#### Scenario: Graceful degradation on HTTP error

- **WHEN** the UDN server returns HTTP 4xx or 5xx
- **THEN** the function logs a warning and returns an empty list for that stock
