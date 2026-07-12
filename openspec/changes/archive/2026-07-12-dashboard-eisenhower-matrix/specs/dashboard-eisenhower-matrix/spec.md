## ADDED Requirements

### Requirement: Homepage renders an Eisenhower matrix aggregating party names from active cases

The homepage (`/`) SHALL render an Eisenhower matrix section inside the WorkDashboard flow, positioned below the 7-day pipeline section (未來 7 日預告, PipelineView) and above the todo center (智慧待辦中心, TodoContainer). The matrix SHALL aggregate every non-completed case belonging to the signed-in user into one draggable case chip, identified by the stable key `"{case_id}"`. A chip SHALL be generated for a case when at least one of `buyer_name` / `seller_name` is non-empty. Each chip SHALL display both party names side by side with 買/賣 role markers (a party whose name is empty is omitted), SHALL NOT display the case number as visible chip text (the case number MAY appear only as a hover tooltip), and clicking a chip name SHALL navigate to `/cases/[id]` of the associated case.

#### Scenario: Chips are derived from non-empty name fields only

- **WHEN** the user's active cases are loaded
- **THEN** one chip appears per non-completed case that has at least one non-empty party name, showing every non-empty party name, and no chip is generated for cases whose both name fields are empty

##### Example: chip expansion from case list

| Case | buyer_name | seller_name | Chips produced |
| ---- | ---------- | ----------- | -------------- |
| A | 王小明 | 陳大文 | A(買 王小明・賣 陳大文) |
| B | 林美麗 | (empty) | B(買 林美麗) |
| C (completed) | 張三 | 李四 | none |
| D | (empty) | (empty) | none |

#### Scenario: Empty state when no active cases exist

- **WHEN** the user has no non-completed cases
- **THEN** the matrix section displays an empty-state message instead of an empty quadrant grid

### Requirement: Chips are placed into quadrants by the user via drag and drop and persist per user

A chip belongs to zero or more zones; a chip belonging to no zone SHALL appear in an "unclassified" staging area above the zone grid, and a chip belonging to multiple zones SHALL be rendered inside every zone it belongs to. Placements SHALL be stored as `Record<chipKey, zoneId[]>` (deduplicated, no empty arrays; a legacy single-string value SHALL be read as a one-element array). Desktop drag and drop SHALL use move semantics: dropping a chip on a zone removes it from the source zone (if any) and adds it to the target zone; dropping it on the staging area removes it from the source zone only. The per-chip menu SHALL be a multi-select of zones (toggling a zone adds or removes membership; a clear option removes all memberships), and each chip instance inside a zone SHALL provide a remove-from-this-zone control whose removal of the last membership returns the chip to the staging area. Placements SHALL be persisted per user in the `eisenhower_matrix` JSONB column of the `user_settings` table through a Server Action, protected by the existing row-level security policies so that each user only reads and writes their own matrix. Persisted placements SHALL be restored on page reload.

#### Scenario: Drag a chip into a quadrant and reload

- **WHEN** the user drags a chip from the staging area into quadrant q2 and reloads the page
- **THEN** the chip appears in quadrant q2 after reload

#### Scenario: Drag between zones moves instead of copies

- **WHEN** a chip belonging to zones q1 and q3 is dragged from q1 and dropped on q2
- **THEN** the chip belongs to q2 and q3 (removed from q1, still in q3)

#### Scenario: Menu multi-select places one chip in several zones

- **WHEN** the user opens a chip's menu and toggles on q1, q2, and q3
- **THEN** the same chip is rendered inside q1, q2, and q3 simultaneously, and this state survives a page reload

#### Scenario: Removing the last membership returns the chip to staging

- **WHEN** a chip belongs only to q2 and the user clicks its remove-from-this-zone control inside q2
- **THEN** the chip disappears from q2 and appears in the unclassified staging area

#### Scenario: Placement is isolated per user

- **WHEN** user A places a chip into q1 and user B signs in and opens the homepage
- **THEN** user B's matrix does not reflect user A's placements

