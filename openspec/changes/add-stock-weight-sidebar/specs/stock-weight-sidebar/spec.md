# Stock Weight Sidebar Spec

## ADDED Requirements

### Stock Weight Change Sidebar

#### Scenario: User wants to see *all* stock weight changes for a selected period

- **Given** I am on the `/investment` page, viewing the `ChangeImpactChart`.
- **When** I click the "View All" button (or similar trigger).
- **Then** a sidebar (Sheet/Drawer) should open from the right side of the screen.
- **And** the sidebar should display a list of all stocks that had weight changes during the selected period.
- **And** the list should include: Stock Code, Stock Name, Weight Change (diff), and be color-coded (red/green).

#### Scenario: User changes the time range in the sidebar

- **Given** the sidebar is open.
- **When** I click "3D" or "5D" in the sidebar's time range selector.
- **Then** the list should update to show cumulative weight changes over the selected 3 or 5 days.
- **And** the title should reflect the selected time range.

#### Scenario: User sorts the weight change list

- **Given** the sidebar is open and displaying a list of stocks.
- **When** I click the "Impact" column header (default sort).
- **Then** the list should be sorted by the absolute value of weight change (descending).
- **When** I click the "Code" column header.
- **Then** the list should be sorted by Stock Code (ascending).

## MODIFIED Requirements

### ChangeImpactChart Integration

#### Scenario: Triggering the sidebar from the chart component

- **Given** the `ChangeImpactChart` is rendered.
- **When** the user interacts with the new "View All Details" button in the chart header.
- **Then** the `StockWeightSidebar` creation should be triggered (via state change).
