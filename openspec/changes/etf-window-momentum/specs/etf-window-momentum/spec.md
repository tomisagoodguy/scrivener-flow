## ADDED Requirements

### Requirement: Window aggregation of multi-ETF accumulation

A Server Action `getWindowMomentum(windowDays, minEtfCount)` SHALL aggregate `etf_diff_logs` over the most recent `windowDays` trading days and return, for each stock accumulated by at least `minEtfCount` ETFs, the aggregated momentum metrics.

The trading-day window SHALL be defined as the most recent `windowDays` values of `market_breadth_daily.date` (descending; the table holds exactly one row per trading day). Calendar days SHALL NOT be used.

For each `(etf_code, stock_code)` pair, the window net shares SHALL be the sum of `diff_shares` over all events in the window (IN/BUY positive, OUT/SELL negative). An ETF SHALL count as "accumulating" a stock only when its window net shares > 0. The stock's ETF count SHALL be the distinct count of accumulating ETFs.

The Server Action SHALL perform all aggregation server-side and SHALL NOT return raw `etf_diff_logs` events to the browser. Results SHALL be cached via `unstable_cache` with `revalidate: 3600` and a cache key containing `windowDays` and `minEtfCount`. Numeric columns (`diff_shares`, `diff_weight`, `volume`) SHALL be coerced with `Number()` before arithmetic.

#### Scenario: ETF with buy-then-sell nets out

- **WHEN** an ETF both buys and sells the same stock within the window
- **THEN** the ETF SHALL count as accumulating only if the net `diff_shares` over the window is positive

##### Example: net accumulation determination

| ETF events in 5-day window (diff_shares) | Window net | Counts as accumulating |
|---|---|---|
| +50,000 (BUY), +20,000 (BUY) | +70,000 | yes |
| +50,000 (BUY), -60,000 (SELL) | -10,000 | no |
| +30,000 (IN), -30,000 (SELL) | 0 | no |

#### Scenario: Stock filtered by minimum ETF count

- **WHEN** `getWindowMomentum(5, 3)` is called and a stock has window-net accumulation from only 2 ETFs
- **THEN** the stock SHALL NOT appear in the result
- **THEN** OHLCV data SHALL NOT be fetched for that stock

#### Scenario: Result ordering

- **WHEN** the aggregation completes
- **THEN** stocks SHALL be ordered by ETF count descending, then by total accumulated shares descending

### Requirement: Derived momentum metrics per stock

For each qualifying stock, the Server Action SHALL compute:

- `totalAccumulatedShares`: sum of window net `diff_shares` across accumulating ETFs (unit: shares)
- `totalWeightChange`: sum of window net `diff_weight` across accumulating ETFs (unit: percentage points)
- `maxSingleWeightChange`: maximum single-event `diff_weight` within the window
- `absorptionRatio`: `totalAccumulatedShares / sum(stock_prices_daily.volume over the window)`; when the denominator is 0 or OHLCV is missing, the value SHALL be `null`
- `absorptionTrend`: compare accumulated shares in the second half of the window (for odd windows, the second half gets the extra day) against the first half — `accelerating` when second > first × 1.2, `decaying` when second < first × 0.8, otherwise `steady`
- `etfDetails`: per accumulating ETF, the `etf_code` and window net `diff_weight`

#### Scenario: Absorption ratio with missing OHLCV

- **WHEN** a qualifying stock has no rows in `stock_prices_daily` within the window
- **THEN** `absorptionRatio` SHALL be `null`
- **THEN** the stock SHALL still appear in the result with its other metrics

#### Scenario: Absorption trend classification

- **WHEN** window accumulation is split into first and second halves by trading day
- **THEN** the trend SHALL be classified per the 1.2× / 0.8× thresholds

##### Example: trend boundaries (5-day window: first half = 2 days, second half = 3 days)

| First-half shares | Second-half shares | Trend |
|---|---|---|
| 100,000 | 130,000 | accelerating |
| 100,000 | 120,000 | steady |
| 100,000 | 79,000 | decaying |
| 0 | 50,000 | accelerating |

### Requirement: Momentum page with URL-driven filters

The page `/investment/momentum` SHALL render a card grid of qualifying stocks. Filter state SHALL be read from URL query parameters: `window` (3, 5, or 10; default 5) and `min_count` (2, 3, or 5; default 2). Invalid parameter values SHALL fall back to defaults.

Each card SHALL display: stock code and name (linked to `/investment/stock/<code>`), ETF count badge, window price change percentage, total accumulated shares (displayed in 張, i.e. shares ÷ 1000 rounded), total weight change, max single weight change, absorption ratio with significance label (`顯著` ≥ 3%, `中等` 1–3%, `輕微` < 1%, `—` when null), absorption trend label, per-ETF accumulation bars, and the window date range.

The page header SHALL show the total number of qualifying stocks and the active filter values. The investment module side navigation SHALL include a link to `/investment/momentum`.

#### Scenario: Default rendering

- **WHEN** a user navigates to `/investment/momentum` without query parameters
- **THEN** the page SHALL aggregate with `windowDays = 5` and `minEtfCount = 2`

#### Scenario: Filter change

- **WHEN** a user selects 觀察天數 10 and 最少家數 3
- **THEN** the URL SHALL update to `/investment/momentum?window=10&min_count=3`
- **THEN** the card grid SHALL re-render with the new aggregation

#### Scenario: Empty result

- **WHEN** no stock meets the filter criteria
- **THEN** the page SHALL render an empty state explaining no synchronized accumulation was found in the window

### Requirement: Mini candlestick and volume chart per card

Each stock card SHALL render an SVG mini chart of the window's daily candlesticks (open/high/low/close) and a volume bar chart, sourced from `stock_prices_daily`, rendered as a Server Component without client-side charting libraries.

Colors SHALL follow the Taiwan market convention: a day closing higher than it opened SHALL use rose (red family) and a day closing lower SHALL use emerald (green family). The page-level price change indicators SHALL use `text-rose-600` for gains and `text-emerald-600` for losses.

#### Scenario: Candle color follows TW convention

- **WHEN** a trading day has close > open
- **THEN** the candle SHALL be rendered in the rose color family
- **WHEN** a trading day has close < open
- **THEN** the candle SHALL be rendered in the emerald color family

#### Scenario: Missing OHLCV rows

- **WHEN** a stock has fewer OHLCV rows than the window length
- **THEN** the chart SHALL render only the available days without error
