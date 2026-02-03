# Dashboard & Holdings Optimization

## Summary

Refined the Investment Dashboard and Holdings Table based on user feedback to improve navigation context, data visibility, and UI clarity.

## Changes

### 1. Navigation with Filter Persistence

- **File:** `src/app/investment/dashboard/[code]/page.tsx`
- **Change:** Updated `handlePrev` and `handleNext` to inspect current URL search parameters.
- **Effect:** When navigating between stock details, the filtered list context (e.g., "High 20d", "Sorted by Weight") is preserved. Users no longer lose their place or filter context.

### 2. Holdings Table Cleanup

- **File:** `src/components/features/investment/HoldingsTable.tsx` & `HoldingRow.tsx`
- **Change:** Removed the "Revenue (Billions)" column (`monthly_revenue`).
- **Effect:** Reduced table clutter as requested.

### 3. Revenue Data Visualization (YoY & MoM)

- **File:** `src/app/investment/page.tsx`
- **Change:** Updated data fetching logic to correctly retrieve `revenue_yoy` and `revenue_mom` from `stock_revenue_monthly` table.
- **File:** `src/components/features/investment/HoldingsOverview.tsx`
- **Change:** Converted the Revenue YoY chart to a `ComposedChart`.
- **Effect:** Now displays **YoY (Bar)** and **MoM (Line)** on the same chart for better momentum analysis.

### 4. Diff Ledger Optimization

- **File:** `src/components/features/investment/DiffLedger.tsx`
- **Change:** Limited the history display to the **latest 10 days**.
- **Effect:** Improved readability and load performance by focusing on recent manager moves.

## Verification

- Validated `Holding` interface includes `revenue_mom`.
- Checked navigation logic preserves `?filters=...` in URL.
- Verified chart composition in `HoldingsOverview`.
