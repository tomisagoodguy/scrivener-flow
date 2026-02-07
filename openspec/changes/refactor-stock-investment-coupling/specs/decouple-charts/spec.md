# Decouple Stock Investment Charts

## ADDED Requirements

### Use Stock Weight Analysis Hook

#### Scenario: Hook Usage

- **Scenario**: When `StockWeightSidebar` renders, it MUST use `useStockWeightAnalysis` hook to process `logs` based on the selected `timeRange`.
  - It MUST NOT duplicate filtering/aggregation logic internally.
  - It MUST display correct aggregated `impact` value for each stock code.
- **Scenario**: When `ChangeImpactChart` renders, it MUST use the same `useStockWeightAnalysis` hook.
  - It MUST render the top 10 stocks by absolute impact value.
  - It MUST update correctly when `timeRange` changes (1D, 3D, 5D).

### Strict Typing

#### Scenario: Type Enforcement

- **Scenario**: Components interacting with log data MUST use `DiffLog` type from `src/types/investment.ts`.
  - Any usage of `any[]` for `logs` props MUST be replaced with `DiffLog[]` (or correct interface if `DiffLog` is insufficient, but it appears sufficient).
  - Tooltip formatters in charts MUST be typed (e.g. `(value: number) => [string, string]`).

### Extract Stock Trend Chart

#### Scenario: Extracted Component

- **Scenario**: `StockTrendChart` MUST be a standalone component in `src/components/features/investment/StockTrendChart.tsx`.
  - It accepts `code: string` and `logs: DiffLog[]` props.
  - It renders the bar chart for historical weight changes for the given code.
  - It handles its own date sorting/filtering (last 5 entries) internally or via a helper.

## MODIFIED Requirements

### No Functional Changes

#### Scenario: Behavior Preservation

- **Scenario**: Refactoring existing logic MUST keep functionality same.

## REMOVED Requirements

### Duplicate Logic

#### Scenario: Removed Redundancy

- **Scenario**: `StockWeightSidebar.tsx` and `ChangeImpactChart.tsx` NO LONGER contain `useMemo` block with duplicate logic for:
  - `uniqueDates` sorting
  - `daysToTake` calculation
  - `targetLogs` filtering
  - `aggregatedMap` reduction

### Inline Components

#### Scenario: No Inline Charts

- **Scenario**: `StockWeightSidebar.tsx` NO LONGER defines `StockTrendChart` internally.
