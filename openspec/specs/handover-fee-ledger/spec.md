# handover-fee-ledger Specification

## Purpose

Provide a personal ledger for handover fees (遞牌費) exchanged between land scriveners (地政士) when one signs on behalf of an unlicensed party. Fees are normally settled the same day; the ledger exists so the user can track which fees have not been received yet.

## Requirements

### Requirement: Handover fee tab on cases page

The `/cases` page SHALL show a tab labelled `💰 遞牌費` immediately after the `⚠️ 未完成統整` tab, linking to `/cases?status=HandoverFee`. When `status=HandoverFee`, the page SHALL render the handover fee ledger view and SHALL NOT render the case monitoring widgets or the case list table.

#### Scenario: Open the handover fee tab

- **WHEN** the user clicks the `💰 遞牌費` tab on `/cases`
- **THEN** the URL becomes `/cases?status=HandoverFee`, the tab is shown as active, and the handover fee ledger view is displayed
- **AND** the case monitoring widgets and the case list table are not displayed

#### Scenario: Other tabs unaffected

- **WHEN** the user opens `/cases?status=Processing`
- **THEN** the handover fee ledger view is not rendered and the case list table renders as before

---
### Requirement: Record a handover fee

The system SHALL let the user create a handover fee record with: fee date, an optional object number, payer scrivener, payee scrivener, amount, and an optional note. The fee date input SHALL default to the current date in the Asia/Taipei time zone and SHALL be editable by the user. An object number that is empty after trimming SHALL be stored as no object number, and lists SHALL display `—` for it. Payer and payee SHALL be chosen from the user's active scriveners, and the form SHALL provide a swap control that exchanges the selected payer and payee. A new record SHALL be stored as not received. The system MUST reject the record, without storing it, when the payer equals the payee, when the amount is not a positive integer, when either scrivener is missing, or when either scrivener is hidden or not in the user's roster.

#### Scenario: Create a record with the default date

- **WHEN** the user opens the form on 2026-10-28 (Asia/Taipei), leaves the date unchanged, enters object number `A123`, selects payer 孔協 and payee 家華, enters amount `3000`, and submits
- **THEN** a record dated 2026-10-28 with object number `A123`, payer 孔協, payee 家華, amount 3000, and status not received is stored and appears in the unpaid list

#### Scenario: Create a record for an earlier date

- **WHEN** the user changes the date to 2026-10-25 before submitting a valid record
- **THEN** the stored record's fee date is 2026-10-25

#### Scenario: Create a record without an object number

- **WHEN** the user leaves the object number empty (or only spaces) and submits an otherwise valid record
- **THEN** the record is stored with no object number and the unpaid list shows `—` in its object number position

#### Scenario: Swap payer and payee

- **WHEN** payer is 孔協 and payee is 家華 and the user presses the swap control
- **THEN** payer becomes 家華 and payee becomes 孔協

#### Scenario: Reject invalid input

- **WHEN** the user submits a record that violates a validation rule
- **THEN** no record is stored and the form shows an error message naming the failed rule

##### Example: validation cases

| Input | Expected | Notes |
| ----- | -------- | ----- |
| payer 孔協, payee 孔協 | rejected: payer and payee must differ | same person |
| amount `0` | rejected: amount must be a positive integer | zero |
| amount `-500` | rejected: amount must be a positive integer | negative |
| amount `1500.5` | rejected: amount must be a positive integer | decimal |
| object number of only spaces | stored with no object number | object number is optional |
| amount `3000`, distinct scriveners, object `A123` | stored | valid |

---
### Requirement: Edit a handover fee record

Every row in the unpaid list and the history SHALL provide an edit action. Choosing it SHALL load that record's fee date, object number, payer, payee, amount, and note into the form, switch the form into edit mode with a cancel control, and on submit SHALL overwrite that record with the new values. Editing SHALL apply the same validation rules as creating a record and SHALL NOT change the record's received status or received time. Cancelling SHALL leave the record unchanged and return the form to create mode. A deleted record MUST NOT be editable; an edit targeting a deleted or non-existent record SHALL return a not-found error without storing anything. When the record's payer or payee is hidden, the form SHALL show that scrivener as unselected so the user must choose an active one before saving.

#### Scenario: Edit an unpaid record

- **GIVEN** an unpaid record dated 2026-10-27, object `A123`, 孔協 → 家華, amount 3000
- **WHEN** the user chooses edit on it, changes the amount to `3500` and the object number to `A124`, and saves
- **THEN** the same record now has object `A124` and amount 3500, it remains not received, and no new record is created

#### Scenario: Edit keeps received status

- **WHEN** the user edits a received record in the history and changes its note
- **THEN** the record keeps its received status and received time

#### Scenario: Cancel editing

- **WHEN** the user chooses edit on a record and then presses cancel
- **THEN** the record is unchanged and the form is empty and back in create mode

#### Scenario: Reject invalid edit

- **WHEN** the user edits a record so that payer equals payee and saves
- **THEN** the record is unchanged and the form shows `付款人與收款人不可相同`

