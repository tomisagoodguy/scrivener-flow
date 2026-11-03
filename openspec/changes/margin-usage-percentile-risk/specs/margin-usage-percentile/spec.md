## Purpose

Rank each stock's margin usage ratio (FinLab `margin_transactions:融資使用率`) against the whole eligible Taiwan market on the same trading day, and surface stocks in the top 20% on the ETF holdings and watch-list pages. Historical crash days show this rank separates who falls harder far better than market capitalization does.

## ADDED Requirements

### Requirement: Daily margin usage percentile

The ETF pipeline SHALL compute, for every trading date it syncs into `stock_prices_daily`, a cross-sectional margin usage percentile `margin_pct_rank` in the range 0–100 (one decimal place) using the full-market FinLab frames before restricting to the synced stock list. A stock SHALL be eligible on date t only when its code is four digits not starting with `0`, its 20-day rolling mean traded amount including t is at least 50,000,000, its close on t is at least 10, and its margin usage on t is not missing. Ineligible stocks, and every stock on a date with fewer than 50 eligible stocks, SHALL have `margin_pct_rank` stored as NULL. Missing margin usage SHALL NOT be treated as zero when ranking.

#### Scenario: Eligible stock receives a percentile

- **WHEN** the OHLCV sync runs for a date on which a stock is eligible
- **THEN** that stock's `stock_prices_daily` row for the date has a non-NULL `margin_pct_rank` between 0 and 100

#### Scenario: Ineligible stock stores NULL

- **WHEN** a synced stock has close below 10, a 20-day mean amount below 50,000,000, a code that is not a four-digit common stock, or missing margin usage on the date
- **THEN** its `margin_pct_rank` for that date is NULL while its other OHLCV columns are written as before

#### Scenario: Percentile failure does not block price sync

- **WHEN** the percentile computation raises an exception
- **THEN** the error is logged, `margin_pct_rank` is NULL for all rows, and open/high/low/close/volume/amount/margin_ratio/it_buy are still returned and saved

##### Example: eligibility within a date that has at least 50 eligible stocks

The rows below are a subset of that date; 1101 has the lowest margin usage and 2330 the highest among all eligible stocks.

| Stock | Close | 20d mean amount | Margin usage | Eligible | margin_pct_rank |
| ----- | ----- | --------------- | ------------ | -------- | --------------- |
| 1101  | 40    | 80,000,000      | 5.0          | yes      | lowest rank among eligible |
| 2330  | 1000  | 9,000,000,000   | 30.0         | yes      | highest rank among eligible |
| 2002  | 8     | 60,000,000      | 25.0         | no (close < 10) | NULL |
| 0050  | 150   | 5,000,000,000   | 2.0          | no (ETF code) | NULL |
| 3008  | 2000  | 1,000,000,000   | missing      | no (missing margin) | NULL |

### Requirement: High margin holding badge

The ETF holdings table on `/investment/[etf]` SHALL show an amber badge labelled 「前20%」 next to the margin usage value of every holding whose latest `margin_pct_rank` is at least 80, and SHALL show no badge when the rank is below 80 or missing. The badge SHALL use amber colors, not the rose/red reserved for price rises. The high-margin threshold SHALL be defined once as `HIGH_MARGIN_PCT = 80` in `src/lib/investment/marginRisk.ts`.

#### Scenario: Holding at the threshold

- **WHEN** a holding's latest `margin_pct_rank` is 80.0
- **THEN** its row shows the 「前20%」 badge

#### Scenario: Holding below threshold or without data

- **WHEN** a holding's latest `margin_pct_rank` is 79.9 or NULL
- **THEN** its row shows the margin usage value without the badge

### Requirement: High margin exposure summary

The `/investment/[etf]` holdings section SHALL display one summary line stating how many holdings are in the market-wide top 20% by margin usage and the sum of their ETF weights. The `/investment/watch-list` page SHALL display one summary line stating how many watch-list stocks are in the top 20%, and SHALL append the count of watch-list stocks with no available percentile when that count is greater than zero. The watch-list summary SHALL NOT render when the watch list is empty. When the percentile lookup fails, the page SHALL still render its other content and the summary SHALL count every stock as having no data.

#### Scenario: ETF holdings summary

- **WHEN** an ETF has 50 holdings of which 6 have `margin_pct_rank` ≥ 80 with weights summing to 9.4%
- **THEN** the holdings section shows 「高融資前 20%：6 檔（權重 9.4%）」

#### Scenario: Watch list with missing data

- **WHEN** a watch list has 12 stocks, 3 of them rank ≥ 80 and 4 have no `stock_prices_daily` percentile
- **THEN** the page shows 「高融資前 20%：3 檔」 followed by 「另 4 檔無資料」

#### Scenario: Empty watch list

- **WHEN** the user has no watch-list stocks or is not signed in
- **THEN** no margin exposure summary is rendered

### Requirement: Margin usage label correctness

Every UI label that displays `margin_ratio` SHALL name it as margin usage (「融資使用率」, or the compact column header 「資使用」) and SHALL NOT label it 「資券%」, because 資券比 is a different metric.

#### Scenario: Stock pool metrics chip

- **WHEN** the stock pool metrics card renders a stock with a positive `margin_ratio`
- **THEN** the chip label reads 「融資使用率」

#### Scenario: Stock picker table header

- **WHEN** the stock picker table renders
- **THEN** the margin column header reads 「資使用」 and no header reads 「資券%」
