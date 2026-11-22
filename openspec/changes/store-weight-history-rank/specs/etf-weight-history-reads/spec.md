## ADDED Requirements

### Requirement: Weight history rank is stored at write time

Each `etf_holdings_snapshot` row SHALL store its `rank`: the 1-based position of the row within the same `etf_code` and `data_date`, ordered by `weight` descending, then `stock_code` ascending. The snapshot writer SHALL compute and write `rank` for every row it saves, and `etf_weight_history.rank` SHALL return the stored value, equal to the value the previous window-function view produced.

#### Scenario: Writer assigns ranks by weight

- **WHEN** a snapshot for one ETF and date is saved
- **THEN** every saved row carries a rank from 1 to the number of rows, ordered by weight descending and stock code ascending on ties

##### Example: ranks with a tie

| stock_code | weight | rank |
| ---------- | ------ | ---- |
| 2330 | 9.5 | 1 |
| 2317 | 4.2 | 2 |
| 2454 | 4.2 | 3 |
| 3008 | 1.0 | 4 |

#### Scenario: Stored ranks match the previous view

- **WHEN** the backfill and view switch are complete
- **THEN** zero rows have a stored rank different from `row_number() OVER (PARTITION BY etf_code, data_date ORDER BY weight DESC, stock_code)`, and zero rows have a NULL rank

### Requirement: Stock weight history queries do not rank the whole table

A query against `etf_weight_history` filtered by `stock_code` SHALL be answered without computing ranks for rows of other stocks, so that the stock weight history API succeeds on its first call within the anon role's 3-second statement timeout.

#### Scenario: First call after a cold start

- **WHEN** the dev server has just started and `GET /api/investment/etf-weight-history?code=2330` is called for the first time
- **THEN** the response status is 200 and the total number of points equals the number of `etf_holdings_snapshot` rows for 2330
