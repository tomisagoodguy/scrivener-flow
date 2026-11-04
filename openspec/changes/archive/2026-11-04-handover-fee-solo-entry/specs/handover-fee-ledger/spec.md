## ADDED Requirements

### Requirement: Record a solo handover entry

The ledger form SHALL provide a control that switches between recording an exchange between scriveners and recording a solo entry. A solo entry represents handovers the user performed alone and SHALL have no payer and no payee. A solo entry SHALL store a fee date, a case count, an optional amount, an optional object number, and an optional note. The fee date input SHALL default to the current date in the Asia/Taipei time zone and SHALL be editable. The case count input SHALL default to `1`. The user SHALL be free to record several handovers as one entry with a larger case count or as separate entries. The system MUST reject the entry, without storing it, when the case count is not a positive integer or exceeds 9999, or when a provided amount is not a positive integer. An empty amount SHALL be stored as no amount.

#### Scenario: Record only the number of cases

- **WHEN** the user switches the form to solo on 2026-11-04 (Asia/Taipei), sets the case count to `3`, leaves the amount empty, and submits
- **THEN** a solo entry dated 2026-11-04 with case count 3 and no amount is stored and appears in the history of 2026-11

#### Scenario: Record cases with earnings

- **WHEN** the user submits a solo entry with case count `2` and amount `6000`
- **THEN** a solo entry with case count 2 and amount 6000 is stored

#### Scenario: One entry per case

- **WHEN** the user submits two solo entries on the same date, each with the default case count
- **THEN** two separate entries are stored, each with case count 1

#### Scenario: No scriveners required

- **GIVEN** the user's active roster is empty
- **WHEN** the user submits a valid solo entry
- **THEN** the entry is stored

#### Scenario: Reject invalid solo input

- **WHEN** the user submits a solo entry that violates a validation rule
- **THEN** no entry is stored and the form shows an error message naming the failed rule

##### Example: solo validation cases

| Input | Expected | Notes |
| ----- | -------- | ----- |
| case count `0` | rejected: `件數必須是正整數` | zero |
| case count `-1` | rejected: `件數必須是正整數` | negative |
| case count `1.5` | rejected: `件數必須是正整數` | decimal |
| case count empty | rejected: `件數必須是正整數` | missing |
| case count `10000` | rejected: `件數必須是正整數` | above limit |
| amount `0` | rejected: `金額必須是正整數` | zero |
| amount `1500.5` | rejected: `金額必須是正整數` | decimal |
| case count `1`, amount empty | stored with no amount | amount is optional |
| case count `3`, amount `9000` | stored | valid |

---
### Requirement: Edit a solo handover entry

Every solo entry in the history SHALL provide an edit action. Choosing it SHALL load the entry's fee date, object number, case count, amount, and note into the solo form in edit mode with a cancel control, and on submit SHALL overwrite that entry with the new values. Editing SHALL apply the same validation rules as creating a solo entry. The entry type SHALL NOT be changeable: the form SHALL NOT offer the type switch in edit mode, and an edit that targets a record of the other type SHALL return the error `找不到紀錄，請重新整理` without storing anything. Deleting a solo entry SHALL follow the same confirmation and soft-delete behavior as other records.

#### Scenario: Edit a solo entry

- **GIVEN** a solo entry dated 2026-11-04 with case count 3 and no amount
- **WHEN** the user chooses edit, changes the case count to `4` and the amount to `12000`, and saves
- **THEN** the same entry now has case count 4 and amount 12000, and no new entry is created

#### Scenario: Cancel editing a solo entry

- **WHEN** the user chooses edit on a solo entry and then presses cancel
- **THEN** the entry is unchanged and the form is back in create mode

#### Scenario: Type is fixed while editing

- **WHEN** the user chooses edit on any record
- **THEN** the form shows the fields of that record's type and offers no type switch

#### Scenario: Edit targets the other type

- **WHEN** a solo edit request targets an exchange record, or an exchange edit request targets a solo entry
- **THEN** nothing is stored and the error `找不到紀錄，請重新整理` is returned

---
### Requirement: Solo entries have no receipt tracking

