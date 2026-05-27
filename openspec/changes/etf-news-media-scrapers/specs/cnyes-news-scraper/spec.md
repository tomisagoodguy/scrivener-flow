## ADDED Requirements

### Requirement: Fetch stock news from CNYES

The system SHALL fetch recent news articles for a given Taiwan stock code from CNYES (鉅亨網) using the SSR-embedded `__NEXT_DATA__` JSON without requiring a browser.

The system SHALL return a list of news items, each containing: `stock_code`, `title`, `url`, `pub_date`, `source`.

The system SHALL set `source` to `"鉅亨網"` for all returned items.

The system SHALL limit results to the most recent 10 articles per stock.

The system SHALL silently return an empty list if the HTTP request fails, the JSON structure is missing, or parsing errors occur.

The system SHALL include a 0.3-second delay between consecutive stock requests to avoid rate limiting.

#### Scenario: Successfully fetch CNYES news for a valid stock code

- **WHEN** `fetch_cnyes_news(["2330"])` is called
- **THEN** the function returns a list of dicts with keys `stock_code`, `title`, `url`, `pub_date`, `source`
- **THEN** `source` equals `"鉅亨網"` for all items
- **THEN** `url` starts with `"https://news.cnyes.com/news/id/"`

##### Example: CNYES news item structure

| Field | Expected Value | Notes |
|-------|---------------|-------|
| stock_code | "2330" | input code |
| title | non-empty string | article headline |
| url | "https://news.cnyes.com/news/id/{newsId}" | constructed from newsId |
| pub_date | "YYYY-MM-DD" format | extracted from publishAt Unix timestamp |
| source | "鉅亨網" | fixed value |

#### Scenario: Graceful degradation when __NEXT_DATA__ is absent

- **WHEN** `fetch_cnyes_news(["9999"])` is called and the page lacks `__NEXT_DATA__`
- **THEN** the function returns an empty list
- **THEN** no exception is raised

#### Scenario: Graceful degradation on HTTP error

- **WHEN** the CNYES server returns HTTP 429 or 5xx
- **THEN** the function logs a warning and returns an empty list for that stock