#### Scenario: Edit a deleted record

- **WHEN** an edit request targets a record that has been deleted
- **THEN** nothing is stored and the error `找不到紀錄，請重新整理` is returned

---
### Requirement: Unpaid fee list with aging highlight

The ledger view SHALL show, as its primary section, every not-received record of the current user, ordered by fee date ascending (oldest first), showing date, object number, payer → payee, amount, and note. The section SHALL show the count and the total amount of not-received records. Each row SHALL be highlighted by age, where age is the number of whole days between the fee date and today's date in Asia/Taipei: age greater than 7 SHALL use the red highlight, age greater than 3 and at most 7 SHALL use the orange highlight, and age of 3 or less SHALL have no highlight. When there are no not-received records, the section SHALL show an empty-state message.

#### Scenario: Aging highlight by age

- **WHEN** today is 2026-10-28 (Asia/Taipei) and the unpaid list renders
- **THEN** each row's highlight follows its age

##### Example: aging boundaries

| Fee date | Age (days) | Highlight |
| -------- | ---------- | --------- |
| 2026-10-28 | 0 | none |
| 2026-10-25 | 3 | none |
| 2026-10-24 | 4 | orange |
| 2026-10-21 | 7 | orange |
| 2026-10-20 | 8 | red |

#### Scenario: Summary of unpaid records

- **GIVEN** not-received records of amounts 3000 and 2000 and one received record of 5000
- **WHEN** the unpaid list renders
- **THEN** the summary shows 2 records totalling 5000 and only the two not-received rows are listed

---
### Requirement: Mark a fee as received

The system SHALL let the user mark a not-received record as received with a single action, storing the time of the action as the received time. A received record SHALL disappear from the unpaid list. In the history view the user SHALL be able to revert a received record to not received, which clears the received time and returns it to the unpaid list.

#### Scenario: Mark received

- **WHEN** the user presses `已收` on an unpaid row
- **THEN** the record is stored as received with a received time, and the row no longer appears in the unpaid list

#### Scenario: Revert to not received

- **WHEN** the user reverts a received record in the history view
- **THEN** the record is stored as not received with no received time and appears in the unpaid list again

---
### Requirement: Delete a handover fee record

The system SHALL let the user delete a record after an explicit confirmation. A deleted record SHALL be soft-deleted (retained in storage with a deletion time) and SHALL NOT appear in the unpaid list or the history view.

#### Scenario: Delete with confirmation

- **WHEN** the user chooses delete on a record and confirms
- **THEN** the record no longer appears in the unpaid list or the history view

#### Scenario: Cancel deletion

- **WHEN** the user chooses delete on a record and cancels the confirmation
- **THEN** the record remains unchanged

---
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

---
### Requirement: Scrivener roster management

Each user SHALL have their own scrivener roster. When a user who has never had any scriveners opens the ledger view, the system SHALL create the default roster 孔協、家華、定康、文慶、瑞麟、來慶、順鵬 in that order, exactly once. The user SHALL be able to add a scrivener by name (trimmed, non-empty) from within the ledger view, including directly from the payer/payee selector. Adding a name that matches an active scrivener SHALL be rejected with an error; adding a name that matches a hidden scrivener SHALL restore that scrivener instead of creating a duplicate. The user SHALL be able to hide a scrivener: hidden scriveners SHALL NOT appear in the payer/payee selectors or the history scrivener filter options, and existing records referencing them SHALL remain unchanged.

#### Scenario: Default roster on first use

- **WHEN** a user with no scriveners opens `/cases?status=HandoverFee` for the first time
- **THEN** the payer/payee selectors list 孔協、家華、定康、文慶、瑞麟、來慶、順鵬 in that order

#### Scenario: No re-seeding after hiding everyone

- **WHEN** a user has hidden all scriveners and opens the ledger view again
- **THEN** no default scrivener is recreated and the selectors are empty with a prompt to add a scrivener

#### Scenario: Add a new scrivener from the selector

- **WHEN** the user enters `志明` in the selector's add option and confirms
- **THEN** 志明 is added to the roster and becomes selectable without leaving the form

#### Scenario: Reject duplicate active name

- **WHEN** the user adds `家華` while 家華 is active
- **THEN** the addition is rejected with a duplicate-name error

#### Scenario: Restore hidden name

- **WHEN** the user adds `來慶` while 來慶 is hidden
- **THEN** 來慶 becomes active again and no second 來慶 exists

---
### Requirement: Per-user data isolation

The `scriveners` and `handover_fees` tables SHALL enforce row level security so that a user can select, insert, update, and delete only rows whose `user_id` equals their own authenticated user id. A handover fee SHALL only reference scriveners owned by the same user.

#### Scenario: Other user's records invisible

- **WHEN** user B opens the ledger view while user A has stored records
- **THEN** user B sees none of user A's records or scriveners

#### Scenario: Reject foreign scrivener reference

- **WHEN** a request tries to create a handover fee whose payer id belongs to another user's roster
- **THEN** the record is not stored and an error is returned

---
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
