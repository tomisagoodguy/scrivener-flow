## ADDED Requirements

### Requirement: Today's buy capital donut chart

The component SHALL render a recharts PieChart with an innerRadius (donut shape) showing the capital allocation of today's buy events (action IN or BUY) for the selected ETF. Capital for each stock SHALL be calculated as `Math.abs(diff_shares) * price`.

#### Scenario: Renders with buy events today

- **WHEN** today's diff_logs contain one or more IN or BUY events with a non-null price
- **THEN** the donut chart shows each stock as a proportional arc with stock name and percentage label

#### Scenario: No buy events today

- **WHEN** today's diff_logs contain zero IN or BUY events
- **THEN** the component renders an empty-state message "今日無買進紀錄" instead of the chart

#### Scenario: Capital computation

- **WHEN** a stock has diff_shares = 500000 and price = 200
- **THEN** its capital contribution is displayed as 1.0億 (= 500000 × 200 / 1e8)

##### Example: multi-stock donut proportions

| stock | diff_shares | price | capital (億) | share of total |
|-------|------------|-------|--------------|----------------|
| 2330  | 1000000    | 980   | 9.8          | 61.3%          |
| 2454  | 500000     | 820   | 4.1          | 25.6%          |
| 2317  | 300000     | 70    | 0.21         | 1.3%           |
| 其他  | —          | —     | 1.88         | 11.8%          |

#### Scenario: Tooltip on hover

- **WHEN** user hovers over a donut arc
- **THEN** a tooltip shows stock code, stock name, capital in 億 (2 decimal places), and percentage of total

#### Scenario: Placement in ETF detail page

- **WHEN** user selects the "當日加減碼" tab on the ETF detail page
- **THEN** the donut chart appears above the existing diff table

### Requirement: Stocks beyond top 5 aggregated in donut chart

When more than 5 stocks have buy events, the component SHALL display the top 5 by capital and aggregate the rest into a single "其他" arc to avoid visual clutter.

#### Scenario: More than 5 buy stocks

- **WHEN** today has 8 stocks with BUY/IN events
- **THEN** the donut shows 5 named arcs plus one "其他" arc
