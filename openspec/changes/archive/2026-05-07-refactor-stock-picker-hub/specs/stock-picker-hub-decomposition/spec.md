## ADDED Requirements

### Requirement: StockPickerHub component size limit

The `StockPickerHub.tsx` component SHALL be at most 150 lines after refactoring. It SHALL only compose sub-components and pass props; it SHALL NOT contain data transformation logic, sort logic, or filter computation.

#### Scenario: Component file within size limit

- **WHEN** the refactored `StockPickerHub.tsx` is measured
- **THEN** the file SHALL contain 150 lines or fewer

#### Scenario: No inline business logic

- **WHEN** `StockPickerHub.tsx` is reviewed
- **THEN** it SHALL contain no `Array.prototype` transformation calls (`map`, `filter`, `sort`, `reduce`) beyond rendering lists of sub-components

### Requirement: Hook encapsulates all state and computation

`useStockPickerHub.ts` SHALL encapsulate `buildUnifiedHoldings()`, `sortHoldings()`, search query state, ETF selection state, active factor state, and sort field/order state. The hook SHALL return derived data and handlers as a typed object.

#### Scenario: Hook returns complete interface

- **WHEN** a component calls `useStockPickerHub(etfs, quantFilters, signals)`
- **THEN** the return value SHALL include `sortedHoldings`, `selectedEtfs`, `activeFactors`, `sortField`, `sortOrder`, `searchQuery`, `activeEtfCodes`, `etfColorMap`, `panelStock`, and all toggle/sort handlers

#### Scenario: buildUnifiedHoldings inside hook

- **WHEN** `selectedEtfs` changes
- **THEN** `useStockPickerHub` SHALL recompute unified holdings via `useMemo` without requiring the parent component to call any transformation function directly

### Requirement: FactorFilterChips is a standalone component

`FactorFilterChips.tsx` SHALL render all factor filter chip rows (新高, 量化M·T·R, 基本, 進階) and SHALL NOT hold any filter state internally. It SHALL accept `activeFactors`, `selectedEtfsSize`, and `onToggle` / `onClear` as props.

#### Scenario: Chip reflects active state from props

- **WHEN** `activeFactors` prop contains a factor key
- **THEN** the corresponding chip SHALL render the active color class and a ✓ prefix

#### Scenario: Clear button visibility

- **WHEN** `activeFactors` is empty
- **THEN** the clear button SHALL NOT be rendered
- **WHEN** `activeFactors` has one or more entries
- **THEN** the clear button SHALL be rendered

### Requirement: HoldingsTable renders table structure

`HoldingsTable.tsx` SHALL render the `<table>`, `<thead>`, and `<tbody>` structure. It SHALL accept `holdings`, `activeEtfCodes`, `etfColorMap`, `sortField`, `sortOrder`, and `onSort` as props. Row rendering SHALL be delegated to `HoldingsTableRow.tsx`.

#### Scenario: Sort header triggers callback

- **WHEN** a user clicks a `<th>` column header
- **THEN** `onSort` SHALL be called with the corresponding `SortField` value

### Requirement: HoldingsTableRow renders a single holding row

`HoldingsTableRow.tsx` SHALL render one `<tr>` for a `UnifiedHolding` entry. It SHALL accept `holding`, `activeEtfCodes`, `etfColorMap`, `selectedEtfsSize`, `sortField`, `sortOrder`, `signals`, and `onOpenPanel` as props. It SHALL NOT hold any state.

#### Scenario: Panel opens on name click

- **WHEN** user clicks the stock name button in the row
- **THEN** `onOpenPanel` SHALL be called with `(stock_code, stock_name)`

### Requirement: Shared types live in a dedicated file

All TypeScript interfaces shared across the split components (`HoldingItem`, `EtfData`, `QuantFilter`, `StockPickerHubProps`, `UnifiedHolding`, `SortField`, `SortOrder`, `FactorFilter`) SHALL be defined in `StockPickerHub.types.ts`. No component file SHALL re-declare these types locally.

#### Scenario: Single import source for types

- **WHEN** any component or hook in the StockPickerHub module imports a shared type
- **THEN** the import SHALL reference `./StockPickerHub.types` (or `@/components/features/investment/StockPickerHub.types`)
