# cases-widget-layout Specification

## Purpose

TBD - created by archiving change 'cases-customizable-widgets'. Update Purpose after archive.

## Requirements

### Requirement: Default Layout for Unconfigured Users

The system SHALL render the `/cases` page widgets using a fixed default layout (all widgets visible, in the current order: export-buttons, rapid-input, quick-navigator, pipeline-chart, eisenhower-matrix) for any user who has no stored `cases_layout` value, so existing behavior is unchanged until a user explicitly customizes it.

#### Scenario: First visit with no stored layout

- **WHEN** a user who has never customized their `/cases` widgets loads the case management page
- **THEN** the system SHALL display all widgets in the default order identical to the pre-existing hardcoded layout

#### Scenario: Stored layout fails schema validation

- **WHEN** the system reads a `cases_layout` value that does not conform to the widget layout schema
- **THEN** the system SHALL fall back to the default layout instead of failing to render the page


<!-- @trace
source: cases-customizable-widgets
updated: 2026-07-14
code:
  - src/app/cases/page.tsx
  - src/components/features/cases/CasesWidgetLayout.tsx
  - src/app/actions/casesLayout.ts
  - src/domain/cases/layoutTypes.ts
  - src/components/dashboard/eisenhower/QuadrantCell.tsx
  - src/components/dashboard/DashboardWidgetShell.tsx
  - src/hooks/useCasesLayout.ts
  - src/components/dashboard/HiddenWidgetsMenu.tsx
  - src/components/dashboard/WorkDashboard.tsx
  - supabase/migrations/20260714140000_add_cases_layout.sql
tests:
  - src/components/dashboard/__tests__/DashboardWidgetShell.test.tsx
  - src/hooks/__tests__/useCasesLayout.test.ts
  - src/domain/cases/__tests__/layoutTypes.test.ts
  - src/components/features/cases/__tests__/CasesWidgetLayout.test.tsx
  - src/app/actions/__tests__/casesLayout.test.ts
  - src/components/dashboard/__tests__/HiddenWidgetsMenu.test.tsx
-->

---
### Requirement: Widget Visibility Toggle

The system SHALL allow a user to hide any `/cases` page widget (export-buttons, rapid-input, quick-navigator, pipeline-chart, eisenhower-matrix) by clicking a dismiss control on that widget, immediately removing it from the rendered layout.

#### Scenario: User hides a widget

- **WHEN** a user clicks the dismiss ("X") control on a visible widget (e.g. quick-navigator)
- **THEN** the system SHALL remove that widget from the rendered `/cases` page and mark it as not visible in the persisted layout


<!-- @trace
source: cases-customizable-widgets
updated: 2026-07-14
code:
  - src/app/cases/page.tsx
  - src/components/features/cases/CasesWidgetLayout.tsx
  - src/app/actions/casesLayout.ts
  - src/domain/cases/layoutTypes.ts
  - src/components/dashboard/eisenhower/QuadrantCell.tsx
  - src/components/dashboard/DashboardWidgetShell.tsx
  - src/hooks/useCasesLayout.ts
  - src/components/dashboard/HiddenWidgetsMenu.tsx
  - src/components/dashboard/WorkDashboard.tsx
  - supabase/migrations/20260714140000_add_cases_layout.sql
tests:
  - src/components/dashboard/__tests__/DashboardWidgetShell.test.tsx
  - src/hooks/__tests__/useCasesLayout.test.ts
  - src/domain/cases/__tests__/layoutTypes.test.ts
  - src/components/features/cases/__tests__/CasesWidgetLayout.test.tsx
  - src/app/actions/__tests__/casesLayout.test.ts
  - src/components/dashboard/__tests__/HiddenWidgetsMenu.test.tsx
-->

---
### Requirement: Case List Table Is Not Customizable

The system SHALL always render the case list table on the `/cases` page regardless of widget visibility or order settings, and SHALL NOT provide a dismiss control, drag handle, or hide/reorder capability for the table.

#### Scenario: Case list table remains visible with all widgets hidden

- **WHEN** a user has hidden every customizable widget (export-buttons, rapid-input, quick-navigator, pipeline-chart, eisenhower-matrix)
- **THEN** the system SHALL still render the case list table with its existing milestone-priority sort order unchanged

#### Scenario: Case list table has no dismiss control

- **WHEN** a user views the case list table
- **THEN** the system SHALL NOT render a dismiss control or drag handle on it


<!-- @trace
source: cases-customizable-widgets
updated: 2026-07-14
code:
  - src/app/cases/page.tsx
  - src/components/features/cases/CasesWidgetLayout.tsx
  - src/app/actions/casesLayout.ts
  - src/domain/cases/layoutTypes.ts
  - src/components/dashboard/eisenhower/QuadrantCell.tsx
  - src/components/dashboard/DashboardWidgetShell.tsx
  - src/hooks/useCasesLayout.ts
  - src/components/dashboard/HiddenWidgetsMenu.tsx
  - src/components/dashboard/WorkDashboard.tsx
  - supabase/migrations/20260714140000_add_cases_layout.sql
