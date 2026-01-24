# Image Alignment Specifications

## ADDED Requirements

### Requirement: Image Alignment

The system SHALL allow users to align images to the left, center, or right.

#### Scenario: User aligns an image

- **Given** the user is in the note editor
- **And** there is an image in the content
- **When** the user selects the image
- **Then** alignment controls should appear (e.g., in a bubble menu or near the image)
- **When** the user clicks an alignment option (Left, Center, Right)
- **Then** the image should move to the corresponding position
- **And** the alignment shoud be persisted when saved
