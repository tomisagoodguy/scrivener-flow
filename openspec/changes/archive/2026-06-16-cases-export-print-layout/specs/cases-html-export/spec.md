## MODIFIED Requirements

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