tests:
  - src/components/dashboard/__tests__/DashboardWidgetShell.test.tsx
  - src/hooks/__tests__/useCasesLayout.test.ts
  - src/domain/cases/__tests__/layoutTypes.test.ts
  - src/components/features/cases/__tests__/CasesWidgetLayout.test.tsx
  - src/app/actions/__tests__/casesLayout.test.ts
  - src/components/dashboard/__tests__/HiddenWidgetsMenu.test.tsx
-->

---
### Requirement: Hidden Widgets Restore Entry Point

The system SHALL display a persistent entry-point control on the `/cases` page whenever at least one widget is hidden, allowing the user to reopen a list of hidden widgets and restore any of them.

#### Scenario: Entry point appears after hiding a widget

- **WHEN** a user hides at least one `/cases` page widget
- **THEN** the system SHALL display a persistent button that, when clicked, opens a list of all currently hidden widgets

#### Scenario: Entry point disappears when no widgets are hidden

- **WHEN** no `/cases` page widgets are currently hidden
- **THEN** the system SHALL NOT display the hidden-widgets entry-point button

#### Scenario: User restores a hidden widget

- **WHEN** a user opens the hidden-widgets list and selects a hidden widget
- **THEN** the system SHALL mark that widget as visible, append it to the end of the rendered order, and remove it from the hidden-widgets list


<!-- @trace
source: cases-customizable-widgets
updated: 2026-07-14
code:
  - src/app/cases/page.tsx
  - src/components/features/cases/CasesWidgetLayout.tsx
  - src/app/actions/casesLayout.ts
  - src/domain/cases/layoutTypes.ts
  - src/components/dashboard/eisenhower/QuadrantCell.tsx
  - src/components/dashboard/DashboardWidgetShell.tsx
  - src/hooks/useCasesLayout.ts
  - src/components/dashboard/HiddenWidgetsMenu.tsx
  - src/components/dashboard/WorkDashboard.tsx
  - supabase/migrations/20260714140000_add_cases_layout.sql
tests:
  - src/components/dashboard/__tests__/DashboardWidgetShell.test.tsx
  - src/hooks/__tests__/useCasesLayout.test.ts
  - src/domain/cases/__tests__/layoutTypes.test.ts
  - src/components/features/cases/__tests__/CasesWidgetLayout.test.tsx
  - src/app/actions/__tests__/casesLayout.test.ts
  - src/components/dashboard/__tests__/HiddenWidgetsMenu.test.tsx
-->

---
### Requirement: Widget Reordering via Drag and Drop

The system SHALL allow a user to reorder `/cases` page widgets by dragging a widget to a new position, immediately applying the new order to the rendered layout.

#### Scenario: User drags a widget to a new position

- **WHEN** a user drags a widget's drag handle and drops it at a new position among the other visible widgets
- **THEN** the system SHALL re-render the `/cases` page with widgets in the new order

##### Example: reordering three widgets

| Before order | Action | After order |
| --- | --- | --- |
| rapid-input, quick-navigator, pipeline-chart | drag pipeline-chart to first position | pipeline-chart, rapid-input, quick-navigator |


<!-- @trace
source: cases-customizable-widgets
updated: 2026-07-14
code:
  - src/app/cases/page.tsx
  - src/components/features/cases/CasesWidgetLayout.tsx
  - src/app/actions/casesLayout.ts
  - src/domain/cases/layoutTypes.ts
  - src/components/dashboard/eisenhower/QuadrantCell.tsx
  - src/components/dashboard/DashboardWidgetShell.tsx
  - src/hooks/useCasesLayout.ts
  - src/components/dashboard/HiddenWidgetsMenu.tsx
  - src/components/dashboard/WorkDashboard.tsx
  - supabase/migrations/20260714140000_add_cases_layout.sql
tests:
  - src/components/dashboard/__tests__/DashboardWidgetShell.test.tsx
  - src/hooks/__tests__/useCasesLayout.test.ts
  - src/domain/cases/__tests__/layoutTypes.test.ts
  - src/components/features/cases/__tests__/CasesWidgetLayout.test.tsx
  - src/app/actions/__tests__/casesLayout.test.ts
  - src/components/dashboard/__tests__/HiddenWidgetsMenu.test.tsx
-->

---
### Requirement: Layout Persistence Across Sessions

The system SHALL persist each user's `/cases` widget visibility and order to the database, scoped to that user, so the layout is identical the next time the user loads the `/cases` page from any device or browser.

#### Scenario: Layout persists after reload

- **WHEN** a user hides a widget or reorders widgets on `/cases` and then reloads the page
- **THEN** the system SHALL render the page using the previously saved visibility and order

#### Scenario: Layout persists across devices

- **WHEN** a user customizes their `/cases` layout on one device and then logs in on a different device
- **THEN** the system SHALL render the page using the same saved layout

#### Scenario: Persistence failure does not corrupt displayed state

- **WHEN** saving a `/cases` layout change to the database fails (e.g. network error)
- **THEN** the system SHALL revert the displayed layout to the last known persisted state and SHALL surface an error notification to the user, and SHALL NOT silently discard the failure


