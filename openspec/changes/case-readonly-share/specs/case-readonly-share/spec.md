## ADDED Requirements

### Requirement: Case owner can share a case read-only with another user
The system SHALL allow a case owner (`cases.user_id = auth.uid()`) to grant read-only access to a case to another authenticated user by creating a row in `case_shares`.

#### Scenario: Owner shares a case with a colleague
- **WHEN** the case owner selects a colleague in the share panel of a case they own and confirms
- **THEN** a `case_shares` row is created with `case_id` set to that case, `shared_with` set to the colleague's user id, and `shared_by` set to the owner's user id

#### Scenario: Sharing the same case with the same user twice is idempotent
- **WHEN** the case owner shares a case with a colleague who already has a `case_shares` row for that case
- **THEN** the system SHALL NOT create a duplicate row and SHALL NOT surface an error to the owner

#### Scenario: Non-owner cannot create a share
- **WHEN** a user who is not `cases.user_id` for a given case attempts to insert a `case_shares` row for that case
- **THEN** the database SHALL reject the insert via Row Level Security

### Requirement: Case owner can revoke a share
The system SHALL allow a case owner to remove a `case_shares` row for a case they own, immediately ending the shared user's read access.

#### Scenario: Owner revokes a colleague's access
- **WHEN** the case owner removes a colleague from the share panel of a case they own
- **THEN** the corresponding `case_shares` row is deleted
- **AND** the colleague's next query against `cases`, `milestones`, `financials`, or `redemption_steps` for that case SHALL return no rows

#### Scenario: Non-owner cannot revoke a share
- **WHEN** a user who is not `cases.user_id` for a given case attempts to delete a `case_shares` row for that case
- **THEN** the database SHALL reject the delete via Row Level Security

### Requirement: Shared user has read-only access to case data
A user with an active `case_shares` row for a case (`shared_with = auth.uid()`) SHALL be able to read that case's `cases`, `milestones`, `financials`, and `redemption_steps` rows, and SHALL NOT be able to insert, update, or delete rows in any of those four tables for that case.

#### Scenario: Shared user reads case detail
- **WHEN** a shared user queries `cases`, `milestones`, `financials`, or `redemption_steps` for a case shared with them
- **THEN** the query returns the matching rows

#### Scenario: Shared user cannot modify milestones
- **WHEN** a shared user attempts to update a `milestones` row belonging to a case shared with them
- **THEN** the database SHALL reject the update via Row Level Security

#### Scenario: Shared user cannot modify financials
- **WHEN** a shared user attempts to update a `financials` row belonging to a case shared with them
- **THEN** the database SHALL reject the update via Row Level Security

#### Scenario: Shared user cannot delete the case
- **WHEN** a shared user attempts to delete a `cases` row shared with them
- **THEN** the database SHALL reject the delete via Row Level Security

#### Scenario: User with no share cannot read the case
- **WHEN** a user who is neither `cases.user_id` nor `shared_with` for a case queries that case
- **THEN** the query returns no rows

### Requirement: Case list surfaces owned and shared cases with a distinguishing source
The case list view SHALL include both cases owned by the current user and cases shared with the current user, and SHALL indicate for each case whether it is owned or shared.

#### Scenario: Case list includes a shared case
- **WHEN** a user who has been granted a share for a case loads the case list
- **THEN** the shared case appears in the list labeled as shared (not owned)

#### Scenario: Case list excludes cases neither owned nor shared
- **WHEN** a user loads the case list
- **THEN** cases they neither own nor have been shared SHALL NOT appear in the list

### Requirement: Case detail view hides edit controls for shared users
When a shared user (not the owner) views a case's detail page, all controls that create, update, or delete case data (milestones, financials, redemption steps, or case fields) SHALL be hidden or disabled.

#### Scenario: Shared user views case detail
- **WHEN** a shared user opens the detail page of a case shared with them
- **THEN** all input fields and action buttons for editing milestones, financials, redemption steps, and case fields are disabled or not rendered

#### Scenario: Owner views own case detail
- **WHEN** the case owner opens the detail page of their own case
- **THEN** all edit controls are rendered and enabled as before this change

### Requirement: Share panel accessible from case detail view
The case detail view SHALL provide a share entry point, visible only to the case owner, that opens a panel listing current shares and allowing the owner to add or remove shared users.

#### Scenario: Owner opens share panel
- **WHEN** the case owner clicks the share button on their own case's detail view
- **THEN** a panel opens showing the list of users currently shared on that case, each with a remove control, and a search input to add new users

#### Scenario: Share button not shown to shared users
- **WHEN** a shared (non-owner) user opens the detail view of a case shared with them
- **THEN** the share button SHALL NOT be rendered
