## ADDED Requirements

### Requirement: Server Action returns 5-day snapshot data for an ETF

The system SHALL provide a Server Action `getHoldings5DayTrend(etfKey: string)` that queries `etf_holdings_snapshot` for the specified ETF's most recent 5 distinct `data_date` values and returns all holdings (`stock_code`, `stock_name`, `weight`, `rank`) for those dates.

#### Scenario: Sufficient history available

- **WHEN** `etfKey` has 5 or more distinct dates in `etf_holdings_snapshot`
- **THEN** the action returns data for exactly the 5 most recent dates, sorted ascending by date

#### Scenario: Insufficient history

- **WHEN** `etfKey` has fewer than 2 distinct dates in `etf_holdings_snapshot`
- **THEN** the action returns `{ insufficient: true, dailyDiff: [], cumulativeDiff: [] }`

### Requirement: Daily diff analysis filters by ±1% threshold

The system SHALL compute day-over-day weight changes across consecutive date pairs in the 5-day window. For each stock appearing in both dates of a pair, if `|new_weight - old_weight| >= 1.0`, the system SHALL include it in the `dailyDiff` result.

#### Scenario: Stock weight crosses threshold in one interval

- **WHEN** a stock's weight changes from 5.0% to 6.2% between two consecutive dates
- **THEN** it appears in `dailyDiff` with `delta: +1.2`, `fromDate`, `toDate`, `oldWeight: 5.0`, `newWeight: 6.2`

#### Scenario: Stock weight stays below threshold

- **WHEN** a stock's weight changes from 5.0% to 5.4% between two consecutive dates
- **THEN** it does NOT appear in `dailyDiff`

##### Example: threshold boundary cases

| old_weight | new_weight | |delta| | Included? |
|---|---|---|---|
| 5.00 | 6.00 | 1.00 | Yes (≥ 1.0) |
| 5.00 | 5.99 | 0.99 | No (< 1.0) |
| 8.00 | 6.00 | 2.00 | Yes |

### Requirement: Cumulative diff analysis compares today vs each past date

The system SHALL compute the difference between today's weight and each past date's weight for all stocks present in both snapshots. If `|today_weight - past_weight| >= 3.0`, the system SHALL include it in `cumulativeDiff`.

#### Scenario: Stock has accumulated significant weight shift

- **WHEN** today's weight is 10.0% and 4 days ago it was 6.5% (delta = +3.5%)
- **THEN** the stock appears in `cumulativeDiff` with all matching past-date entries grouped under the same stock entry

#### Scenario: Stock weight shift below threshold

- **WHEN** today's weight is 10.0% and 4 days ago it was 7.5% (delta = +2.5%)
- **THEN** the stock does NOT appear in `cumulativeDiff`

##### Example: cumulative threshold cases

| today_weight | past_weight | |delta| | Included? |
|---|---|---|---|
| 10.00 | 7.00 | 3.00 | Yes (≥ 3.0) |
| 10.00 | 7.01 | 2.99 | No (< 3.0) |
| 5.00 | 9.00 | 4.00 | Yes (negative delta) |

### Requirement: Holdings5DayTrend component renders two analysis sections

The system SHALL render a `Holdings5DayTrend` Client Component with two collapsible sub-sections:
1. **近5日每日權重變動**：table with columns 代號、名稱、區間、起始權重、最新權重、變動
2. **今日累積偏移**：grouped by stock, showing today's weight and each past-date delta

Positive deltas SHALL be styled with `text-rose-600` (red = increase in Taiwan convention). Negative deltas SHALL be styled with `text-emerald-600`.

#### Scenario: No items meet threshold

- **WHEN** no stocks cross the threshold for a given analysis layer
- **THEN** the section displays "無符合條件的標的" in muted text

#### Scenario: Insufficient data

- **WHEN** the Server Action returns `insufficient: true`
- **THEN** the component displays "資料不足（至少需要 2 天資料）" and hides both tables

### Requirement: Trend section is inserted below the existing diff section in the ETF page

The system SHALL render `Holdings5DayTrend` in `/investment/[etf]/page.tsx` after the existing diff/change-type display. Data is fetched server-side and passed as props.

#### Scenario: Normal page load

- **WHEN** user navigates to `/investment/00981A`
- **THEN** the page renders the trend section below the existing holdings table, showing 5-day analysis for 00981A
