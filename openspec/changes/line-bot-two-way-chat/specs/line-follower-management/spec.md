## ADDED Requirements

### Requirement: Follow event persists friend's User ID

The system SHALL insert a record into `line_followers` when a `follow` event is received, storing the friend's `source.userId` and display name. If a record for that `source.userId` already exists, the system SHALL set `is_active = true` and update `updated_at`.

#### Scenario: New friend adds the Bot

- **WHEN** a `follow` event is received with a `source.userId` not present in `line_followers`
- **THEN** the system SHALL insert a row with `user_id`, `display_name` (fetched from LINE Profile API), `is_active = true`

#### Scenario: Returning friend re-adds the Bot

- **WHEN** a `follow` event is received with a `source.userId` that already exists in `line_followers` with `is_active = false`
- **THEN** the system SHALL set `is_active = true` and update `updated_at`

#### Scenario: Profile API unavailable

- **WHEN** the LINE Profile API call fails during a `follow` event
- **THEN** the system SHALL still insert/update the `line_followers` record with `display_name = NULL`
- **AND** SHALL NOT reject the event

### Requirement: Unfollow event deactivates friend record

The system SHALL set `is_active = false` on the matching `line_followers` record when an `unfollow` event is received. If no record exists, the system SHALL ignore the event.

#### Scenario: Friend removes the Bot

- **WHEN** an `unfollow` event is received with a `source.userId` present in `line_followers`
- **THEN** the system SHALL update `is_active = false` and `updated_at = now()`

#### Scenario: Unfollow from unknown user

- **WHEN** an `unfollow` event is received with a `source.userId` not in `line_followers`
- **THEN** the system SHALL ignore the event and return HTTP 200

### Requirement: Follower lookup for @reply dispatching

The system SHALL provide a lookup function that accepts a `display_name` string and returns the matching active follower's `user_id` from `line_followers`. The lookup SHALL be case-insensitive and SHALL return `null` if no active match exists.

#### Scenario: Exact display name match

- **WHEN** `findFollowerByDisplayName('小明')` is called
- **AND** `line_followers` has an active record with `display_name = '小明'`
- **THEN** the function SHALL return that record's `user_id`

#### Scenario: Case-insensitive match

- **WHEN** `findFollowerByDisplayName('alan')` is called
- **AND** `line_followers` has an active record with `display_name = 'Alan'`
- **THEN** the function SHALL return that record's `user_id`

#### Scenario: No active match

- **WHEN** `findFollowerByDisplayName('nobody')` is called
- **AND** no active record exists with that display name
- **THEN** the function SHALL return `null`
