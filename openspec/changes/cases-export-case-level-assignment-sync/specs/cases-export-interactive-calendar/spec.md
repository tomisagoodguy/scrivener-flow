## MODIFIED Requirements

### Requirement: Assign cases to people via a managed people list

The interactive layer SHALL let the user assign each case to exactly one person chosen from a managed people list, and SHALL let the user add new people by free-text name. Added names SHALL be de-duplicated and SHALL populate every assignee selector. A case SHALL be assignable from either a timeline event selector or the active-cases table row selector; both selectors SHALL read and write the same per-case assignment keyed by case id.

#### Scenario: Add a person and assign a case

- **WHEN** the user enters a new name "王助理" in the add-person input and confirms
- **THEN** "王助理" SHALL appear as an option in every assignee selector and in the people filter bar
- **AND WHEN** the user selects "王助理" for any timeline event or table row of a case
- **THEN** that whole case SHALL be recorded as assigned to "王助理"

#### Scenario: Assigning from the table mirrors the timeline

- **GIVEN** case C has one or more timeline events
- **WHEN** the user selects "王助理" in case C's table row selector
- **THEN** every timeline event selector for case C SHALL show "王助理"
- **AND** case C's table row and memo card SHALL show the "王助理" assignee

#### Scenario: Duplicate names are ignored

- **WHEN** the user adds a name that already exists in the people list
- **THEN** the people list SHALL NOT add a duplicate entry

### Requirement: Filter the calendar by person and highlight today

The interactive layer SHALL provide a filter bar with "全部" plus one entry per person. Selecting a person SHALL show, across the active-cases table, the memo board, and the timeline, only the cases assigned to that person; "全部" SHALL show all cases. Section membership SHALL be determined by each item's case id together with the per-case assignment. The day group matching the local date when the file is opened SHALL be visually highlighted as today.

#### Scenario: Filter to a single person across all sections

- **GIVEN** case A is assigned to "王助理" and case B is assigned to "李助理"
- **WHEN** the user selects "王助理" in the filter bar
- **THEN** case A's timeline events, table row, and memo card SHALL be visible
- **AND** case B's timeline events, table row, and memo card SHALL be hidden

#### Scenario: Unassigned cases are hidden when filtering to a person

- **GIVEN** case C has no assignee
- **WHEN** the user selects "王助理" in the filter bar
- **THEN** case C's timeline events, table row, and memo card SHALL be hidden
- **AND WHEN** the user selects "全部"
- **THEN** all cases SHALL become visible again

#### Scenario: Today is highlighted based on open date

- **WHEN** the file is opened on a given local date
- **THEN** the day group whose date equals that local date SHALL be highlighted as today
- **AND** day groups SHALL NOT rely on a today value fixed at export time

### Requirement: Persist assignments by downloading an assigned version

The interactive layer SHALL provide a "下載已指派版本" action that serializes the current people list and per-case assignments into an inline JSON state node and downloads a new self-contained `.html`. Per-case assignments SHALL be keyed by case id. Opening the downloaded file SHALL restore the same people list and per-case assignments across the table, memo, and timeline sections.

#### Scenario: Assignments travel with the downloaded file

- **GIVEN** the user has added people and assigned several cases
- **WHEN** the user clicks "下載已指派版本"
- **THEN** the browser SHALL download a new `.html` whose embedded state JSON contains the current people and per-case assignments
- **AND WHEN** that downloaded file is opened on a different machine
- **THEN** the same people list and per-case assignments SHALL be displayed across the table, memo, and timeline sections

#### Scenario: Assignment key is stable across re-export

- **WHEN** a case is assigned and the assigned version is downloaded and reopened
- **THEN** the assignment SHALL map back to the same case using its case id
- **AND** the assignment SHALL NOT be matched by positional index

## ADDED Requirements

### Requirement: Reflect case assignment across all export sections

The interactive layer SHALL display the assigned person on the active-cases table row and on the memo card of each assigned case, and SHALL keep the timeline event selectors, the table row selector, and the badges of the same case in sync whenever the assignment changes. Unassigned cases SHALL NOT show an assignee badge. With JavaScript disabled, the table and memo sections SHALL render their original static content without empty assignee controls or badges.

#### Scenario: Assignment shows on table row and memo card

- **GIVEN** case C is assigned to "王助理"
- **THEN** case C's active-cases table row SHALL show "承辦：王助理"
- **AND** case C's memo card SHALL show "承辦：王助理"

#### Scenario: Changing assignment updates every section at once

- **GIVEN** case C is assigned to "王助理" and shows that assignee on its table row, memo card, and timeline selectors
- **WHEN** the user changes case C's assignee to "李助理" from any one selector
- **THEN** case C's table row, memo card, and all timeline event selectors SHALL show "李助理"

#### Scenario: Unassigned case shows no badge

- **WHEN** case C has no assignee
- **THEN** no assignee badge SHALL appear on its table row or memo card

#### Scenario: Static sections survive with JavaScript disabled

- **WHEN** the file is opened with JavaScript disabled
- **THEN** the table and memo sections SHALL render their original static content
- **AND** no assignee selector, badge, or filter control SHALL appear
