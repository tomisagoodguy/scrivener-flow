## MODIFIED Requirements

### Requirement: Paginated reads return every matching row

The shared paginated reader (`fetchAllRows`) SHALL request ranges of at most 1000 rows, in batches of `concurrency` consecutive ranges (default 1), until a page in range order returns fewer rows than the page size, and SHALL return the concatenation of all pages up to and including that page in range order. Pages after the first short page SHALL be discarded. If any requested page returns an error, the reader SHALL throw an `Error` whose message contains the caller-supplied table label and the error message, and SHALL NOT return partial results.

#### Scenario: Multiple pages are merged

- **WHEN** a query matches 2,905 rows
- **THEN** the reader requests ranges 0–999, 1000–1999, and 2000–2999 and returns 2,905 rows

##### Example: page boundaries

| Matching rows | Ranges requested | Rows returned |
| ------------- | ---------------- | ------------- |
| 0 | 0–999 | 0 |
| 1000 | 0–999, 1000–1999 | 1000 |
| 2905 | 0–999, 1000–1999, 2000–2999 | 2905 |

#### Scenario: Pages are requested in concurrent batches

- **WHEN** the reader is called with `concurrency` 4
- **THEN** it requests 4 consecutive ranges at a time, requests the next batch only when all 4 pages are full, and returns the rows in range order

##### Example: concurrent batch boundaries

| Matching rows | Concurrency | Ranges requested | Rows returned |
| ------------- | ----------- | ---------------- | ------------- |
| 0 | 4 | 0–999, 1000–1999, 2000–2999, 3000–3999 | 0 |
| 2905 | 4 | 0–999, 1000–1999, 2000–2999, 3000–3999 | 2905 |
| 4000 | 4 | 0–999 … 3000–3999, then 4000–4999 … 7000–7999 | 4000 |
| 8808 | 4 | 0–999 … 7000–7999, then 8000–8999 … 11000–11999 | 8808 |

#### Scenario: Page error is surfaced

- **WHEN** the second page returns an error with message "timeout" for label `etf_weight_history`
- **THEN** the reader throws an Error whose message contains `etf_weight_history` and `timeout`

## ADDED Requirements

### Requirement: ETF ranking history is cached

`getRankingHistory(etfCode)` SHALL read through a cache keyed by the ETF code with a one-hour lifetime, using the public read client, so that repeated loads of the same ETF page within that hour do not query the database. A failed read SHALL throw and SHALL NOT store a result in the cache.

#### Scenario: Repeated load within the hour

- **WHEN** `getRankingHistory('00981A')` is called twice within one hour
- **THEN** the second call returns the same rows without issuing database requests
