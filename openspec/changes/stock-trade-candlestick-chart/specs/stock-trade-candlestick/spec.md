## ADDED Requirements

### Requirement: OHLC data fetching

The server action `computeStockPnl()` SHALL query `open`, `high`, `low`, and `close` columns from `stock_prices_daily` instead of `close` only. The returned `priceHistory` array SHALL use the shape `{ time: string; open: number; high: number; low: number; close: number }[]`. Records where `open` is null SHALL be excluded from the returned array.

#### Scenario: OHLC data returned

- **WHEN** `computeStockPnl()` is called with a valid stock code
- **THEN** the returned `priceHistory` contains objects with `time`, `open`, `high`, `low`, and `close` fields, all non-null

#### Scenario: Null OHLC rows excluded

- **WHEN** some rows in `stock_prices_daily` have `open = null` for the target stock
- **THEN** those rows SHALL NOT appear in `priceHistory`

### Requirement: Candlestick chart rendering

`DualAxisChart` SHALL render the right-axis price series as a `CandlestickSeries` (not `LineSeries`). The candlestick colors SHALL follow Taiwan stock market convention: up candles (close ≥ open) SHALL be red (`#e11d48`), down candles (close < open) SHALL be green (`#059669`). Wick and border colors SHALL match the body color.

#### Scenario: Up candle color

- **WHEN** a candle has `close >= open`
- **THEN** the body, border, and wick SHALL render in red (`#e11d48`)

#### Scenario: Down candle color

- **WHEN** a candle has `close < open`
- **THEN** the body, border, and wick SHALL render in green (`#059669`)

##### Example: color assignment

| close vs open | Expected color |
|---------------|----------------|
| close > open  | #e11d48 (red)  |
| close = open  | #e11d48 (red)  |
| close < open  | #059669 (green)|

### Requirement: Legend label update

The chart legend for the right axis SHALL display "K 線（右軸，元）" instead of "收盤價（右軸，元）".

#### Scenario: Legend shows correct label

- **WHEN** the DualAxisChart component renders with OHLC data
- **THEN** the right-axis legend text SHALL be "K 線（右軸，元）"

### Requirement: Buy/sell event markers preserved

Existing buy (加碼/建倉) and sell (減碼/出清) event markers on the chart SHALL continue to render at the correct dates and SHALL NOT be affected by the switch from LineSeries to CandlestickSeries.

#### Scenario: Event markers still render

- **WHEN** `events` prop contains buy/sell entries
- **THEN** colored circle markers SHALL appear on the chart at the corresponding dates
