## ADDED Requirements

### Requirement: Equity page inline components are extracted to dedicated files

The `src/app/investment/equity/page.tsx` file SHALL NOT contain inline component function definitions. The five components (`DoubleSignalSection`, `HighBadge`, `SortableHeader`, `HolderPctCell`, `RankingTable`) SHALL each reside in a separate file under `src/components/features/investment/equity/`. The page file SHALL import these components by name and SHALL be no longer than 80 lines.

#### Scenario: Page file contains no function component definitions

- **WHEN** `src/app/investment/equity/page.tsx` is read
- **THEN** it SHALL contain zero `function` declarations that return JSX at module scope (excluding the default export page component)
- **THEN** it SHALL import all UI components from `src/components/features/investment/equity/`

#### Scenario: Each extracted component is within the 150-line limit

- **WHEN** any file under `src/components/features/investment/equity/` is read
- **THEN** it SHALL be no longer than 150 lines

##### Example: component file mapping

| Component | File |
|-----------|------|
| `DoubleSignalSection` | `src/components/features/investment/equity/DoubleSignalSection.tsx` |
| `HighBadge` | `src/components/features/investment/equity/HighBadge.tsx` |
| `SortableHeader` | `src/components/features/investment/equity/SortableHeader.tsx` |
| `HolderPctCell` | `src/components/features/investment/equity/HolderPctCell.tsx` |
| `RankingTable` | `src/components/features/investment/equity/RankingTable.tsx` |

### Requirement: Equity page delegates data fetching to a dedicated module

All data-fetching and sorting functions (`fetchPriceIndicators`, `applySortToRows`, `fetchRankingData`) SHALL be moved from `src/app/investment/equity/page.tsx` to `src/lib/investment/equityPageData.ts`. The data module SHALL have `import 'server-only'` at the top. Local TypeScript interfaces used only by these functions (`EquityRow`, `PriceIndicator`, `RankingData`, `SortKey`, `SortDir`, `Tier`) SHALL be co-located in `equityPageData.ts` or a companion `src/lib/investment/equityTypes.ts`.

#### Scenario: Data module exports all required functions

- **WHEN** `src/lib/investment/equityPageData.ts` exists
- **THEN** it SHALL export `fetchPriceIndicators`, `applySortToRows`, and `fetchRankingData`
- **THEN** it SHALL contain `import 'server-only'` as its first import

#### Scenario: Type definitions are co-located with data module

- **WHEN** `src/app/investment/equity/page.tsx` is read
- **THEN** it SHALL NOT define `EquityRow`, `PriceIndicator`, `RankingData`, `SortKey`, `SortDir`, or `Tier` interfaces
- **THEN** these types SHALL be importable from `src/lib/investment/equityPageData` or `src/lib/investment/equityTypes`
