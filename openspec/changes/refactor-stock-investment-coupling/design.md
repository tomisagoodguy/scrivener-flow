# Decoupling Design for Stock Weight Analysis

## Change

`refactor-stock-investment-coupling`

## Domain Modeling

### Log Interfaces

Refine `DiffLog` interface (if needed) but primarily rely on existing `src/types/investment.ts`.

- If `logs` structure is different (e.g. `diff_shares`), we map it properly.
- Current `logs` in `StockWeightSidebar` has `impact` (sum of `diff_weight`), and `stock_code`.

### Hook Interface `useStockWeightAnalysis`

```typescript
interface UseStockWeightAnalysisArgs {
  logs: DiffLog[];
  timeRange: '1D' | '3D' | '5D';
}

interface StockImpact {
  code: string;
  name: string;
  impact: number;
}

interface UseStockWeightAnalysisResult {
  data: StockImpact[];
  sortedData: (key: SortKey, direction: SortDirection) => StockImpact[];
}
```

## Component Structure

- `ChangeImpactChart.tsx`: Gets processed data (top 10 by impact) using the hook.
- `StockWeightSidebar.tsx`: Gets full processed data (all stocks) or slices it, but primarily uses the hook to avoid duplicating logic.
  - It might accept `logs` prop still to keep flexibility, but internally uses the hook.
- `StockTrendChart.tsx`: Pure component focusing on rendering the bar chart for a single stock code.

## Benefits / Trade-offs

- **Pros**:
  - Adding `30D` range only needs change in one place.
  - Fixing "diff_weight" accumulation bug only needs change in one place.
  - Better testability of logic separate from React rendering.
- **Cons**:
  - Slightly more complex usage if props are deeply drilled, but hook composition solves this.
