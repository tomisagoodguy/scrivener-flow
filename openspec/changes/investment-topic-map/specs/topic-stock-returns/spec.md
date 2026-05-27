## ADDED Requirements

### Requirement: Batch topic stock returns lookup

The `getTopicStockReturns` Server Action SHALL accept an array of stock codes and return a map of stock code to `{ change_pct, close, stock_name }` by querying `market_treemap_daily` for the latest available date. The action SHALL be callable from Server Components only.

#### Scenario: Successful batch fetch
- **WHEN** `getTopicStockReturns(stockCodes)` is called with up to 794 stock codes
- **THEN** it queries `market_treemap_daily` WHERE `date = MAX(date)` AND `stock_code IN (stockCodes)`
- **THEN** it returns `Record<string, { change_pct: number | null, close: number | null, stock_name: string | null }>`
- **THEN** stock codes with no matching row are absent from the returned map (not included as null entries)

#### Scenario: No data available
- **WHEN** `market_treemap_daily` has no rows
- **THEN** the action returns an empty object `{}`
- **THEN** no error is thrown

#### Scenario: Topic average return calculation
- **WHEN** the Server Component computes avgRet1d for a topic
- **THEN** it takes the median of `change_pct` values for component stocks that have data
- **THEN** component stocks absent from the returned map are excluded from the calculation
- **WHEN** fewer than 1 component stock has data
- **THEN** avgRet1d is `null`

##### Example: avgRet1d computation
- **GIVEN** topic "矽晶圓" has stocks ["3532","3536","5483","6182","6488"]
- **GIVEN** getTopicStockReturns returns { "3532": { change_pct: 1.5 }, "3536": { change_pct: -0.5 }, "5483": { change_pct: 2.1 } }
- **WHEN** avgRet1d is computed
- **THEN** values [1.5, -0.5, 2.1] are sorted → [-0.5, 1.5, 2.1], median = 1.5
- **THEN** avgRet1d = 1.5 (%)
