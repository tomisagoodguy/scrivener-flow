## ADDED Requirements

### Requirement: BuyingPatternStep fills forward returns for events within the past 30 days

On each Pipeline run, `BuyingPatternStep` SHALL query `etf_buying_patterns` for rows where `event_date >= today - 30 days` and `future_returns` is missing one or more day-horizons from {1, 2, 3, 5, 7, 10, 15, 20, 25, 30}.

For each such row, the step SHALL compute the return for each missing horizon `d` as:

```
return_d = (close_{event_date + d trading days} - close_{event_date}) / close_{event_date}
```

where `close` is sourced from `stock_prices_daily`. If a price is unavailable for a specific horizon (e.g., future trading day not yet recorded), that horizon SHALL be skipped and left absent from `future_returns`.

The batch size per Pipeline run SHALL not exceed 500 rows to bound execution time.

#### Scenario: Forward return is computed when price data is available

- **WHEN** an event has `event_date = T` and `stock_prices_daily` contains a closing price for `T + 5 trading days`
- **THEN** `future_returns["5"]` SHALL be set to the computed percentage return

##### Example: 5-day return calculation

- **GIVEN** `event_date = 2026-05-12`, `close_T = 100.0`, `close_{T+5} = 107.0`
- **WHEN** BuyingPatternStep runs on or after `T + 5`
- **THEN** `future_returns["5"] = 0.07`

#### Scenario: Missing price skips the horizon

- **WHEN** `stock_prices_daily` does not contain a row for `stock_code` on `event_date + d trading days`
- **THEN** horizon `d` is absent from `future_returns` and no error is raised

#### Scenario: Returns are updated incrementally

- **WHEN** BuyingPatternStep runs on day T+1, T+5, T+10, etc.
- **THEN** each run adds only the newly available horizons to `future_returns` without overwriting already-computed values
