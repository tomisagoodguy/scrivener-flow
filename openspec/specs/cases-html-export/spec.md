# cases-html-export Specification

## Purpose

TBD - created by archiving change 'add-cases-html-export'. Update Purpose after archive.

## Requirements

### Requirement: Export cases as a self-contained HTML file

The system SHALL provide an "匯出 HTML" button in the `/cases` page header, placed alongside the existing Excel export button. When clicked, the system SHALL generate a single self-contained `.html` file (inline CSS only, no external resources, no sidebar or navigation chrome) from the currently filtered and sorted case list, and trigger a client-side download.

#### Scenario: Export button visible and triggers download

- **WHEN** a user views the `/cases` page with at least one case
- **THEN** an "匯出 HTML" button is shown in the header
- **AND WHEN** the user clicks it
- **THEN** the browser downloads a `.html` file named with the pattern `案件清單_<yyyyMMdd_HHmm>.html`

#### Scenario: No cases to export

- **WHEN** the user clicks "匯出 HTML" while the case list is empty
- **THEN** the system SHALL show an alert "沒有案件資料可以匯出" and SHALL NOT download a file

#### Scenario: File opens standalone in any browser

- **WHEN** the downloaded `.html` file is opened by double-clicking in any browser, offline
- **THEN** the page renders fully with correct styling and Traditional Chinese text
- **AND** no network requests to external stylesheets, scripts, or fonts are required to render content


<!-- @trace
source: add-cases-html-export
updated: 2026-06-16
code:
  - next-env.d.ts
  - src/lib/cases/htmlExport.ts
  - src/lib/cases/exportInteractive.ts
  - tsconfig.tsbuildinfo
tests:
  - src/lib/cases/__tests__/exportInteractive.test.ts
  - src/lib/cases/__tests__/exportInteractive.integration.test.ts
  - src/lib/cases/__tests__/htmlExport.test.ts
-->

---
### Requirement: HTML output contains table, memo, and timeline sections

The exported HTML SHALL contain three labelled sections covering the data of the three `/cases` tabs: a case table, a memo board, and a timeline.

#### Scenario: Table section columns

- **WHEN** the exported HTML is opened
- **THEN** the table section SHALL list each case with columns: 案號, 地區, 買方, 賣方, 價格/銀行, 稅單性質, 里程碑日期 (簽/印/稅/過/交), 未完成待辦, 備註

#### Scenario: Memo section content

- **WHEN** the exported HTML is opened
- **THEN** the memo section SHALL render each case's memo content as a card, showing only cases whose memo content is non-empty

#### Scenario: Timeline section content

- **WHEN** the exported HTML is opened
- **THEN** the timeline section SHALL list cases ordered by their next upcoming milestone date, each entry showing the case identifier and that milestone


<!-- @trace
source: add-cases-html-export
updated: 2026-06-16
code:
  - next-env.d.ts
  - src/lib/cases/htmlExport.ts
  - src/lib/cases/exportInteractive.ts
  - tsconfig.tsbuildinfo
tests:
  - src/lib/cases/__tests__/exportInteractive.test.ts
  - src/lib/cases/__tests__/exportInteractive.integration.test.ts
  - src/lib/cases/__tests__/htmlExport.test.ts
-->

---
### Requirement: Reuse existing case data normalization rules

The HTML export SHALL apply the same data normalization rules already used by the Excel export so both outputs are consistent.

#### Scenario: Relational fields normalized

- **WHEN** a case has `milestones` or `financials` returned as an array (Supabase 1:1 JOIN returns array)
- **THEN** the export SHALL use the first element of the array

#### Scenario: Pending todos filtered

- **WHEN** computing the "未完成待辦" value
- **THEN** the export SHALL include standard tasks not marked complete plus non-numeric custom tasks not marked complete, with the `S_`/`T_` prefixes stripped, and SHALL exclude legacy keys `S_權狀印鑑` and `S_稅單`

#### Scenario: Notes cleaned and money formatted

- **WHEN** rendering a case's 備註 and 預收規費
- **THEN** the export SHALL strip the `[[ATTR:...]]` marker from notes and SHALL display monetary amounts converted to 萬元 (divided by 10000)


<!-- @trace
source: add-cases-html-export
updated: 2026-06-16
code:
  - next-env.d.ts
  - src/lib/cases/htmlExport.ts
  - src/lib/cases/exportInteractive.ts
  - tsconfig.tsbuildinfo
