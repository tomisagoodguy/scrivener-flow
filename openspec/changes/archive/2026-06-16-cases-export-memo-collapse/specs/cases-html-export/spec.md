## ADDED Requirements

### Requirement: Memo blocks can be collapsed per card for export and print

The exported HTML's interactive layer SHALL let the user collapse memo blocks both individually (one block on one card) and globally by category (one block type across all cards), so that collapsed blocks are hidden both in on-screen preview and when printed. Each memo block (`.memo-block` — the warning block `memo-warning`, the other-notes block `memo-pending`, and the private-notes block `memo-private`) SHALL receive a runtime-injected per-card collapse toggle carrying the `export-ui` class. The interactive layer SHALL also inject, at the top of the memo section, one global category toggle per block type (warning, pending, private), each carrying the `export-ui` class, that collapses or expands that block type across all cards in a single action. The global toggles SHALL operate by batch-applying the same per-card collapse state — they SHALL NOT introduce a separate second layer of state; a global toggle's direction SHALL be derived from current state (collapse all of that type if any of that type is still expanded, otherwise expand all), and per-card and global controls SHALL stay mutually reflected because both read from and write to the same state. Collapsing a block SHALL apply a CSS class to the actual content node (not merely hide the toggle) so the hidden block does not render on screen and does not appear in print; the toggles themselves, being `export-ui` nodes, SHALL NOT appear in print. The collapse state SHALL be keyed by the card's case id plus the block type (`warning`, `pending`, or `private`) and SHALL be persisted in the existing `#export-state` JSON (a `collapsed` field) alongside assignments and completion state, so that downloading the processed version and reopening it preserves which blocks are collapsed. By default all three block types SHALL be shown and printed; the user must explicitly collapse a block. Collapse SHALL be a display-only concern and SHALL NOT change data normalization, escaping, the existing memo DOM structure, the table or timeline sections, or the on-screen visual style.

#### Scenario: Collapsing a memo block hides it on screen and in print

- **GIVEN** an exported file whose interactive layer has been injected
- **WHEN** the user activates the collapse toggle on a memo card's private-notes block
- **THEN** that block's content SHALL disappear from the on-screen preview
- **AND** that block's content SHALL NOT appear when the document is printed
- **AND** the collapse toggle itself SHALL NOT appear when the document is printed

#### Scenario: Collapse is independent per card and per block type

- **GIVEN** two memo cards each with warning, other-notes, and private-notes blocks
- **WHEN** the user collapses only the private-notes block of the first card
- **THEN** the first card's warning and other-notes blocks SHALL remain visible
- **AND** the second card's private-notes block SHALL remain visible

#### Scenario: Global category toggle collapses one block type across all cards

- **GIVEN** several memo cards that each contain a private-notes block, all currently expanded
- **WHEN** the user activates the global private-notes toggle
- **THEN** every card's private-notes block SHALL become collapsed (hidden on screen and excluded from print)
- **AND** the warning and other-notes blocks SHALL remain visible
- **AND** activating the same global toggle again SHALL expand every card's private-notes block

#### Scenario: Global and per-card controls share one state

- **GIVEN** the user has used the global private-notes toggle to collapse all private-notes blocks
- **WHEN** the user expands one single card's private-notes block with its per-card toggle
- **THEN** that one card's private-notes block SHALL become visible while the others stay collapsed
- **AND WHEN** the user activates the global private-notes toggle again
- **THEN** the remaining expanded private-notes block(s) SHALL be collapsed so all of that type are collapsed

#### Scenario: Collapse state persists across download and reopen

- **GIVEN** the user has collapsed one or more memo blocks
- **WHEN** the user downloads the processed version and reopens it
- **THEN** the previously collapsed blocks SHALL remain collapsed (hidden on screen and excluded from print)
- **AND** blocks that were not collapsed SHALL remain visible

#### Scenario: Default shows and prints all memo blocks

- **WHEN** an exported file is opened and no collapse action has been taken
- **THEN** all of a card's warning, other-notes, and private-notes blocks SHALL be visible
- **AND** all of them SHALL appear when the document is printed

#### Scenario: Safe degradation without the interactive layer

- **WHEN** the static exported file is rendered without the interactive layer (JavaScript disabled)
- **THEN** no collapse toggles SHALL be present and no block SHALL be collapsed
- **AND** all memo blocks SHALL render and print normally with no content lost
