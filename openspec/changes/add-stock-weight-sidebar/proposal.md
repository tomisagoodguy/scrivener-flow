# Add Stock Weight Sidebar

## Context

Users need a detailed view of weight changes for all stocks over a selected time range (1D, 3D, 5D), not just the top movers shown in the `ChangeImpactChart`. The current chart provides a high-level overview, but lacks the granularity required for deep analysis of fund manager moves.

## Problem

- Users cannot easily see the weight changes for stocks outside the top 10.
- Users cannot efficiently compare weight changes across different time periods for all holdings.
- Lack of a dedicated list view makes it hard to track smaller but significant adjustments.

## Solution

Implement a "Stock Weight Change Sidebar" (using a Sheet/Drawer component) that:

1. Lists all stocks with their weight changes over the selected time range.
2. Allows switching between 1D, 3D, and 5D time ranges.
3. Provides sorting capabilities (e.g., by weight change, stock code).
4. Is accessible from the `ChangeImpactChart` via a "View All" button.

## Value

- **Enhanced Visibility**: Users can track all portfolio adjustments, not just the largest ones.
- **Deeper Analysis**: Facilitates detailed analysis of fund rebalancing strategies over multiple days.
- **Improved UX**: Provides a dedicated space for detailed data without cluttering the main dashboard.
