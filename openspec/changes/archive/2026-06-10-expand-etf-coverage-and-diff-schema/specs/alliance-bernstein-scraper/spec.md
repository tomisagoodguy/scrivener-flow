## ADDED Requirements

### Requirement: AllianceBernstein ETF 00984D added to registry and fetched via REST API

The system SHALL add 00984D (聯博全球非投等投資等級) to `ETF/config/etf_registry.py` and `src/lib/investment/etfRegistry.ts` with `source: "official_api"`.

The system SHALL implement `_fetch_alliance_bernstein()` in `ETF/scrapers/official_api_scraper.py` that performs a GET request to the AllianceBernstein API and parses `domesticHoldings[].holdings[]` to extract `stockCode`, `stockName`, `shares`, and `weight`.

Because 00984D holds non-Taiwan bonds, `code` values in the response may be ISIN strings (12-character alphanumeric) or other non-4-digit identifiers. The system SHALL accept any non-empty string as a valid `code` for this ETF, without filtering by digit count.

#### Scenario: Successful AB API fetch

- **WHEN** `official_api_scraper.fetch_holdings("00984D")` is called
- **THEN** the function returns a DataFrame with at least one row; `code` is a non-empty string, `weight` is a positive float

#### Scenario: AB API returns empty domesticHoldings

- **WHEN** `domesticHoldings` is an empty list or missing in the response
- **THEN** `fetch_holdings()` returns an empty DataFrame and logs a warning

##### Example: ISIN code accepted

| Field    | Expected value          | Notes                               |
|----------|------------------------|-------------------------------------|
| `code`   | `"US38141GXZ62"`        | ISIN format, not 4-digit TW code    |
| `name`   | `"Goldman Sachs 4.5%"`  | English bond name                   |
| `weight` | `1.2`                   | percentage                          |
| `shares` | `1000000`               | face value units                    |
