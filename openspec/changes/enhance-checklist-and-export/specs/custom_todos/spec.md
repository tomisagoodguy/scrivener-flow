# Spec: Custom Checklist Items

## MODIFIED Requirements

#### Scenario: Display Custom Items

- **Given** a case has `todos` JSONB containing keys NOT in the standard list (e.g., `{ "Check Water": false }`)
- **When** the `CaseCompactTodoList` renders
- **Then** it should display "Check Water" as a checklist item alongside standard items.

#### Scenario: Add New Item

- **Given** the checklist view
- **When** the user clicks "Add Item" and enters "Verify ID"
- **Then** a new item "Verify ID" should appear in the list
- **And** it should be saved to the database `todos` column with `false` status.

#### Scenario: Toggle Custom Item

- **Given** a custom item "Verify ID" exists
- **When** the user clicks it
- **Then** it should toggle completion status (green/red) and persist to DB.

## Implementation Details

- `todos` is stored as `Record<string, boolean>`.
- Component `CaseCompactTodoList` receives `allTasks` (standard tasks).
- Logic must calculate `displayTasks = unique([...allTasks, ...Object.keys(todos)])`.
- UI needs an "Add" button/input.
