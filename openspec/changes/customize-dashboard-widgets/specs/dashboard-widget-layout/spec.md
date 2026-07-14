## ADDED Requirements

### Requirement: Default Layout for Unconfigured Users

The system SHALL render the home dashboard using a fixed default layout (all widgets visible, in the current order: welcome-header, ai-work-assistant, urgent-alerts-tax-watch, pipeline-view, eisenhower-matrix, todo-container) for any user who has no stored `dashboard_layout` value, so existing behavior is unchanged until a user explicitly customizes it.

#### Scenario: First visit with no stored layout

- **WHEN** a user who has never customized their dashboard loads the home page
- **THEN** the system SHALL display all widgets in the default order identical to the pre-existing hardcoded layout

#### Scenario: Stored layout fails schema validation

- **WHEN** the system reads a `dashboard_layout` value that does not conform to the widget layout schema
- **THEN** the system SHALL fall back to the default layout instead of failing to render the page

### Requirement: Widget Visibility Toggle

The system SHALL allow a user to hide any dashboard widget except welcome-header by clicking a dismiss control on that widget, immediately removing it from the rendered layout.

#### Scenario: User hides a widget

- **WHEN** a user clicks the dismiss ("X") control on a visible widget (e.g. pipeline-view)
- **THEN** the system SHALL remove that widget from the rendered dashboard and mark it as not visible in the persisted layout

#### Scenario: welcome-header has no dismiss control

- **WHEN** a user views the welcome-header widget
- **THEN** the system SHALL NOT render a dismiss control on it

### Requirement: Hidden Widgets Restore Entry Point

The system SHALL display a persistent entry-point control whenever at least one widget is hidden, allowing the user to reopen a list of hidden widgets and restore any of them.

#### Scenario: Entry point appears after hiding a widget

- **WHEN** a user hides at least one widget
- **THEN** the system SHALL display a persistent button that, when clicked, opens a list of all currently hidden widgets

#### Scenario: Entry point disappears when no widgets are hidden

- **WHEN** no widgets are currently hidden
- **THEN** the system SHALL NOT display the hidden-widgets entry-point button

#### Scenario: User restores a hidden widget

- **WHEN** a user opens the hidden-widgets list and selects a hidden widget
- **THEN** the system SHALL mark that widget as visible, append it to the end of the rendered order, and remove it from the hidden-widgets list

### Requirement: Widget Reordering via Drag and Drop

The system SHALL allow a user to reorder dashboard widgets (excluding welcome-header) by dragging a widget to a new position, immediately applying the new order to the rendered layout.

#### Scenario: User drags a widget to a new position

- **WHEN** a user drags a widget's drag handle and drops it at a new position among the other visible widgets
- **THEN** the system SHALL re-render the dashboard with widgets in the new order

##### Example: reordering three widgets

| Before order | Action | After order |
| --- | --- | --- |
| pipeline-view, eisenhower-matrix, todo-container | drag todo-container to first position | todo-container, pipeline-view, eisenhower-matrix |

### Requirement: Layout Persistence Across Sessions

The system SHALL persist each user's widget visibility and order to the database, scoped to that user, so the layout is identical the next time the user loads the dashboard from any device or browser.

#### Scenario: Layout persists after reload

- **WHEN** a user hides a widget or reorders widgets and then reloads the page
- **THEN** the system SHALL render the dashboard using the previously saved visibility and order

#### Scenario: Layout persists across devices

- **WHEN** a user customizes their layout on one device and then logs in on a different device
- **THEN** the system SHALL render the dashboard using the same saved layout

#### Scenario: Persistence failure does not corrupt displayed state

- **WHEN** saving a layout change to the database fails (e.g. network error)
- **THEN** the system SHALL revert the displayed layout to the last known persisted state and SHALL surface an error notification to the user, and SHALL NOT silently discard the failure

### Requirement: New Widget Migration for Existing Layouts

The system SHALL merge any widget id that is not present in a user's stored layout into that layout as visible, appended after existing entries, so future new widgets are not silently omitted for users with pre-existing customized layouts.

#### Scenario: Stored layout is missing a newly introduced widget id

- **WHEN** a user's stored `dashboard_layout` does not contain an entry for a widget id that currently exists in the system
- **THEN** the system SHALL treat that widget as visible and render it after the user's existing widgets, without requiring the user to take any action
