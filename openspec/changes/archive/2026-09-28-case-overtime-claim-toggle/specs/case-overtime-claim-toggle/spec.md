## ADDED Requirements

### Requirement: Independent buyer/seller overtime-claimed flags

The system SHALL persist two independent boolean flags per case: `buyer_overtime_claimed` and `seller_overtime_claimed`, each representing whether the overtime pay for that party's document-sealing appointment has been entered into the company system. These flags SHALL be independent of, and SHALL NOT be automatically toggled by, the completion state of the buyer or seller document-sealing todo items.

#### Scenario: Sealing a document does not affect the overtime flag

- **WHEN** a user marks the buyer document-sealing todo item as complete for a case
- **THEN** `buyer_overtime_claimed` for that case remains unchanged (stays `false` if it was `false`)

#### Scenario: Toggling one party's flag does not affect the other

- **WHEN** a user toggles `buyer_overtime_claimed` from `false` to `true` for a case
- **THEN** `seller_overtime_claimed` for that same case remains unchanged

### Requirement: Manual toggle control in case list

The `/cases` list SHALL display one clickable toggle control in the buyer column and one in the seller column of each case row, allowing the user to manually switch the corresponding overtime-claimed flag between `true` and `false`.

#### Scenario: User marks buyer overtime as claimed

- **WHEN** a user clicks the buyer overtime toggle control on a case row where `buyer_overtime_claimed` is `false`
- **THEN** the system SHALL update `buyer_overtime_claimed` to `true` for that case and the control SHALL immediately reflect the claimed visual state

#### Scenario: User un-marks a previously claimed overtime flag

- **WHEN** a user clicks the seller overtime toggle control on a case row where `seller_overtime_claimed` is `true`
- **THEN** the system SHALL update `seller_overtime_claimed` to `false` for that case and the control SHALL immediately reflect the unclaimed visual state

### Requirement: Distinct unclaimed visual treatment

Each overtime toggle control SHALL render with a visually prominent (attention-drawing) style when its flag is `false` (unclaimed), and a neutral/completed style when its flag is `true` (claimed), so a user scanning the case list can identify which parties' overtime pay has not yet been entered.

#### Scenario: Unclaimed flag is visually prominent

- **WHEN** a case row is rendered and `buyer_overtime_claimed` is `false`
- **THEN** the buyer overtime toggle control SHALL render in the prominent/unclaimed style, visually distinct from the claimed style

#### Scenario: Claimed flag is visually neutral

- **WHEN** a case row is rendered and `seller_overtime_claimed` is `true`
- **THEN** the seller overtime toggle control SHALL render in the neutral/claimed style

### Requirement: Persisted state survives reload and cross-device access

The overtime-claimed flags SHALL be persisted in the database so that the state is preserved across page reloads and when the same user views the case list from a different device or session.

#### Scenario: State survives page reload

- **WHEN** a user toggles `buyer_overtime_claimed` to `true` for a case and then reloads the `/cases` page
- **THEN** the buyer overtime toggle control for that case SHALL still show the claimed state

#### Scenario: Update failure reverts optimistic UI state

- **WHEN** a user clicks an overtime toggle control and the underlying update request fails
- **THEN** the system SHALL revert the toggle control to its prior state and SHALL surface a non-blocking error notification to the user
