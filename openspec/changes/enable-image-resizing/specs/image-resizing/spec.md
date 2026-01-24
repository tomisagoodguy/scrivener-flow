# Image Resizing Specifications

## ADDED Requirements

### Requirement: Image Editing

The system SHALL allow users to resize images directly in the editor.

#### Scenario: User resizes an image

- **Given** the user is in the note editor
- **And** there is an image in the content
- **When** the user clicks on the image
- **Then** resize handles should appear around the image
- **When** the user drags a resize handle
- **Then** the image should visibly change size
- **And** the new size should be persisted when the note is saved

#### Scenario: Persisted size

- **Given** a note with a resized image
- **When** the note is reloaded (e.g. refreshed or revisited)
- **Then** the image should render with the previously set dimensions
