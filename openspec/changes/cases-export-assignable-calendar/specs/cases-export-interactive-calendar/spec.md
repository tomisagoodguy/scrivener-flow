## ADDED Requirements

### Requirement: Embed an interactive layer into the exported HTML

The exported `.html` SHALL embed an inline `<script>` that progressively enhances the static export with assignment, filtering, today-focus, and completion features. The file SHALL remain a single self-contained document with no external resources and SHALL stay readable when JavaScript is disabled.

#### Scenario: Interactive controls appear when opened in a browser

- **WHEN** a user opens an exported `.html` file in a browser with JavaScript enabled
- **THEN** the timeline section SHALL show an assignee selector per event, a people filter bar, and a "下載已指派版本" button
- **AND** the three existing sections (承辦中表格, 備忘錄, 時程) SHALL remain present with unchanged data

#### Scenario: Static content survives with JavaScript disabled

- **WHEN** the file is opened with JavaScript disabled
- **THEN** the three static sections SHALL still render and be readable
- **AND** no external resource (script src, stylesheet href, or font) SHALL be requested

### Requirement: Assign cases to people via a managed people list

The interactive layer SHALL let the user assign each timeline event to a person chosen from a people list, and SHALL let the user add new people by free-text name. Added names SHALL be de-duplicated and SHALL populate every assignee selector.

#### Scenario: Add a person and assign an event

- **WHEN** the user enters a new name "王助理" in the add-person input and confirms
- **THEN** "王助理" SHALL appear as an option in every event's assignee selector and in the people filter bar
- **AND WHEN** the user selects "王助理" for a specific event
- **THEN** that event SHALL be recorded as assigned to "王助理"

#### Scenario: Duplicate names are ignored

- **WHEN** the user adds a name that already exists in the people list
- **THEN** the people list SHALL NOT add a duplicate entry

### Requirement: Filter the calendar by person and highlight today

The interactive layer SHALL provide a filter bar with "全部" plus one entry per person. Selecting a person SHALL show only events assigned to that person; "全部" SHALL show all events. The day group matching the local date when the file is opened SHALL be visually highlighted as today.

#### Scenario: Filter to a single person

- **GIVEN** event A is assigned to "王助理" and event B is assigned to "李助理"
- **WHEN** the user selects "王助理" in the filter bar
- **THEN** event A SHALL be visible and event B SHALL be hidden

#### Scenario: Today is highlighted based on open date

- **WHEN** the file is opened on a given local date
- **THEN** the day group whose date equals that local date SHALL be highlighted as today
- **AND** day groups SHALL NOT rely on a today value fixed at export time

### Requirement: Toggle completion state per event

The interactive layer SHALL let the user mark any event complete or incomplete. Completion state SHALL be cached in the file's `localStorage`. When `localStorage` is unavailable, completion toggling SHALL still work for the current session without throwing.

#### Scenario: Mark an event complete

- **WHEN** the user toggles an event to complete
- **THEN** the event SHALL be visually marked complete
- **AND** reopening the same file in the same browser SHALL restore that completion state

### Requirement: Persist assignments by downloading an assigned version

The interactive layer SHALL provide a "下載已指派版本" action that serializes the current people list and assignments into an inline JSON state node and downloads a new self-contained `.html`. Opening the downloaded file SHALL restore the same people list and assignments.

#### Scenario: Assignments travel with the downloaded file

- **GIVEN** the user has added people and assigned several events
- **WHEN** the user clicks "下載已指派版本"
- **THEN** the browser SHALL download a new `.html` whose embedded state JSON contains the current people and assignments
- **AND WHEN** that downloaded file is opened on a different machine
- **THEN** the same people list and per-event assignments SHALL be displayed

#### Scenario: Assignment key is stable across re-export

- **WHEN** an event is assigned and the assigned version is downloaded and reopened
- **THEN** the assignment SHALL map back to the same event using a stable event identifier derived from case id and field key (or todo id for todo events)
- **AND** the assignment SHALL NOT be matched by positional index
