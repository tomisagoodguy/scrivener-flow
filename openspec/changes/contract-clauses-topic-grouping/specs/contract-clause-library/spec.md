## Purpose

The contract clause library lets scriveners browse, search, copy and maintain reusable contract clauses. Clauses are organized by a fixed set of topics so that clauses about the same subject appear together and duplicates are easy to spot.

## ADDED Requirements

### Requirement: Fixed clause topic set

Each clause SHALL carry a topic that is either null or exactly one of these 12 values, in this canonical order: 價金付款, 貸款代償, 交屋騰空, 租賃, 車位, 屋況瑕疵, 增建違建, 土地產權, 稅費, 當事人特殊, 預售屋都更, 解約違約. The database MUST reject any other topic value. The topic list SHALL be defined once in application code and reused by the page, the sidebar and the edit form.

#### Scenario: Database rejects an unknown topic

- **WHEN** a client writes a clause with topic 「其他」
- **THEN** the database rejects the write with a check-constraint error and the clause is not saved

#### Scenario: Existing clauses are backfilled

- **WHEN** the migration has been applied to the production database that held 224 clauses on 2026-11-17
- **THEN** every one of those 224 clauses has a non-null topic matching the 2026-11-17 mapping table

### Requirement: Clauses grouped by topic

The clause list SHALL render one section per topic in the canonical topic order, followed by a final section labelled 「未分類」 for clauses whose topic is null. Sections with no matching clauses MUST NOT be rendered. Each section header SHALL show the topic name and the number of clauses in it. Within a section, clauses whose category is 基本特約 SHALL come first, then the rest; within each of those two groups clauses SHALL be ordered by title using zh-TW collation. Each clause card SHALL still show whether it is 基本特約 or 增補特約.

#### Scenario: Grouping order with an untopiced clause

- **WHEN** the visible clauses have topics 稅費, 價金付款 and null
- **THEN** the sections appear in the order 價金付款, 稅費, 未分類

##### Example: Ordering inside a topic section

| Clause title | Category | Topic | Position in 車位 section |
| ------------ | -------- | ----- | ------------------------ |
| 車位－使用權車位 | 增補特約 | 車位 | 2 |
| 車位分管－固定位置，依現況承受 | 增補特約 | 車位 | 3 |
| 車位－不含車位 | 基本特約 | 車位 | 1 |

### Requirement: Sidebar topic filter

The page sidebar SHALL list every topic that has at least one clause, in canonical order, each with its clause count, plus 「未分類」 when any clause has a null topic. Selecting a topic SHALL limit the list to clauses of that topic; clearing the selection SHALL show all clauses. While the search box is non-empty, the search SHALL apply across all topics regardless of the selected topic.

#### Scenario: Select a topic

- **WHEN** the user selects 租賃 in the sidebar with an empty search box
- **THEN** only clauses whose topic is 租賃 are listed, under a single 租賃 section

#### Scenario: Search overrides the topic filter

- **WHEN** 租賃 is selected and the user types 「二胎」 into the search box
- **THEN** clauses from every topic whose searchable text contains 「二胎」 are listed

### Requirement: Search scope covers title, content, note and tags

The search SHALL match case-insensitively against the clause title, content, note and every tag. A clause SHALL be listed when any of those fields contains the search term.

##### Example: Matching fields

| Search term | Clause field containing it | Listed |
| ----------- | -------------------------- | ------ |
| 承諾書 | content only | yes |
| 壓在一起 | note only | yes |
| 排撥 | one tag only | yes |
| 不存在字串 | none | no |

#### Scenario: Match by note

- **WHEN** a clause has note 「氯離子和結構特約不可以壓在一起」 and the user searches 「壓在一起」
- **THEN** that clause is listed

### Requirement: Topic and note in the edit form

The add and edit clause form SHALL require the user to choose a topic from the 12 fixed topics before saving, and SHALL offer an optional multi-line note field. A note that is empty or whitespace-only SHALL be saved as null. Existing clauses with a null topic SHALL open in the form with no topic selected, and saving SHALL be blocked until a topic is chosen.

#### Scenario: Saving without a topic is blocked

- **WHEN** the user opens 新增條文, fills title and content, leaves topic unselected and presses 儲存
- **THEN** the form is not submitted and the topic field is marked as required

#### Scenario: Blank note is stored as null

- **WHEN** the user saves a clause with note consisting only of spaces
- **THEN** the stored note is null

### Requirement: Note shown on the clause card

When a clause has a non-null note, its card SHALL display the note beneath the title in a visually secondary style. The copy action SHALL copy only the clause content, never the note.

#### Scenario: Copy excludes the note

- **WHEN** the user copies a clause that has a note
- **THEN** the clipboard contains exactly the clause content