Solo entries SHALL have no received status. A solo entry SHALL NOT appear in the unpaid list, SHALL NOT count toward the unpaid summary, and SHALL NOT receive an aging highlight. A request to mark a solo entry as received or not received SHALL return the error `找不到紀錄，請重新整理` without storing anything. Exchange records, including all records that existed before solo entries were introduced, SHALL keep their received status behavior unchanged.

#### Scenario: Solo entry stays out of the unpaid list

- **GIVEN** a solo entry dated 2026-10-01 and an unpaid exchange record of 3000
- **WHEN** the unpaid list renders on 2026-11-04
- **THEN** only the exchange record is listed and the summary shows 1 record totalling 3000

#### Scenario: Reject marking a solo entry as received

- **WHEN** a request marks a solo entry as received
- **THEN** the entry is unchanged and the error `找不到紀錄，請重新整理` is returned

#### Scenario: Existing records stay exchange records

- **WHEN** an unpaid record created before this change is viewed
- **THEN** it remains in the unpaid list with its payer, payee, and amount, and can be marked as received

---
### Requirement: Monthly history summary

The history section SHALL show a summary of the records it currently lists. The summary SHALL show solo entries and exchange records separately and SHALL NOT add them together: solo entries as the sum of their case counts and the sum of their amounts, and exchange records as the number of records and the sum of their amounts. A solo entry with no amount SHALL count toward the case total and SHALL NOT affect the amount total. A record type with no listed records SHALL be omitted from the summary, and when no records are listed the summary SHALL NOT be shown.

#### Scenario: Summary keeps solo and exchange apart

- **GIVEN** the selected month lists solo entries with case count 3 and amount 9000, and case count 1 with no amount, and exchange records of 3000 and 2000
- **WHEN** the history renders
- **THEN** the summary shows solo 4 cases totalling 9000 and exchange 2 records totalling 5000

#### Scenario: Summary follows the scrivener filter

- **GIVEN** the selected month has a solo entry and one exchange record of 3000 involving 孔協
- **WHEN** the user filters by 孔協
- **THEN** the summary shows exchange 1 record totalling 3000 and omits the solo part

#### Scenario: Deleted records are not counted

- **WHEN** a solo entry with case count 2 is deleted
- **THEN** the summary no longer includes its 2 cases

#### Scenario: Empty month shows no summary

- **WHEN** the selected month has no records
- **THEN** no summary is shown and the empty-state message is displayed

## MODIFIED Requirements

### Requirement: Handover fee history with filters

The ledger view SHALL provide a history section listing all non-deleted records (exchange records and solo entries) of the selected month, ordered by fee date descending. Each exchange record SHALL show its received status. Each solo entry SHALL be labelled `自己遞牌` and show its case count, its amount or `—` when it has none, and SHALL NOT show a received status or a mark-received action. The month filter SHALL default to the current month in Asia/Taipei. A scrivener filter SHALL, when set, keep only records where the selected scrivener is either the payer or the payee, which excludes solo entries. Records whose scriveners are hidden SHALL still display those scrivener names.

#### Scenario: Filter by month and scrivener

- **GIVEN** records: 2026-10-05 孔協→家華, 2026-10-12 定康→孔協, 2026-10-20 文慶→瑞麟, 2026-09-30 孔協→順鵬
- **WHEN** the user selects month 2026-10 and scrivener 孔協
- **THEN** the history lists 2026-10-12 定康→孔協 then 2026-10-05 孔協→家華

#### Scenario: Hidden scrivener in history

- **WHEN** a record's payee 來慶 has been hidden from the roster
- **THEN** the history still shows 來慶 as that record's payee

#### Scenario: Solo entry in history

- **GIVEN** a solo entry dated 2026-11-04 with case count 3 and no amount
- **WHEN** the user selects month 2026-11 with no scrivener filter
- **THEN** the history shows the entry labelled `自己遞牌` with `3 件`, `—` as its amount, and no received status or mark-received action

#### Scenario: Scrivener filter excludes solo entries

- **GIVEN** a solo entry and an exchange record involving 孔協 in the selected month
- **WHEN** the user filters by 孔協
- **THEN** only the exchange record is listed
