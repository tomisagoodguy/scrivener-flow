## ADDED Requirements

### Requirement: Buying patterns page displays three charts

The page at `/investment/buying-patterns` SHALL render three charts using data aggregated from `etf_buying_patterns`:

1. **Line chart** — x-axis: trading days 1–30, y-axis: average return (%), one line per pattern type
2. **Heatmap** — rows: pattern types, columns: selected day horizons {1, 5, 10, 15, 20, 25, 30}, cell color: average return using a blue-to-red diverging scale (red = high return per Taiwan convention)
3. **Win-rate chart** — x-axis: trading days 1–30, y-axis: win rate (%), one line per pattern type; win = `return_d > 0`

Each chart SHALL display `n=<count>` in the legend label showing the event sample size for each pattern.

#### Scenario: Page loads with pre-computed data

- **WHEN** a user navigates to `/investment/buying-patterns`
- **THEN** the page SHALL load without client-side data fetching (Server Component reads DB via Server Action)
- **THEN** all three charts SHALL be visible

#### Scenario: Insufficient data for a pattern

- **WHEN** a pattern has fewer than 10 events in `etf_buying_patterns`
- **THEN** that pattern SHALL still appear in the legend with `n=<count>` but its line/cells SHALL be visually distinct (dashed line or gray)

### Requirement: Server Action aggregates buying pattern statistics

A Server Action `getBuyingPatternStats()` SHALL query all rows from `etf_buying_patterns` where `future_returns` is not null and aggregate per `(pattern_type, day_horizon)`:

- `avg_return`: arithmetic mean of `future_returns[d]` across all events for the pattern
- `win_rate`: fraction of events where `future_returns[d] > 0`
- `n`: total event count for the pattern (regardless of horizon)

The action SHALL return a typed array suitable for direct chart rendering.

#### Scenario: Statistics are computed server-side

- **WHEN** the page renders
- **THEN** `getBuyingPatternStats()` SHALL execute on the server and return the aggregated result
- **THEN** raw event rows SHALL NOT be sent to the browser

##### Example: win rate computation

- **GIVEN** pattern `new_position` has 4 events with `future_returns["5"]` = [0.05, -0.02, 0.10, 0.03]
- **WHEN** `getBuyingPatternStats()` is called
- **THEN** `avg_return` for day 5 = 0.04, `win_rate` for day 5 = 0.75, `n` = 4
