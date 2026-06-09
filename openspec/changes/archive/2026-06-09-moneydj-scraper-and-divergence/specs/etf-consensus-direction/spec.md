## ADDED Requirements

### Requirement: Consensus page renders divergence tab alongside existing tabs

The `/investment/consensus` page SHALL include a "分歧" tab as an additional navigation tab alongside existing consensus tabs. The tab content SHALL be sourced from the `etf_stock_divergence` table (defined in the `etf-divergence-detection` spec). No existing tabs or their data sources SHALL be removed or modified.

#### Scenario: Divergence tab visible in tab navigation

- **WHEN** a user navigates to `/investment/consensus`
- **THEN** the tab bar includes a "分歧" tab entry that, when clicked, renders the divergence content panel
