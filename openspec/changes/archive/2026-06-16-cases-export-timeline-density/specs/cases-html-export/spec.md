## ADDED Requirements

### Requirement: Timeline section offers high-density list and calendar layouts

The exported HTML's timeline section SHALL present its events in space-efficient layouts in both the default list view and the calendar (week) view, without changing event data, ordering, escaping, or the existing interactive behaviors (assignment, completion, person filtering, today highlight, collapse, download-and-reopen persistence via `#export-state`).

In the list view, day groups (a day header plus that day's event rows) SHALL be laid out in two side-by-side columns so the horizontal width is used and vertical height is roughly halved. Each day group SHALL be kept intact (its header and its events SHALL NOT be split across the two columns).

In the calendar (week) view, the timeline SHALL be rendered as a true 7-column month-style grid with one column per weekday (Monday through Sunday) and one row per week, where each cell represents a single calendar day and its events appear as compact chips inside that cell. Empty days SHALL occupy only a single small grid cell rather than a full-width row. Each event chip SHALL carry its case id and event id so person filtering and completion stay in sync with the list view, and SHALL include its completion control. The cell for the local current day SHALL be visually highlighted.

The document SHALL remain a single self-contained HTML file with no external resources, and both layouts SHALL remain usable when printed (day groups and calendar cells SHALL NOT be split across columns or pages, and runtime-injected `export-ui` controls SHALL NOT appear in print).

#### Scenario: List view lays out day groups in two columns without splitting a group

- **GIVEN** an exported file with several day groups in the timeline list view
- **WHEN** the file is opened
- **THEN** the day groups SHALL be arranged in two side-by-side columns
- **AND** no day group's header SHALL be separated from its own event rows across the two columns

#### Scenario: Calendar view renders a 7-column weekday grid

- **WHEN** the user switches the timeline to the calendar (week) view
- **THEN** the timeline SHALL render as a grid of seven weekday columns (Monday through Sunday) with one row per week
- **AND** each cell SHALL represent one calendar day showing that day's events as compact chips
- **AND** a day with no events SHALL occupy only a single small cell rather than a full-width row

#### Scenario: Calendar chips stay in sync with list interactions

- **GIVEN** the calendar (week) view is shown
- **WHEN** the user filters by an assigned person
- **THEN** calendar event chips not belonging to that person SHALL be hidden while the grid stays aligned
- **AND WHEN** the user marks an event complete from a calendar chip
- **THEN** the same event SHALL be marked complete in the list view (shared event id)

#### Scenario: Current day cell is highlighted in the calendar view

- **WHEN** the calendar (week) view is shown
- **THEN** the cell corresponding to the local current date SHALL be visually highlighted
- **AND** other day cells SHALL NOT carry that highlight

#### Scenario: Filtering hides empty day groups in the list view

- **GIVEN** the list view with a person filter active
- **WHEN** a day group has no events assigned to the selected person
- **THEN** that entire day group SHALL be hidden, leaving no empty gap in the two-column layout

#### Scenario: High-density layouts remain self-contained and printable

- **WHEN** the exported file is opened or printed
- **THEN** the document SHALL pull in no external resources
- **AND** day groups and calendar cells SHALL NOT be split across columns or pages when printed
- **AND** the runtime-injected control elements SHALL NOT appear in the printed output
