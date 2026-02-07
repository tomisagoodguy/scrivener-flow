# Design: Stock Weight Sidebar

## Context

Users want to inspect the weight changes of *all* stocks in the portfolio, beyond the top impacts summarized in the `ChangeImpactChart`.

## UI Component: `StockWeightSidebar`

- **Container**: `Sheet` (from Shadcn/UI) sliding in from the right.
- **Header**: "Recent Weight Changes" + Time Range Selector (1D, 3D, 5D).
- **Body**: Scrollable list of stocks.
  - **Rows**: Stock Code, Name, Weight Change (`diff_weight`).
  - **Visuals**: Color-coded changes (+/-).
  - **Sort**: Default by absolute change desc, toggle to sort by Code.

## Data

- Reuse `etf_diff_logs` passed from `InvestmentPage`.
- **Client-side filtering**:
  1. Get unique dates descending.
  2. Take top N dates based on Time Range.
  3. Filter logs for those dates.
  4. Aggregate `diff_weight` per `stock_code`.
  5. Calculate sum.

## Interactions

- **Entry**: "View All" button in `ChangeImpactChart`.
- **Time Range**: Sync with chart? Or independent? Let's make it *independent* but default to chart's selection if feasible. simpler: default to 1D or pass `initialTimeRange`.
- **Exit**: Close button or click outside.

## Dependencies

- `ChangeImpactChart.tsx` (modifying to add trigger)
- `Sheet` component (ensure installed/available).

## Code Structure

`src/components/features/investment/StockWeightSidebar.tsx`
`src/components/features/investment/ChangeImpactChart.tsx` (update)
