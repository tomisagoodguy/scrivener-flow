## Purpose

Defines how the application reads ETF weight history so that every screen receives complete, current data despite the PostgREST 1000-row response cap, and so that large history pages load only the data the viewer asks for.

## ADDED Requirements

### Requirement: Paginated reads return every matching row

The shared paginated reader (`fetchAllRows`) SHALL request consecutive ranges of at most 1000 rows until a page returns fewer rows than the page size, and SHALL return the concatenation of all pages in request order. If any page returns an error, the reader SHALL throw an `Error` whose message contains the caller-supplied table label and the error message, and SHALL NOT return partial results.

#### Scenario: Multiple pages are merged

- **WHEN** a query matches 2,905 rows
- **THEN** the reader requests ranges 0–999, 1000–1999, and 2000–2999 and returns 2,905 rows

##### Example: page boundaries

| Matching rows | Ranges requested | Rows returned |
| ------------- | ---------------- | ------------- |
| 0 | 0–999 | 0 |
| 1000 | 0–999, 1000–1999 | 1000 |
| 2905 | 0–999, 1000–1999, 2000–2999 | 2905 |

#### Scenario: Page error is surfaced

- **WHEN** the second page returns an error with message "timeout" for label `etf_weight_history`
- **THEN** the reader throws an Error whose message contains `etf_weight_history` and `timeout`

### Requirement: Weight history queries use a stable order

Every paginated query SHALL order by a column set that is unique per row, so that consecutive pages neither repeat nor skip rows: queries against `etf_weight_history` SHALL order by `data_date`, then `etf_code`, then `stock_code`; queries against `etf_stock_overlap` (one row per stock per date, no `etf_code` column) SHALL order by `data_date`, then `stock_code`.

#### Scenario: Rows sharing a date are paginated deterministically

- **WHEN** more than 1000 rows share the same `data_date`
- **THEN** the combined result contains each `(etf_code, stock_code, data_date)` exactly once

### Requirement: Stock weight history API returns complete history

`GET /api/investment/etf-weight-history?code=<stock>` SHALL return, for every registered ETF, all rows of `etf_weight_history` for that stock, and the latest date returned for each ETF SHALL equal that ETF's latest `data_date` for the stock in `etf_holdings_snapshot`.

#### Scenario: Stock with more than 1000 history rows

- **WHEN** the API is called for stock 2330, which has 2,905 rows across all ETFs
- **THEN** the response contains 2,905 data points in total and the latest date is the latest snapshot date for 2330

### Requirement: ETF ranking history returns complete history

`getRankingHistory(etfCode)` SHALL return all rows of `etf_weight_history` for the ETF, with the latest returned `data_date` equal to the ETF's latest `data_date` in `etf_holdings_snapshot`.

#### Scenario: ETF with more than 1000 history rows

- **WHEN** `getRankingHistory('00981A')` is called and the ETF has more than 1000 rows
- **THEN** the number of returned rows equals the ETF's row count in `etf_holdings_snapshot`

### Requirement: Holdings price overlay chart reads the full period

`HoldingsPriceOverlayChart` SHALL load all `etf_weight_history` rows for the selected stock, ETFs, and period (30, 60, or 90 days), so that each ETF line ends at its latest `data_date` within the period.

#### Scenario: Popular stock over 90 days

- **WHEN** the chart loads 90 days for a stock with 1,272 rows in that period
- **THEN** all 1,272 rows are loaded and each ETF line ends on its latest snapshot date

### Requirement: History page loads data on demand

`/investment/history` SHALL load on the server only the holdings of each ETF's latest `data_date`, used for the stock list and the consensus holding counts. When the viewer selects an ETF in the ranking tab, the page SHALL load that ETF's weight history for the last 90 days; when the viewer selects a stock in the cross-ETF tab, the page SHALL load that stock's weight history across all ETFs for the last 90 days. While a selection is loading, the chart area SHALL show a loading state, and a failed load SHALL show an error message instead of an empty chart. The header SHALL show the number of market trading days in the last 90 days.

#### Scenario: Initial page load stays small

- **WHEN** the page is rendered on the server
- **THEN** weight history queries fetch at most 2,000 rows in total

#### Scenario: Selecting an ETF loads its 90-day history

- **WHEN** the viewer selects ETF 00981A in the ranking tab
- **THEN** the chart covers every `data_date` of 00981A within the last 90 days

#### Scenario: Selecting a stock loads its cross-ETF history

- **WHEN** the viewer selects stock 2330 in the cross-ETF tab
- **THEN** the chart covers every `data_date` of 2330 across all ETFs within the last 90 days

#### Scenario: Load failure is visible

- **WHEN** loading the selected ETF's history fails
- **THEN** the chart area shows an error message and no empty chart is presented as data

### Requirement: Consensus trend aggregates every overlap row

The consensus trend on `/investment/history` SHALL aggregate all `etf_stock_overlap` rows of the last 90 days, so that the trend contains one point per distinct `data_date` in that period.

#### Scenario: Overlap rows exceed 1000

- **WHEN** the last 90 days contain 25,730 overlap rows across 64 dates
- **THEN** the consensus trend contains 64 points
