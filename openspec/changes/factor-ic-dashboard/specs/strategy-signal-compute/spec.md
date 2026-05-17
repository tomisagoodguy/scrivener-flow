## ADDED Requirements

### Requirement: StrategySignalCard Displays Factor IC Badges

`StrategySignalCard` SHALL render a factor health row below the stock list showing the current month's Rank IC (`ic_20d`) for each factor relevant to the strategy, sourced from the `getFactorIC` Server Action.

The card receives IC data as an optional prop `factorIC: FactorICRow[]`. When the prop is empty or absent, the health row is not rendered.

#### Scenario: IC data available

- **WHEN** `StrategySignalCard` receives non-empty `factorIC` prop
- **THEN** a row of color-coded badges appears below the stock list, one per factor
- **THEN** each badge shows the factor name (shortened label) and `ic_20d` formatted to 3 decimal places

#### Scenario: IC data unavailable

- **WHEN** `factorIC` prop is empty or undefined
- **THEN** no badge row is rendered; the card layout is unchanged
