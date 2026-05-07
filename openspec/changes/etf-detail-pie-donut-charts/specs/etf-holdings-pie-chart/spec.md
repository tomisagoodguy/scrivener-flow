## ADDED Requirements

### Requirement: Top-10 holdings pie chart

The component SHALL render a recharts PieChart displaying the weight distribution of the top 10 holdings for the selected ETF. Holdings beyond rank 10 SHALL be aggregated into a single "其他" (Others) slice.

#### Scenario: Renders with sufficient data

- **WHEN** the ETF has more than 10 holdings
- **THEN** the chart displays exactly 10 named slices plus one "其他" slice

##### Example: 13 holdings aggregation

- **GIVEN** holdings with weights: [9.0, 8.5, 7.2, 6.8, 6.1, 5.5, 4.9, 4.3, 3.8, 3.2, 2.1, 1.8, 1.4]
- **WHEN** chart renders
- **THEN** top 10 slices sum to 59.3% and "其他" slice shows 5.3%

#### Scenario: Renders with 10 or fewer holdings

- **WHEN** the ETF has 10 or fewer holdings
- **THEN** all holdings are shown as individual slices with no "其他" slice

#### Scenario: Tooltip on hover

- **WHEN** user hovers over a pie slice
- **THEN** a tooltip shows stock code, stock name, and weight percentage rounded to 2 decimal places

#### Scenario: Color coding follows Taiwan convention

- **WHEN** the chart renders
- **THEN** slices use a fixed color palette (not red/green) to avoid conflict with the gain/loss color convention

### Requirement: Pie chart placement in ETF detail page

The pie chart SHALL be placed in the "目前持股" (Current Holdings) section of the ETF detail page, above the existing holdings table.

#### Scenario: Chart visible in current holdings tab

- **WHEN** user navigates to `/investment/[etf]` and selects the default tab
- **THEN** the pie chart is visible without scrolling past the fold on desktop viewport (≥1280px)
