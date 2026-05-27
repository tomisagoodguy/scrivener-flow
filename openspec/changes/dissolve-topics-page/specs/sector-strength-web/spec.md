## ADDED Requirements

### Requirement: Topic heatmap section in sector page
The `/investment/sectors` page SHALL include a `SectorTopicHeatmap` section below the existing sector ranking, showing 75 industry topics with today's heat coloring.

#### Scenario: Topic section renders below sector ranking
- **WHEN** a user loads `/investment/sectors`
- **THEN** the existing sector ranking SHALL appear first, followed by a "產業題材今日表現" heading and the topic heatmap grid
