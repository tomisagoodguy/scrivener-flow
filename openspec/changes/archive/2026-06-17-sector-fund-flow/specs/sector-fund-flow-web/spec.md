## ADDED Requirements

### Requirement: Sector overview tab in DailyFlowPanel

`DailyFlowPanel` SHALL provide a "產業總覽" (sector overview) tab alongside the existing per-stock inflow, per-stock outflow, and per-ETF subtotal tabs. The tab SHALL read the day's `by_sector` data from `etf_flow_daily` and list parent themes ordered by net flow descending. Net flow SHALL follow the Taiwan stock color convention: net inflow rendered in `text-rose-600` (red, up) and net outflow in `text-emerald-600` (green, down).

#### Scenario: Render parent themes by net flow

- **WHEN** the day's `by_sector` contains parent themes
- **THEN** the sector overview tab SHALL list them ordered by net flow descending, with net inflow shown in red and net outflow shown in green

#### Scenario: No sector data available

- **WHEN** the day's `by_sector` is NULL or an empty list
- **THEN** the sector overview tab SHALL display a "無產業資料" (no sector data) message

### Requirement: Expandable sub-theme detail

Each parent theme row in the sector overview tab SHALL be expandable to reveal its child sub-themes, and collapsible to hide them. The tab SHALL display an advisory note that amounts are grouped by theme and a single stock can be counted in multiple themes.

#### Scenario: Expand a parent theme

- **WHEN** the user clicks a parent theme row
- **THEN** the row SHALL expand to show its child sub-themes with their own net flow, inflow, and outflow figures

#### Scenario: Collapse an expanded parent theme

- **WHEN** the user clicks an already-expanded parent theme row
- **THEN** the child sub-themes SHALL be hidden

#### Scenario: Double-counting advisory shown

- **WHEN** the sector overview tab is displayed with parent themes
- **THEN** an advisory note stating amounts are grouped by theme and stocks can be counted in multiple themes SHALL be visible
