## ADDED Requirements

### Requirement: Switch the timeline between list and week-agenda views

The interactive layer SHALL inject a view switcher into the timeline section offering a list view and a week-agenda view, defaulting to the list view. The list view SHALL be the existing static, day-grouped event list. The week-agenda view SHALL present events on a weekly time axis with one row per day (week starting Monday), each day row listing that day's events, rendering each event with the same icon, label, case number, parties, content, and completion styling as the list view. Days with no events SHALL render as empty rows. The day row matching the local date when the file is opened SHALL be highlighted as today. With JavaScript disabled, the timeline section SHALL render only its original static list content, with no view switcher, week-agenda container, or other injected controls.

#### Scenario: Default view is the list

- **WHEN** the exported file is opened and the interactive script runs
- **THEN** the timeline section SHALL show the existing day-grouped list view
- **AND** a view switcher offering list and week-agenda SHALL be present

#### Scenario: Switching to week-agenda groups events by day

- **GIVEN** the timeline has upcoming events on different dates
- **WHEN** the user selects the week-agenda view
- **THEN** the timeline SHALL show a weekly axis with one row per day
- **AND** each day row SHALL list that day's events with the same icon, label, case number, parties, and content as the list view
- **AND** a day with no events SHALL render as an empty row

#### Scenario: Today is highlighted in the week-agenda view

- **WHEN** the file is opened on a given local date and the week-agenda view is shown
- **THEN** the day row whose date equals that local date SHALL be highlighted as today
- **AND** the highlight SHALL NOT rely on a today value fixed at export time

#### Scenario: Static timeline survives with JavaScript disabled

- **WHEN** the file is opened with JavaScript disabled
- **THEN** the timeline section SHALL render its original static list content
- **AND** no view switcher, week-agenda container, or injected control SHALL appear

### Requirement: Week-agenda view reuses case assignment filtering and per-event completion

The week-agenda view SHALL share the same per-case assignment state as the list view, the active-cases table, and the memo board. Each week-agenda event SHALL be tagged with its case id and event id. Selecting a person in the filter bar SHALL show, in whichever timeline view is visible, only the events of cases assigned to that person and SHALL hide events of unassigned cases; "全部" SHALL show all events. Toggling completion on a week-agenda event SHALL be equivalent to toggling the same event in the list view, keyed by the same event id, and SHALL preserve the existing completion styling and localStorage cache behavior.

#### Scenario: Filtering hides other people's and unassigned events in week-agenda

- **GIVEN** case A is assigned to "王助理" and case B is unassigned, with the week-agenda view shown
- **WHEN** the user selects "王助理" in the filter bar
- **THEN** case A's events SHALL be visible in the week-agenda view
- **AND** case B's events SHALL be hidden
- **AND WHEN** the user selects "全部"
- **THEN** all events SHALL become visible again

#### Scenario: Completion in week-agenda matches the list view

- **GIVEN** an event appears in both the list and week-agenda views with the same event id
- **WHEN** the user marks it complete from the week-agenda view
- **THEN** the same event SHALL be marked complete in the list view
- **AND** the completion styling and localStorage cache SHALL update exactly as toggling from the list view
