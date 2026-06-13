# Spec: ETF Overview Cards

## Purpose

Provide a summary grid of all ETFs on the `/investment` page, giving users at-a-glance visibility into each ETF's disclosure freshness, NAV, AUM, holdings count, and daily diff activity (new positions, removed positions, increases, decreases).

---

## Requirements

### Requirement: ETF overview stats aggregation

The system SHALL provide a server-side aggregation function `getEtfOverviewStats()` that returns one stat entry per ETF in `ETF_REGISTRY`, each containing: ETF code, name, manager, color, disclosure date (that ETF's own latest `data_date` in `etf_holdings_snapshot`), holdings count on that date, latest NAV and AUM (in 100M TWD) from `etf_aum_series`, and diff counts for the disclosure date from `etf_diff_logs` grouped by `change_type` (IN, OUT, BUY, SELL).

#### Scenario: Per-ETF disclosure date independence

- **WHEN** ETF A has its latest snapshot on 2026-06-12 and ETF B has its latest snapshot on 2026-06-05
- **THEN** the stat entry for ETF A uses 2026-06-12 and the stat entry for ETF B uses 2026-06-05, and each holdings count and diff count is computed against that ETF's own date

#### Scenario: Missing NAV or AUM data

- **WHEN** an ETF has no rows in `etf_aum_series`
- **THEN** the stat entry is still returned with `nav` and `aum_100m` set to null, and the remaining fields populated

#### Scenario: No diff logs on disclosure date

- **WHEN** an ETF has no `etf_diff_logs` rows on its disclosure date
- **THEN** all four diff counts (added, removed, increased, decreased) are 0

##### Example: diff count mapping

| change_type rows on disclosure date | added | removed | increased | decreased |
| ------------------------------------ | ----- | ------- | --------- | --------- |
| IN, IN, BUY, SELL, SELL, OUT         | 2     | 1       | 1         | 2         |
| (no rows)                            | 0     | 0       | 0         | 0         |


<!-- @trace
source: etf-overview-cards
updated: 2026-06-12
code:
  - src/components/features/investment/EtfOverviewGrid.tsx
  - src/app/investment/page.tsx
  - src/components/features/investment/InvestmentTabs.tsx
  - src/components/features/investment/EtfOverviewCard.tsx
  - src/lib/investment/etfOverviewStats.ts
tests:
  - src/components/features/investment/__tests__/etfOverviewSort.test.ts
  - src/lib/investment/__tests__/etfOverviewStats.test.ts
-->

---
### Requirement: ETF overview card grid

The system SHALL render an "ETF 總覽" tab on the `/investment` page displaying one card per ETF in a responsive grid. Each card MUST show the ETF code, name, manager, disclosure date, NAV, AUM, holdings count, and four diff badges (新增/刪除/加碼/減碼). Each card MUST link to `/investment/[etf]` for that ETF.

#### Scenario: Card navigation

- **WHEN** the user clicks the card for 00981A
- **THEN** the browser navigates to `/investment/00981A`

#### Scenario: Stale disclosure indication

- **WHEN** an ETF's disclosure date is earlier than the maximum disclosure date across all ETFs
- **THEN** its disclosure date is rendered with a muted (gray) visual treatment, while up-to-date ETFs render the date in the default emphasis style

#### Scenario: Missing NAV display

- **WHEN** an ETF's NAV or AUM is null
- **THEN** the card renders "—" for that field instead of 0 or an empty string


<!-- @trace
source: etf-overview-cards
updated: 2026-06-12
code:
  - src/components/features/investment/EtfOverviewGrid.tsx
  - src/app/investment/page.tsx
  - src/components/features/investment/InvestmentTabs.tsx
  - src/components/features/investment/EtfOverviewCard.tsx
  - src/lib/investment/etfOverviewStats.ts
tests:
  - src/components/features/investment/__tests__/etfOverviewSort.test.ts
  - src/lib/investment/__tests__/etfOverviewStats.test.ts
-->

---
### Requirement: Card ordering

The grid SHALL order cards by disclosure freshness first (ETFs whose disclosure date equals the global maximum date come first), then by AUM descending within each freshness group. ETFs with null AUM SHALL sort after ETFs with a known AUM within the same freshness group.

#### Scenario: Fresh ETFs precede stale ETFs

- **WHEN** the global maximum disclosure date is 2026-06-12
- **THEN** every ETF disclosed on 2026-06-12 appears before any ETF disclosed earlier, regardless of AUM

##### Example: ordering

- **GIVEN** ETFs: A(date=2026-06-12, aum=175), B(date=2026-06-05, aum=2834), C(date=2026-06-12, aum=498), D(date=2026-06-12, aum=null)
- **WHEN** the grid renders
- **THEN** the order is C, A, D, B


<!-- @trace
source: etf-overview-cards
updated: 2026-06-12
code:
  - src/components/features/investment/EtfOverviewGrid.tsx
  - src/app/investment/page.tsx
  - src/components/features/investment/InvestmentTabs.tsx
  - src/components/features/investment/EtfOverviewCard.tsx
  - src/lib/investment/etfOverviewStats.ts
tests:
  - src/components/features/investment/__tests__/etfOverviewSort.test.ts
  - src/lib/investment/__tests__/etfOverviewStats.test.ts
-->

---
### Requirement: Taiwan market color convention for diff badges

Diff badges MUST follow the Taiwan market color convention: 新增 (IN) and 加碼 (BUY) badges use the rose color family (`text-rose-600` / `dark:text-rose-400`), 刪除 (OUT) and 減碼 (SELL) badges use the emerald color family (`text-emerald-600` / `dark:text-emerald-400`). Badges with a count of 0 MUST render in a neutral muted style instead of rose or emerald.

#### Scenario: Badge coloring

- **WHEN** a card has counts added=3, removed=0, increased=26, decreased=18
- **THEN** the 新增 and 加碼 badges render in rose, the 減碼 badge renders in emerald, and the 刪除 badge renders in the neutral muted style

<!-- @trace
source: etf-overview-cards
updated: 2026-06-12
code:
  - src/components/features/investment/EtfOverviewGrid.tsx
  - src/app/investment/page.tsx
  - src/components/features/investment/InvestmentTabs.tsx
  - src/components/features/investment/EtfOverviewCard.tsx
  - src/lib/investment/etfOverviewStats.ts
tests:
  - src/components/features/investment/__tests__/etfOverviewSort.test.ts
  - src/lib/investment/__tests__/etfOverviewStats.test.ts
-->