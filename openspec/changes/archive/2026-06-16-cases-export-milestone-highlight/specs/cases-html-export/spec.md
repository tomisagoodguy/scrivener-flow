## ADDED Requirements

### Requirement: Exported HTML preserves milestone and field highlight markers

The exported HTML SHALL render a read-only snapshot of the per-cell "highlight" markers the user has toggled in the `/cases` table, so colleagues opening the exported file can see which milestones and fields were flagged. In the main app, each milestone step (簽, 印, 稅, 過, 交), the tax-type value, and the pre-collected-fee value can be clicked to toggle a yellow highlight whose state is stored in the exporting user's browser `localStorage` (keys `highlight_<caseId>_<簽|印|稅|過|交>`, `highlight_<caseId>_tax_type`, `highlight_<caseId>_pre_fee`, value `"true"` when highlighted). Because the export runs in the browser, the export SHALL read this `localStorage` state at export time and bake it into the generated file.

Highlighted items SHALL be shown with a yellow background (amber, matching the on-screen marker) in two places: the table section (the highlighted milestone token within the milestone-dates cell, the tax-type value, and the pre-collected-fee value) and the timeline section (the timeline event corresponding to a highlighted milestone, in both the list view and the calendar/week view). Only the five milestone fields map to timeline highlights; appointment, tax-deadline, and todo events SHALL NOT be highlighted. When no highlights exist, the exported file SHALL look exactly as it does today (no yellow markers).

The highlight snapshot reflects the `localStorage` of whoever clicks export and is read-only in the exported file (no toggling). The document SHALL remain a single self-contained HTML file with no external resources, SHALL NOT change event data, ordering, escaping, or any existing interactive behavior, and the yellow markers SHALL remain visible when the file is printed (via `print-color-adjust: exact`).

#### Scenario: Highlighted milestones appear yellow in the exported table and timeline

- **GIVEN** a user has toggled the 印 milestone of a case to highlighted in the `/cases` table
- **WHEN** that user clicks "匯出 HTML" and opens the downloaded file
- **THEN** the 印 milestone token in that case's table milestone-dates cell SHALL have a yellow background
- **AND** the corresponding 印 (seal_date) event in the timeline section SHALL have a yellow background
- **AND** non-highlighted milestones and non-milestone events SHALL keep their normal appearance

#### Scenario: Tax-type and pre-collected-fee highlights are carried

- **GIVEN** a user has highlighted the tax-type and the pre-collected-fee of a case
- **WHEN** the user exports and opens the file
- **THEN** the tax-type value SHALL be shown with a yellow background in the table
- **AND** the pre-collected-fee value SHALL be shown in that case's tax cell with a yellow background

#### Scenario: No highlights produces an unchanged export

- **GIVEN** a user has not highlighted anything (no matching localStorage keys)
- **WHEN** the user exports the file
- **THEN** the exported HTML SHALL contain no yellow highlight markers
- **AND** the table and timeline SHALL render exactly as they did before this capability

#### Scenario: Highlight markers survive printing

- **WHEN** an exported file containing highlight markers is printed
- **THEN** the yellow highlight backgrounds SHALL still appear on paper via `print-color-adjust: exact`
- **AND** the runtime-injected `export-ui` controls SHALL still be hidden in print

#### Scenario: Highlight is a read-only snapshot of the exporter's local state

- **WHEN** the exported file is opened by a colleague
- **THEN** the highlight markers SHALL reflect the state of the user who performed the export
- **AND** the markers SHALL be read-only (no click-to-toggle in the exported document)
- **AND** the document SHALL remain self-contained with no external resources
