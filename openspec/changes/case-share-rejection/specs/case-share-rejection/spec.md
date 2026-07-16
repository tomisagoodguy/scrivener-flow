## ADDED Requirements

### Requirement: Recipient can reject a shared case

A user who has been granted read-only access to a case via `case_shares` (the "recipient") SHALL be able to mark that share as rejected without requiring any action or confirmation from the case owner.

#### Scenario: Recipient rejects a share

- **WHEN** the recipient triggers the reject action on a case that has been shared with her
- **THEN** the corresponding `case_shares` row's `status` SHALL be updated to `rejected` and `rejected_at` SHALL be set to the current timestamp
- **THEN** the case owner SHALL NOT receive any notification as a result of this action

#### Scenario: Recipient cannot reject another recipient's share

- **WHEN** a user attempts to update a `case_shares` row where `shared_with` does not match her own user id
- **THEN** the database row-level security policy SHALL reject the update and no row SHALL be changed

### Requirement: Rejected shares are excluded from the recipient's visible cases

Any mechanism that determines which shared cases a recipient can see (case list, case detail page) SHALL only include `case_shares` rows where `status` is `active`.

#### Scenario: Rejected case disappears from recipient's case list

- **WHEN** a `case_shares` row for a given case and recipient has `status = 'rejected'`
- **THEN** that case SHALL NOT appear in the recipient's case list
- **THEN** the recipient SHALL NOT be able to open that case's detail page through the share

#### Scenario: Active share remains visible

- **WHEN** a `case_shares` row for a given case and recipient has `status = 'active'`
- **THEN** that case SHALL appear in the recipient's case list

### Requirement: Owner can view rejection history and reactivate a share

The case owner's share panel SHALL display, for each `case_shares` row with `status = 'rejected'`, the recipient's name and the `rejected_at` timestamp, separately from the list of currently active recipients.

#### Scenario: Owner sees rejected recipient in a distinct section

- **WHEN** the case owner opens the share panel for a case that has at least one `case_shares` row with `status = 'rejected'`
- **THEN** the panel SHALL show that recipient in a "rejected" section, distinct from the "active" recipients section
- **THEN** the "active" recipients section SHALL NOT include that recipient

#### Scenario: Owner reactivates a rejected share

- **WHEN** the case owner triggers the "re-share" action on a rejected `case_shares` row
- **THEN** that row's `status` SHALL be updated to `active` and `rejected_at` SHALL be set to `null`
- **THEN** the recipient SHALL regain visibility of the case in her case list
- **THEN** the row SHALL move from the "rejected" section to the "active" section in the owner's share panel

#### Scenario: Non-owner cannot reactivate a share

- **WHEN** a user who does not own the case attempts to update a `case_shares` row's `status` back to `active`
- **THEN** the database row-level security policy SHALL reject the update and no row SHALL be changed
