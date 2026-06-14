# consensus-coverage-metrics Specification

## Purpose

TBD - created by archiving change 'consensus-coverage-metrics'. Update Purpose after archive.

## Requirements

### Requirement: Coverage percentage column

The `/investment/consensus` page SHALL display a "覆蓋率 %" column for each stock row, computed as `etf_count / active_etf_count * 100`, where `active_etf_count` is the number of distinct `etf_code` values in `etf_holdings_snapshot` for the query date. The denominator SHALL be queried at request time and MUST NOT be hardcoded. The value SHALL be rendered with one decimal place followed by `%`.

#### Scenario: Coverage computed from live denominator

- **WHEN** the page renders a consensus row whose `etf_count` is 13 and the query date has 22 distinct ETFs in `etf_holdings_snapshot`
- **THEN** the row displays `59.1%` in the coverage column

##### Example: coverage values

| etf_count | active_etf_count | Displayed |
| --------- | ---------------- | --------- |
| 13 | 22 | 59.1% |
| 22 | 22 | 100.0% |
| 9 | 18 | 50.0% |

#### Scenario: Denominator unavailable

- **WHEN** `active_etf_count` cannot be determined or is zero
- **THEN** the coverage column displays `—` and MUST NOT divide by zero


<!-- @trace
source: consensus-coverage-metrics
updated: 2026-06-14
code:
  - src/app/investment/consensus/consensusMetrics.ts
  - src/app/investment/consensus/page.tsx
tests:
  - src/app/investment/consensus/consensusMetrics.test.ts
-->

---
### Requirement: Average weight column

The `/investment/consensus` page SHALL display a "平均 weight" column for each stock row, computed as `total_weight / etf_count`, rendered with two decimal places followed by `%`. This column SHALL appear to the left of the existing "合計權重" column.

#### Scenario: Average weight computed per row

- **WHEN** a row has `total_weight` 106.67 and `etf_count` 13
- **THEN** the average weight column displays `8.21%`


<!-- @trace
source: consensus-coverage-metrics
updated: 2026-06-14
code:
  - src/app/investment/consensus/consensusMetrics.ts
  - src/app/investment/consensus/page.tsx
tests:
  - src/app/investment/consensus/consensusMetrics.test.ts
-->

---
### Requirement: Total weight caveat disclosure

The `/investment/consensus` page SHALL surface a caveat that "合計權重" sums weights across ETFs with different AUM bases and therefore has no physical proportion meaning and serves only for ordering. The caveat SHALL be visible without interaction (not hidden behind a tooltip-only affordance).

#### Scenario: Caveat present on page

- **WHEN** the consensus tab is rendered with at least one row
- **THEN** text stating that 合計權重 is for ordering only and has no real proportion meaning is visible on the page


<!-- @trace
source: consensus-coverage-metrics
updated: 2026-06-14
code:
  - src/app/investment/consensus/consensusMetrics.ts
  - src/app/investment/consensus/page.tsx
tests:
  - src/app/investment/consensus/consensusMetrics.test.ts
-->

---
### Requirement: Derived columns explainer panel

The `/investment/consensus` page SHALL render a `.glass-card` explainer panel near the top of the consensus tab that defines how 覆蓋率 %, 平均 weight, and 合計權重 are each calculated, including the limitation that 平均 weight ignores AUM differences and that 合計權重 has no additive physical meaning.

#### Scenario: Explainer lists all three derived columns

- **WHEN** the consensus tab is rendered
- **THEN** the explainer panel contains a definition entry for each of 覆蓋率 %, 平均 weight, and 合計權重

<!-- @trace
source: consensus-coverage-metrics
updated: 2026-06-14
code:
  - src/app/investment/consensus/consensusMetrics.ts
  - src/app/investment/consensus/page.tsx
tests:
  - src/app/investment/consensus/consensusMetrics.test.ts
-->