tests:
  - src/lib/cases/__tests__/exportInteractive.test.ts
  - src/lib/cases/__tests__/exportInteractive.integration.test.ts
  - src/lib/cases/__tests__/htmlExport.test.ts
-->

---
### Requirement: HTML output escapes user-provided content

The export SHALL HTML-escape all user-provided text values to prevent broken markup or script injection in the generated file.

#### Scenario: Special characters preserved safely

- **WHEN** a case field contains characters such as `<`, `>`, `&`, or `"`
- **THEN** the generated HTML SHALL escape these characters so the original text is displayed literally and is not interpreted as markup

<!-- @trace
source: add-cases-html-export
updated: 2026-06-16
code:
  - next-env.d.ts
  - src/lib/cases/htmlExport.ts
  - src/lib/cases/exportInteractive.ts
  - tsconfig.tsbuildinfo
tests:
  - src/lib/cases/__tests__/exportInteractive.test.ts
  - src/lib/cases/__tests__/exportInteractive.integration.test.ts
  - src/lib/cases/__tests__/htmlExport.test.ts
-->

---
### Requirement: Exported HTML provides a print layout for paper

The exported HTML file SHALL include print-specific styles (a `@media print` block within the existing inline `<style>`, no external resources) so users can print it on paper. When printed, the document SHALL hide every runtime-injected interactive node (those carrying the `export-ui` class — the toolbar, the list/week view switcher, assignee selects, completion checkboxes, assignee badges, and the week-agenda container) so only content remains. All three content sections (table, memo board, timeline) SHALL still print. Large areas that rely on background color on screen (the table header, timeline day-group headers, memo cards, the timeline list container) SHALL be distinguished in print by border and bold weight rather than background fill, so section boundaries survive browsers that drop backgrounds when printing. Small key markers (the today day-group, warning memo blocks) SHALL preserve their background color via `print-color-adjust: exact` (with the `-webkit-` prefix). The print layout SHALL avoid breaking content across pages with `break-inside: avoid` on sections, timeline day groups, memo cards, and table rows, and SHALL repeat the table header on each page via `display: table-header-group`. Page margins SHALL be controlled by `@page` while the on-screen `body` padding is reset for print. The print styles SHALL NOT change the on-screen appearance or any interactive behavior, and the document SHALL remain a single self-contained file with no external resources.

#### Scenario: Interactive controls are hidden when printing

- **GIVEN** an exported file whose interactive layer has been injected
- **WHEN** the document is printed
- **THEN** no toolbar, view switcher, assignee select, completion checkbox, assignee badge, or week-agenda container SHALL appear on paper
- **AND** the table, memo board, and timeline sections SHALL all still print

#### Scenario: Section boundaries survive background-stripped printing

- **WHEN** the document is printed by a browser that drops background colors
- **THEN** the table header, timeline day-group headers, and memo cards SHALL remain visually distinct via border and bold weight
- **AND** the today day-group and warning memo blocks SHALL keep their background color via `print-color-adjust: exact`

#### Scenario: Content is not split awkwardly across pages

- **GIVEN** a case list long enough to span multiple printed pages
- **WHEN** the document is printed
- **THEN** a timeline day-group header SHALL NOT be separated from its events across a page break
- **AND** a memo card SHALL NOT be split across a page break
- **AND** the table column header SHALL repeat at the top of each page

#### Scenario: Self-containment and screen rendering are preserved

- **WHEN** the exported file is generated
- **THEN** the print styles SHALL be inline within the existing `<style>` with no external stylesheet, script, or font
- **AND** the on-screen rendering and interactive behavior SHALL be unchanged

<!-- @trace
source: cases-export-print-layout
updated: 2026-06-16
code:
  - src/lib/cases/htmlExport.ts
tests:
  - src/lib/cases/__tests__/htmlExport.test.ts
-->

---
### Requirement: Memo blocks can be collapsed per card for export and print

