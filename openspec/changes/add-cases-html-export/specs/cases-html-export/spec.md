## ADDED Requirements

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

### Requirement: HTML output escapes user-provided content

The export SHALL HTML-escape all user-provided text values to prevent broken markup or script injection in the generated file.

#### Scenario: Special characters preserved safely

- **WHEN** a case field contains characters such as `<`, `>`, `&`, or `"`
- **THEN** the generated HTML SHALL escape these characters so the original text is displayed literally and is not interpreted as markup
