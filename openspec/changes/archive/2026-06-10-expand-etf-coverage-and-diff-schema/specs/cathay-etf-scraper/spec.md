## ADDED Requirements

### Requirement: Cathay ETF holdings fetched via official REST API

The system SHALL fetch 00400A (國泰動能高息) holdings via a GET request to the Cathay Asset Management REST API that returns `stockWeights[]`.

The CATALOG entry for 00400A SHALL use `issuer: "cathay"` and include the fund's REST API endpoint parameters.

The `source` field of 00400A SHALL be updated from `pocket` to `official_api` in both registry files.

#### Scenario: Successful Cathay REST API fetch

- **WHEN** `official_api_scraper.fetch_holdings("00400A")` is called
- **THEN** the function returns a DataFrame with at least one row; each row has a valid `code`, non-null `weight`, and non-negative `shares`

#### Scenario: Cathay API returns HTTP error — fallback to Pocket

- **WHEN** the Cathay REST endpoint returns a non-200 status code
- **THEN** `fetch_holdings()` returns an empty DataFrame (does not raise), and `multi_etf_step` falls back to `pocket_scraper`

##### Example: parsed holdings row

| Field    | Expected value       | Notes                          |
|----------|---------------------|--------------------------------|
| `code`   | `"2330"`             | 4-digit TW stock code          |
| `name`   | `"台積電"`            | Chinese name                   |
| `weight` | `8.5`                | percentage (not decimal)       |
| `shares` | `1500000`            | raw shares (not lots)          |