#### Scenario: Save failure keeps optimistic position and surfaces an error

- **WHEN** persisting a placement fails (network or auth error)
- **THEN** the chip remains at its dropped position, an error notification is shown, and no silent failure occurs

### Requirement: Quadrant titles are user-editable with Eisenhower defaults

Every zone SHALL have an inline-editable title. Default titles for the four initial zones SHALL be 重要且緊急 (q1), 重要不緊急 (q2), 緊急不重要 (q3), 不重要不緊急 (q4); the default title for a user-created zone SHALL be 新象限. Edited titles SHALL be persisted in the same `eisenhower_matrix` JSONB document on blur. Clearing a title SHALL restore that zone's default title.

#### Scenario: Rename a quadrant

- **WHEN** the user edits quadrant q1's title to "今天必聯絡" and blurs the field
- **THEN** the title "今天必聯絡" is saved and shown after page reload

#### Scenario: Cleared title falls back to default

- **WHEN** the user clears quadrant q3's title and blurs the field
- **THEN** quadrant q3 shows its default title 緊急不重要

### Requirement: Users can add and remove zones to customize the matrix layout

The matrix SHALL store its zone list per user as a `zones` array (`{ id, label }`) inside the same `eisenhower_matrix` JSONB document, requiring no database schema change. The matrix SHALL provide an add-zone control that appends a new zone (hidden when 8 zones exist) and a per-zone remove control (disabled when only 2 zones remain; removal SHALL require a confirmation). Removing a zone SHALL drop every placement pointing at it so its chips return to the unclassified staging area, and SHALL NOT modify any case data. Zone changes SHALL persist across page reloads. A legacy document without a `zones` array SHALL be interpreted as the four default Eisenhower zones, preserving any custom titles saved in the legacy `labels` field.

#### Scenario: Add a zone

- **WHEN** the user has fewer than 8 zones and clicks the add-zone control
- **THEN** a new zone titled 新象限 appears in the grid and is still present after page reload

#### Scenario: Zone count limits

- **WHEN** the user has 8 zones
- **THEN** the add-zone control is not available; and **WHEN** only 2 zones remain **THEN** the remove control is disabled

#### Scenario: Removing a zone returns its chips to staging

- **WHEN** the user removes a zone containing a placed chip and confirms
- **THEN** the chip appears in the unclassified staging area, and after reload the zone is gone and the chip remains unclassified

#### Scenario: Legacy document without zones is upgraded

- **WHEN** the matrix loads a saved document that has `placements` and `labels` but no `zones` array
- **THEN** the four default zones are shown with any custom titles from `labels` applied, and existing placements remain effective

##### Example: legacy v1 document interpretation

- **GIVEN** saved document { "placements": { "A": "q1" }, "labels": { "q1": "今天必聯絡" } }
- **WHEN** the matrix loads
- **THEN** zones are q1–q4 with q1 titled 今天必聯絡, and chip A sits in q1

### Requirement: Stale placements are pruned when their source chip no longer exists

On load, any placement whose chip key does not exist in the currently derived chip set (because the case was completed, deleted, or the name field was cleared), or whose zone id no longer exists in the zone list, SHALL be removed from the in-memory matrix state, and the pruned state SHALL be persisted on the next successful save. Pruning SHALL NOT modify any case data.

#### Scenario: Completed case removes its chips from the matrix

- **WHEN** a case whose chip was placed in q1 is marked completed and the user reloads the homepage
- **THEN** the chip no longer appears anywhere in the matrix and its placement entry is dropped from state

##### Example: pruning placements against the live chip set

- **GIVEN** saved placements { "A": ["q1", "z999"], "B": ["q4"] }, current chip set contains only "A", and zone "z999" no longer exists
- **WHEN** the matrix loads
- **THEN** in-memory placements become { "A": ["q1"] } — "B" is discarded (chip gone) and "z999" is dropped from A's list (zone gone)
