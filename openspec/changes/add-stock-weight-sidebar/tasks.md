# Tasks for Add Stock Weight Sidebar

- [ ] Create `StockWeightSidebar` Component
  - [ ] Create `components/features/investment/StockWeightSidebar.tsx` using `Sheet` from Shadcn UI (or similar Drawer).
  - [ ] Define props: `logs: any[]`, `defaultTimeRange: '1D' | '3D' | '5D'`.
  - [ ] Implement `timeRange` state.
  - [ ] Implement aggregation logic (similar to `ChangeImpactChart`) to calculate diffs for all stocks in the range.
  - [ ] Render a detailed list/table of stocks showing Code, Name, Weight Diff (with colors), and Current Weight (if available/computable easily, or just diff).
  - [ ] Add sorting functionality (by Impact or Code).

- [ ] Integrate into `ChangeImpactChart` and `InvestmentPage`
  - [ ] Add a "View All" button or trigger in `ChangeImpactChart` header.
  - [ ] Pass necessary `logs` data to the `StockWeightSidebar`.
  - [ ] Ensure responsive design for the sidebar.
  - [ ] Add a visual indicator for the active time range in the sidebar.

- [ ] Verify
  - [ ] Ensure correct data filtering for 1D, 3D, 5D.
  - [ ] Check if the sidebar opens/closes smoothly.
  - [ ] Verify correct calculation of cumulative weight changes.
  - [ ] Verify sorting works as expected.
