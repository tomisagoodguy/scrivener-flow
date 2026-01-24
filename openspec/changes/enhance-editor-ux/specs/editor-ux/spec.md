# Editor UX Specifications

## ADDED Requirements

### Requirement: Slash Commands

The system SHALL provide a command menu when the user types a forward slash (`/`) at the beginning of a line or after a space.

#### Scenario: User triggers slash menu

- **Given** the user is editing a note
- **When** the user types `/` in an empty paragraph
- **Then** a command menu should appear near the cursor
- **And** the menu should list options like "Heading 1", "Bulleted List", "Checklist", "Image"
- **When** the user selects an option
- **Then** the corresponding block should be inserted or applied
- **And** the `/` character should be removed

### Requirement: Bubble Menu

The system SHALL display a floating menu when the user selects a range of text.

#### Scenario: User selects text

- **Given** the user contains text content
- **When** the user selects a word or phrase
- **Then** a bubble menu should appear above the selection
- **And** the menu should offer formatting options (Bold, Italic, Strike, Link)
- **When** the user clicks outside the selection
- **Then** the menu should disappear