The exported HTML's interactive layer SHALL let the user collapse memo blocks both individually (one block on one card) and globally by category (one block type across all cards), so that collapsed blocks are hidden both in on-screen preview and when printed. Each memo block (`.memo-block` — the warning block `memo-warning`, the other-notes block `memo-pending`, and the private-notes block `memo-private`) SHALL receive a runtime-injected per-card collapse toggle carrying the `export-ui` class. The interactive layer SHALL also inject, at the top of the memo section, one global category toggle per block type (warning, pending, private), each carrying the `export-ui` class, that collapses or expands that block type across all cards in a single action. The global toggles SHALL operate by batch-applying the same per-card collapse state — they SHALL NOT introduce a separate second layer of state; a global toggle's direction SHALL be derived from current state (collapse all of that type if any of that type is still expanded, otherwise expand all), and per-card and global controls SHALL stay mutually reflected because both read from and write to the same state. Collapsing a block SHALL apply a CSS class to the actual content node (not merely hide the toggle) so the hidden block does not render on screen and does not appear in print; the toggles themselves, being `export-ui` nodes, SHALL NOT appear in print. The collapse state SHALL be keyed by the card's case id plus the block type (`warning`, `pending`, or `private`) and SHALL be persisted in the existing `#export-state` JSON (a `collapsed` field) alongside assignments and completion state, so that downloading the processed version and reopening it preserves which blocks are collapsed. By default all three block types SHALL be shown and printed; the user must explicitly collapse a block. Collapse SHALL be a display-only concern and SHALL NOT change data normalization, escaping, the existing memo DOM structure, the table or timeline sections, or the on-screen visual style.

#### Scenario: Collapsing a memo block hides it on screen and in print

- **GIVEN** an exported file whose interactive layer has been injected
- **WHEN** the user activates the collapse toggle on a memo card's private-notes block
- **THEN** that block's content SHALL disappear from the on-screen preview
- **AND** that block's content SHALL NOT appear when the document is printed
- **AND** the collapse toggle itself SHALL NOT appear when the document is printed

#### Scenario: Collapse is independent per card and per block type

- **GIVEN** two memo cards each with warning, other-notes, and private-notes blocks
- **WHEN** the user collapses only the private-notes block of the first card
- **THEN** the first card's warning and other-notes blocks SHALL remain visible
- **AND** the second card's private-notes block SHALL remain visible

#### Scenario: Global category toggle collapses one block type across all cards

- **GIVEN** several memo cards that each contain a private-notes block, all currently expanded
- **WHEN** the user activates the global private-notes toggle
- **THEN** every card's private-notes block SHALL become collapsed (hidden on screen and excluded from print)
- **AND** the warning and other-notes blocks SHALL remain visible
- **AND** activating the same global toggle again SHALL expand every card's private-notes block

#### Scenario: Global and per-card controls share one state

- **GIVEN** the user has used the global private-notes toggle to collapse all private-notes blocks
- **WHEN** the user expands one single card's private-notes block with its per-card toggle
- **THEN** that one card's private-notes block SHALL become visible while the others stay collapsed
- **AND WHEN** the user activates the global private-notes toggle again
- **THEN** the remaining expanded private-notes block(s) SHALL be collapsed so all of that type are collapsed

#### Scenario: Collapse state persists across download and reopen

- **GIVEN** the user has collapsed one or more memo blocks
- **WHEN** the user downloads the processed version and reopens it
- **THEN** the previously collapsed blocks SHALL remain collapsed (hidden on screen and excluded from print)
- **AND** blocks that were not collapsed SHALL remain visible

#### Scenario: Default shows and prints all memo blocks

- **WHEN** an exported file is opened and no collapse action has been taken
- **THEN** all of a card's warning, other-notes, and private-notes blocks SHALL be visible
- **AND** all of them SHALL appear when the document is printed

#### Scenario: Safe degradation without the interactive layer

- **WHEN** the static exported file is rendered without the interactive layer (JavaScript disabled)
- **THEN** no collapse toggles SHALL be present and no block SHALL be collapsed
- **AND** all memo blocks SHALL render and print normally with no content lost

<!-- @trace
source: cases-export-memo-collapse
updated: 2026-06-16
code:
  - CLAUDE.md
  - src/lib/cases/exportInteractive.ts
  - src/lib/cases/htmlExport.ts
  - ETF/sync_stock_financials.py
  - .github/workflows/etf_financials.yml
  - ETF/services/finlab/client.py
tests:
  - src/lib/cases/__tests__/exportInteractive.test.ts
  - src/lib/cases/__tests__/htmlExport.test.ts
-->

---
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

<!-- @trace
source: cases-export-timeline-density
updated: 2026-06-16
code:
  - src/lib/cases/exportInteractive.ts
  - src/lib/cases/htmlExport.ts
tests:
  - src/lib/cases/__tests__/htmlExport.test.ts
  - src/lib/cases/__tests__/exportInteractive.integration.test.ts
-->