# Refactor Stock Weight Logic Coupling

## Change

`refactor-stock-investment-coupling`

## Summary

Refactor `StockWeightSidebar` and `ChangeImpactChart` to decouple data processing logic from UI components, remove duplicate code, and eliminate `any` type usage.

## Problem

- **`src/components/features/investment/StockWeightSidebar.tsx`**: Contains complex data aggregation logic in `useMemo`, uses `any` for logs, and defines a child component `StockTrendChart` inline.
- **`src/components/features/investment/ChangeImpactChart.tsx`**: Duplicates the same data aggregation logic (summing `diff_weight` by stock code over time ranges).
- **Type Safety**: Both components use `any[]` for loop data instead of `DiffLog[]` or similar.

## What Changes

1. **Extract Hook**: Create a `useStockWeightAnalysis` hook to centralize the logic for filtering logs by date range (1D, 3D, 5D) and aggregating weight impacts.
2. **Strict Typing**: Use `DiffLog` interface from `src/types/investment.ts` (or create if needed for specific fields).
3. **Component Separation**: Move `StockTrendChart` to its own file.
4. **Decoupling**: Refactor `StockWeightSidebar` to be a pure UI component that receives processed data or uses the hook internally, removing the need for `ChangeImpactChart` to pass raw logs if context allows, or at least standardized props.

## Why

Decoupling data processing from UI logic is crucial for long-term maintainability. Currently, any change to how "weight impact" is calculated requires updates in multiple places, leading to potential inconsistencies and bugs. By centralizing this logic in a hook and strictly typing data, we improve code reliability, developer experience, and set a pattern for future chart implementations.

## Impact

- **Maintainability**: Single source of truth for "impact calculation".
- **Readability**: Components focus on rendering.
- **Type Safety**: Reduced runtime errors.
