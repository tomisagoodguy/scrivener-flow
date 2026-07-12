## MODIFIED Requirements

### Requirement: Homepage renders an Eisenhower matrix aggregating party names from active cases

The homepage (`/`) SHALL render an Eisenhower matrix section inside the WorkDashboard flow, positioned below the 7-day pipeline section (未來 7 日預告, PipelineView) and above the todo center (智慧待辦中心, TodoContainer), always expanded with no collapse control. The `/cases` case management page SHALL render the same Eisenhower matrix section below the pipeline monitoring section (流程監控, GlobalPipelineChart), under the identical visibility condition GlobalPipelineChart uses (monitoring tab, not Closed/Memo/Timeline/Pending, and at least one active case exists), as a collapsible section that starts collapsed on every page load. Both renderings SHALL read and write the same per-user `eisenhower_matrix` data, so a change made on one page is visible on the other page after a reload. The matrix SHALL aggregate every non-completed case belonging to the signed-in user into one draggable case chip, identified by the stable key `"{case_id}"`. A chip SHALL be generated for a case when at least one of `buyer_name` / `seller_name` is non-empty. Each chip SHALL display both party names side by side with 買/賣 role markers (a party whose name is empty is omitted), SHALL NOT display the case number as visible chip text (the case number MAY appear only as a hover tooltip), and clicking a chip name SHALL navigate to `/cases/[id]` of the associated case.

#### Scenario: Chips are derived from non-empty name fields only

- **WHEN** the user's active cases are loaded
- **THEN** one chip per non-empty `buyer_name` and one chip per non-empty `seller_name` appear, and no chip is generated for empty or missing name fields

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

#### Scenario: The /cases page shows the same matrix collapsed by default

- **WHEN** the user opens `/cases` on the monitoring tab with at least one active case
- **THEN** a collapsible "輕重緩急看板" section appears below the pipeline monitoring section, initially collapsed, showing only its header with an expand control

#### Scenario: Expanding on /cases reveals the same data as the homepage

- **WHEN** the user expands the matrix section on `/cases`
- **THEN** the staging area and zone grid render with the same placements and zone labels currently saved for that user

#### Scenario: A change on one page is visible on the other after reload

- **WHEN** the user moves a chip into a zone on `/cases` and then reloads the homepage
- **THEN** the homepage matrix shows the chip in that same zone

#### Scenario: The matrix does not render outside the monitoring view

- **WHEN** the user is on the `/cases` Closed, Memo, Timeline, or Pending tab, or the monitoring tab has zero active cases
- **THEN** neither the pipeline monitoring section nor the Eisenhower matrix section is rendered
