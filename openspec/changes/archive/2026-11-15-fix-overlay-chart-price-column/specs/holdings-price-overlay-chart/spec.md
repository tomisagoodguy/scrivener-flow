## ADDED Requirements

### Requirement: Overlay chart price line reads stock_prices_daily by data_date

`HoldingsPriceOverlayChart` SHALL read the stock price series from `stock_prices_daily` using the `data_date` column for selection, the period start filter, and ordering, and SHALL draw one price point per returned row within the selected period (30, 60, or 90 days). If the price query returns an error, the chart area SHALL show an error message containing that error instead of a chart drawn without the price line.

#### Scenario: Price line is drawn for the selected period

- **WHEN** the chart loads 90 days for stock 2330
- **THEN** the price query filters `data_date >= <today minus 90 days>`, orders by `data_date`, and the price line has one point per returned row

##### Example: price rows mapped to points

- **GIVEN** `stock_prices_daily` returns rows `{data_date: '2026-11-12', close: 1450}` and `{data_date: '2026-11-13', close: 1465}` for 2330
- **WHEN** the chart renders
- **THEN** the price series contains points `('2026-11-12', 1450)` and `('2026-11-13', 1465)` in that order

#### Scenario: Price query failure is visible

- **WHEN** the price query returns an error with message "column stock_prices_daily.date does not exist"
- **THEN** the chart area shows a message containing "column stock_prices_daily.date does not exist" and no chart without the price line is presented as data
