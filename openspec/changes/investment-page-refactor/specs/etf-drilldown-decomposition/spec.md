## ADDED Requirements

### Requirement: ETF drilldown page delegates data fetching to a dedicated module

The `src/app/investment/[etf]/page.tsx` file SHALL NOT contain inline async data-fetching functions. All five functions (`getHoldings`, `fetchQuantFilters`, `getRankingHistory`, `getEtfNews`, `getDiffLogs`) SHALL be moved to `src/lib/investment/etfPageData.ts`. The page file SHALL import and call these functions but SHALL NOT define them inline. The data module SHALL have `import 'server-only'` at the top to prevent accidental client-side imports.

#### Scenario: Page file contains no async data function definitions

- **WHEN** `src/app/investment/[etf]/page.tsx` is read
- **THEN** it SHALL contain zero `async function get*` or `async function fetch*` definitions at module scope
- **THEN** it SHALL import data functions from `src/lib/investment/etfPageData`
- **THEN** it SHALL be no longer than 100 lines

#### Scenario: Data module exports all required functions

- **WHEN** `src/lib/investment/etfPageData.ts` exists
- **THEN** it SHALL export `getHoldings`, `fetchQuantFilters`, `getRankingHistory`, `getEtfNews`, and `getDiffLogs`
- **THEN** it SHALL contain `import 'server-only'` as its first import

##### Example: function signatures preserved

| Function | Return type |
|----------|-------------|
| `getHoldings(etfCode: string)` | `Promise<{ holdings: Holding[]; updatedAt: string \| null; dataDate: string \| null }>` |
| `fetchQuantFilters(stockCodes: string[])` | `Promise<Record<string, QuantFilter>>` |
| `getRankingHistory(etfCode: string)` | `Promise<RankingHistoryRow[]>` |
| `getEtfNews(etfCode: string)` | `Promise<EtfNewsRow[]>` |
| `getDiffLogs(etfCode: string)` | `Promise<DiffLogWithMeta[]>` |

### Requirement: DrilldownTabs component is split into container and sub-components

The `src/components/features/investment/DrilldownTabs.tsx` file SHALL be no longer than 80 lines and SHALL delegate rendering of the tab bar and today-diff summary to sub-components. A `src/components/features/investment/drilldown/` directory SHALL contain `DrilldownTabBar.tsx` and `TodayDiffSummary.tsx`. Each sub-component SHALL be no longer than 150 lines.

#### Scenario: DrilldownTabs delegates tab bar rendering

- **WHEN** `DrilldownTabs.tsx` renders
- **THEN** tab button rendering logic SHALL be inside `DrilldownTabBar.tsx`
- **THEN** `DrilldownTabs.tsx` SHALL import `DrilldownTabBar` from `./drilldown/DrilldownTabBar`

#### Scenario: TodayDiffSummary is an independent component

- **WHEN** today has active diff logs
- **THEN** the summary card SHALL be rendered by `TodayDiffSummary.tsx`
- **THEN** `DrilldownTabs.tsx` SHALL pass `todayDiffs` as a prop to `TodayDiffSummary`