<!-- @trace
source: cases-customizable-widgets
updated: 2026-07-14
code:
  - src/app/cases/page.tsx
  - src/components/features/cases/CasesWidgetLayout.tsx
  - src/app/actions/casesLayout.ts
  - src/domain/cases/layoutTypes.ts
  - src/components/dashboard/eisenhower/QuadrantCell.tsx
  - src/components/dashboard/DashboardWidgetShell.tsx
  - src/hooks/useCasesLayout.ts
  - src/components/dashboard/HiddenWidgetsMenu.tsx
  - src/components/dashboard/WorkDashboard.tsx
  - supabase/migrations/20260714140000_add_cases_layout.sql
tests:
  - src/components/dashboard/__tests__/DashboardWidgetShell.test.tsx
  - src/hooks/__tests__/useCasesLayout.test.ts
  - src/domain/cases/__tests__/layoutTypes.test.ts
  - src/components/features/cases/__tests__/CasesWidgetLayout.test.tsx
  - src/app/actions/__tests__/casesLayout.test.ts
  - src/components/dashboard/__tests__/HiddenWidgetsMenu.test.tsx
-->

---
### Requirement: New Widget Migration for Existing Layouts

The system SHALL merge any `/cases` widget id that is not present in a user's stored layout into that layout as visible, appended after existing entries, so future new widgets are not silently omitted for users with pre-existing customized layouts.

#### Scenario: Stored layout is missing a newly introduced widget id

- **WHEN** a user's stored `cases_layout` does not contain an entry for a widget id that currently exists in the system
- **THEN** the system SHALL treat that widget as visible and render it after the user's existing widgets, without requiring the user to take any action


<!-- @trace
source: cases-customizable-widgets
updated: 2026-07-14
code:
  - src/app/cases/page.tsx
  - src/components/features/cases/CasesWidgetLayout.tsx
  - src/app/actions/casesLayout.ts
  - src/domain/cases/layoutTypes.ts
  - src/components/dashboard/eisenhower/QuadrantCell.tsx
  - src/components/dashboard/DashboardWidgetShell.tsx
  - src/hooks/useCasesLayout.ts
  - src/components/dashboard/HiddenWidgetsMenu.tsx
  - src/components/dashboard/WorkDashboard.tsx
  - supabase/migrations/20260714140000_add_cases_layout.sql
tests:
  - src/components/dashboard/__tests__/DashboardWidgetShell.test.tsx
  - src/hooks/__tests__/useCasesLayout.test.ts
  - src/domain/cases/__tests__/layoutTypes.test.ts
  - src/components/features/cases/__tests__/CasesWidgetLayout.test.tsx
  - src/app/actions/__tests__/casesLayout.test.ts
  - src/components/dashboard/__tests__/HiddenWidgetsMenu.test.tsx
-->

---
### Requirement: Tab-Inapplicable Widgets Are Not Treated as User-Hidden

The system SHALL omit the pipeline-chart and eisenhower-matrix widgets from rendering when the current `/cases` tab (Memo, Timeline, Pending, or Closed) does not display Monitoring-view content, and SHALL NOT include them in the hidden-widgets restore list on account of that tab context.

#### Scenario: Monitoring-only widgets are absent on the Memo tab

- **WHEN** a user navigates to the Memo tab on `/cases`
- **THEN** the system SHALL NOT render the pipeline-chart or eisenhower-matrix widgets, and SHALL NOT list them in the hidden-widgets restore entry point as a result of being on that tab

#### Scenario: User-hidden widgets remain hidden after switching back to a Monitoring-applicable tab

- **WHEN** a user has explicitly hidden the eisenhower-matrix widget via its dismiss control, then navigates away to the Memo tab and back to a Monitoring-applicable tab
- **THEN** the system SHALL keep the eisenhower-matrix widget hidden, consistent with the user's persisted setting

<!-- @trace
source: cases-customizable-widgets
updated: 2026-07-14
code:
  - src/app/cases/page.tsx
  - src/components/features/cases/CasesWidgetLayout.tsx
  - src/app/actions/casesLayout.ts
  - src/domain/cases/layoutTypes.ts
  - src/components/dashboard/eisenhower/QuadrantCell.tsx
  - src/components/dashboard/DashboardWidgetShell.tsx
  - src/hooks/useCasesLayout.ts
  - src/components/dashboard/HiddenWidgetsMenu.tsx
  - src/components/dashboard/WorkDashboard.tsx
  - supabase/migrations/20260714140000_add_cases_layout.sql
tests:
  - src/components/dashboard/__tests__/DashboardWidgetShell.test.tsx
  - src/hooks/__tests__/useCasesLayout.test.ts
  - src/domain/cases/__tests__/layoutTypes.test.ts
  - src/components/features/cases/__tests__/CasesWidgetLayout.test.tsx
  - src/app/actions/__tests__/casesLayout.test.ts
  - src/components/dashboard/__tests__/HiddenWidgetsMenu.test.tsx
-->