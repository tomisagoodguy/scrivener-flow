# Refactor Tasks

## Change

`refactor-stock-investment-coupling`

## Development

- [x] Create `useStockWeightAnalysis.ts` hook in `src/components/features/investment/hooks/`.
  - [x] Include filtering logic for `1D`, `3D`, `5D`.
  - [x] Include accumulation logic for `diff_weight`.
- [x] Refactor `StockWeightSidebar.tsx`:
  - [x] Remove `processedData` useMemo.
  - [x] Use `useStockWeightAnalysis` hook (or component composition).
  - [x] Fix Prop Types to use `DiffLog[]` or refined type.
  - [x] Extract `StockTrendChart` to `src/components/features/investment/StockTrendChart.tsx`.
- [x] Refactor `ChangeImpactChart.tsx`:
  - [x] Remove duplicate aggregation logic.
  - [x] Use `useStockWeightAnalysis` hook.
  - [x] Ensure consistent behavior for "Top 10" slice.
- [x] Verify unit tests / behavior for charts.

## Validation

- [x] Check if `ChangeImpactChart` renders correctly with mocked `DiffLog[]`.
- [x] Check sidebar toggle functionality.
- [x] Verify `StockTrendChart` tooltip formatting (no `any`).

## Clean Up

- [x] Remove any unused imports in `ChangeImpactChart` and `StockWeightSidebar`.
