## Purpose

Provide a personal ledger for handover fees (遞牌費) exchanged between land scriveners (地政士) when one signs on behalf of an unlicensed party. Fees are normally settled the same day; the ledger exists so the user can track which fees have not been received yet.

## ADDED Requirements

### Requirement: Handover fee tab on cases page

The `/cases` page SHALL show a tab labelled `💰 遞牌費` immediately after the `⚠️ 未完成統整` tab, linking to `/cases?status=HandoverFee`. When `status=HandoverFee`, the page SHALL render the handover fee ledger view and SHALL NOT render the case monitoring widgets or the case list table.

#### Scenario: Open the handover fee tab

- **WHEN** the user clicks the `💰 遞牌費` tab on `/cases`
- **THEN** the URL becomes `/cases?status=HandoverFee`, the tab is shown as active, and the handover fee ledger view is displayed
- **AND** the case monitoring widgets and the case list table are not displayed

#### Scenario: Other tabs unaffected

- **WHEN** the user opens `/cases?status=Processing`
- **THEN** the handover fee ledger view is not rendered and the case list table renders as before

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

### Requirement: Mark a fee as received

The system SHALL let the user mark a not-received record as received with a single action, storing the time of the action as the received time. A received record SHALL disappear from the unpaid list. In the history view the user SHALL be able to revert a received record to not received, which clears the received time and returns it to the unpaid list.

#### Scenario: Mark received

- **WHEN** the user presses `已收` on an unpaid row
- **THEN** the record is stored as received with a received time, and the row no longer appears in the unpaid list

#### Scenario: Revert to not received

- **WHEN** the user reverts a received record in the history view
- **THEN** the record is stored as not received with no received time and appears in the unpaid list again

### Requirement: Delete a handover fee record

The system SHALL let the user delete a record after an explicit confirmation. A deleted record SHALL be soft-deleted (retained in storage with a deletion time) and SHALL NOT appear in the unpaid list or the history view.

#### Scenario: Delete with confirmation

- **WHEN** the user chooses delete on a record and confirms
- **THEN** the record no longer appears in the unpaid list or the history view

#### Scenario: Cancel deletion

- **WHEN** the user chooses delete on a record and cancels the confirmation
- **THEN** the record remains unchanged

### Requirement: Handover fee history with filters

The ledger view SHALL provide a history section listing all non-deleted records (received and not received) of the selected month, ordered by fee date descending, showing each record's received status. The month filter SHALL default to the current month in Asia/Taipei. A scrivener filter SHALL, when set, keep only records where the selected scrivener is either the payer or the payee. Records whose scriveners are hidden SHALL still display those scrivener names.

#### Scenario: Filter by month and scrivener

- **GIVEN** records: 2026-10-05 孔協→家華, 2026-10-12 定康→孔協, 2026-10-20 文慶→瑞麟, 2026-09-30 孔協→順鵬
- **WHEN** the user selects month 2026-10 and scrivener 孔協
- **THEN** the history lists 2026-10-12 定康→孔協 then 2026-10-05 孔協→家華

#### Scenario: Hidden scrivener in history

- **WHEN** a record's payee 來慶 has been hidden from the roster
- **THEN** the history still shows 來慶 as that record's payee

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

### Requirement: Per-user data isolation

The `scriveners` and `handover_fees` tables SHALL enforce row level security so that a user can select, insert, update, and delete only rows whose `user_id` equals their own authenticated user id. A handover fee SHALL only reference scriveners owned by the same user.

#### Scenario: Other user's records invisible

- **WHEN** user B opens the ledger view while user A has stored records
- **THEN** user B sees none of user A's records or scriveners

#### Scenario: Reject foreign scrivener reference

- **WHEN** a request tries to create a handover fee whose payer id belongs to another user's roster
- **THEN** the record is not stored and an error is returned
