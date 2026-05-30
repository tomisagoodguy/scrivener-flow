## ADDED Requirements

### Requirement: Topic heatmap tab on sectors page

The `/investment/sectors` page SHALL include a「主題」tab alongside the existing tabs.

When the 主題 tab is active, the page SHALL display a treemap where each block represents one topic from `stock_topics` (only topics that have at least one ETF holding).

#### Scenario: Heatmap block sizing

- **WHEN** the 主題 tab is active
- **THEN** block size is proportional to the sum of `etf_holdings_snapshot.weight` for all holdings matching that topic across all tracked ETFs
- **THEN** blocks with larger total ETF weight appear larger

#### Scenario: Heatmap block color

- **WHEN** the 主題 tab is active
- **THEN** each block uses the `color` field from `stock_topics` as its fill color
- **THEN** the block label shows `short_name` and the holding count

#### Scenario: Click to filter

- **WHEN** user clicks a topic block
- **THEN** a panel or drawer opens listing all ETF holdings tagged with that topic, sorted by descending weight

#### Scenario: No ETF holdings for a topic

- **WHEN** a topic exists in `stock_topics` but none of its stocks appear in any ETF holdings
- **THEN** that topic block is NOT rendered in the heatmap

### Requirement: Topic data server action

A Server Action `getTopicHeatmapData()` SHALL query `stock_topics` JOIN `stock_topic_assignments` JOIN `etf_holdings_snapshot` (latest `data_date`) to compute per-topic total weight and holding count, returning an array sorted by total weight descending.

#### Scenario: Data freshness

- **WHEN** `getTopicHeatmapData()` is called
- **THEN** it uses the same `canonicalDate` logic as `getAllHoldings()` (global latest `data_date` from `etf_holdings_snapshot`)
