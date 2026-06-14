## ADDED Requirements

### Requirement: Google Calendar authorization scope

The system SHALL request the `https://www.googleapis.com/auth/calendar` OAuth scope at Google sign-in, in addition to existing scopes, so it can create a dedicated calendar and create, update, and delete events on behalf of the signed-in user.

#### Scenario: Sign-in requests calendar scope

- **WHEN** a user signs in through any Google OAuth entry point
- **THEN** the requested scopes include `https://www.googleapis.com/auth/calendar`
- **AND** `access_type=offline` and `prompt=consent` are preserved so a refresh token covering the new scope is obtained

#### Scenario: Missing calendar scope on sync

- **WHEN** a sync call returns an insufficient-scope or 403 authorization error
- **THEN** the system SHALL NOT silently swallow the failure
- **AND** it returns a distinct status indicating the user must re-authenticate to grant calendar access

### Requirement: Dedicated case calendar provisioning

The system SHALL write all synced events to a dedicated Google sub-calendar (named "案件") rather than the user's primary calendar, so case events are separable from personal events. The sub-calendar's id SHALL be stored in `user_settings.case_calendar_id` and reused on subsequent syncs.

#### Scenario: Create dedicated calendar on first sync

- **WHEN** a sync runs and `user_settings.case_calendar_id` is empty
- **THEN** a new sub-calendar is created in the user's account with time zone Asia/Taipei
- **AND** its id is stored in `user_settings.case_calendar_id`
- **AND** all events for that sync are written to that calendar

#### Scenario: Reuse existing dedicated calendar

- **WHEN** a sync runs and `user_settings.case_calendar_id` already references an existing calendar
- **THEN** no new calendar is created and events are written to the stored calendar

#### Scenario: Stored calendar was deleted by user

- **WHEN** a sync targets a stored `case_calendar_id` that returns 404
- **THEN** a replacement sub-calendar is created and `user_settings.case_calendar_id` is updated before events are written

### Requirement: Source-to-event mapping

The system SHALL maintain a `calendar_event_mappings` record for each synced source field, keyed uniquely by `(source_table, source_id, source_field)`, storing the created `google_event_id`, the target `google_calendar_id`, and the last-synced value. Records SHALL be isolated per user via Row Level Security on `user_id`.

#### Scenario: Mapping created on first sync

- **WHEN** a source field is synced and no mapping exists for its `(source_table, source_id, source_field)`
- **THEN** a calendar event is created and a new mapping row records its `google_event_id` and synced value

#### Scenario: User isolation

- **WHEN** a user queries calendar event mappings
- **THEN** only mappings whose `user_id` matches the requesting user are returned

### Requirement: Case date synchronization

The system SHALL synchronize four kinds of date data for cases owned by the signed-in user into the dedicated calendar: milestones (contract/seal/tax/transfer/handover dates), appointment times (sign/seal/tax/handover appointments), financial tax deadlines (land-value/deed/land/house tax deadlines), and active todos (due date). Date-typed sources SHALL produce all-day events; timestamp-typed sources SHALL produce timed events of one hour in the Asia/Taipei time zone. Each event title SHALL identify its source kind and the related case number.

#### Scenario: All-day event for a milestone or tax deadline

- **WHEN** a date-typed source field (milestone date or financial tax deadline) has a value and no mapping exists
- **THEN** an all-day event is created on the dedicated calendar for that date with a title identifying the source and case number

#### Scenario: Timed event for an appointment or todo

- **WHEN** a timestamp-typed source field (appointment time or active todo due date) has a value and no mapping exists
- **THEN** a one-hour timed event is created at that time in Asia/Taipei with a title identifying the source and case number

#### Scenario: Update event when value changes

- **WHEN** a source field has a value, a mapping exists, and the stored synced value differs from the current value
- **THEN** the existing event is updated and the mapping's synced value is updated

#### Scenario: Skip when value unchanged

- **WHEN** a source field has a value, a mapping exists, and the stored synced value equals the current value
- **THEN** no Google Calendar API call is made for that field

#### Scenario: Delete event when value cleared or todo removed

- **WHEN** a source field becomes null, or a synced todo is soft-deleted (`is_deleted = true`)
- **THEN** the corresponding event is deleted and the mapping row is removed

#### Scenario: Event missing on Google side

- **WHEN** an update targets an event that returns 404 (deleted by the user in Google Calendar)
- **THEN** the system recreates the event and updates the mapping with the new event id

##### Example: per-field sync decisions

| Source field type | Current value | Mapping exists | Stored synced value | Action |
| ----------------- | ------------- | -------------- | ------------------- | ------ |
| milestone date | 2026-07-24 | no | — | create all-day event + mapping |
| appointment time | 2026-07-24T14:00+08:00 | no | — | create 1-hour timed event + mapping |
| tax deadline | 2026-08-13 | yes | 2026-08-10 | update event, update synced value |
| todo due date | 2026-07-24T09:00+08:00 | yes | 2026-07-24T09:00+08:00 | skip (no API call) |
| milestone date | null | yes | 2026-07-24 | delete event, remove mapping |
| todo (is_deleted=true) | any | yes | any | delete event, remove mapping |

### Requirement: Automatic sync on data changes

The system SHALL trigger synchronization after the relevant source data is saved — case milestones and financials after a case save, and a todo after its create/complete/soft-delete — and SHALL NOT allow a synchronization failure to interrupt or roll back the originating save.

#### Scenario: Sync runs after case save

- **WHEN** a case's milestones and financials are successfully created or updated through the case save flow
- **THEN** synchronization for that case is invoked

#### Scenario: Sync runs after todo change

- **WHEN** a todo is created, completed, or soft-deleted
- **THEN** synchronization for that todo is invoked

#### Scenario: Sync failure does not break save

- **WHEN** synchronization throws an error during a case save or todo change
- **THEN** the originating save still succeeds
- **AND** the error is logged rather than propagated to the caller

### Requirement: One-time backfill of existing data

The system SHALL provide a server-side action that backfills calendar events for all existing milestones, appointments, financial tax deadlines, and active todos of the signed-in user's cases, and the action SHALL be safely re-runnable without creating duplicate events.

#### Scenario: Backfill creates events for existing data

- **WHEN** the signed-in user triggers the backfill action
- **THEN** the dedicated calendar is provisioned if needed
- **AND** every non-null source field across the four kinds for cases owned by that user is synced to a calendar event

#### Scenario: Backfill is idempotent

- **WHEN** the backfill action is run a second time with no source-data changes in between
- **THEN** no duplicate events are created and unchanged fields make no Google Calendar API calls

#### Scenario: Backfill scoped to owner

- **WHEN** the backfill action runs
- **THEN** only data whose `user_id` matches the signed-in user is processed
