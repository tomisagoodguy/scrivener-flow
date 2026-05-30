## ADDED Requirements

### Requirement: Display topic tags on ETF holdings

Each stock row in the ETF holdings list SHALL display up to 3 topic tag chips sourced from `stock_topic_assignments`.

The Server Action `getHoldings()` SHALL JOIN `stock_topic_assignments` and `stock_topics` to attach topic arrays to each holding before returning to the client.

#### Scenario: Stock has topics

- **WHEN** a holding has entries in `stock_topic_assignments`
- **THEN** up to 3 topic chips are rendered inline, showing `short_name`
- **THEN** each chip uses the `color` field from `stock_topics` as background

#### Scenario: Stock has no topics

- **WHEN** a holding has no entries in `stock_topic_assignments`
- **THEN** no topic chips are rendered (no empty placeholder)

### Requirement: Filter holdings by topic

The ETF holdings page SHALL support filtering by a single topic via the URL parameter `topic=<topic_id>`.

When `topic` param is set, only holdings matching that `topic_id` in `stock_topic_assignments` SHALL be returned by `getHoldings()`.

#### Scenario: Topic filter active

- **WHEN** URL contains `?topic=coWoS-packaging`
- **THEN** only holdings whose `stock_code` has that `topic_id` in `stock_topic_assignments` are shown
- **THEN** a filter chip with the topic name and a clear button are shown above the list

#### Scenario: Clear topic filter

- **WHEN** user clicks the clear button on the active topic filter chip
- **THEN** `topic` param is removed from URL
- **THEN** all holdings are shown again

##### Example: topic filter result count

- **GIVEN** 00981A has 50 holdings, 8 of which have topic_id `coWoS-packaging`
- **WHEN** URL is `/investment/00981A?topic=coWoS-packaging`
- **THEN** 8 holdings are shown
