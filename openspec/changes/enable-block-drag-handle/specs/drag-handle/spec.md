# Drag Handle Specifications

## ADDED Requirements

### Requirement: Draggable Blocks

The system SHALL provide a drag handle next to the active block or hovered block.

#### Scenario: User hovers over a block

- **Given** the user moves the mouse over a paragraph or heading
- **Then** a "⋮⋮" icon should appear in the left gutter, aligned with the block
- **When** the user clicks and holds the icon
- **And** drags it to a new position
- **Then** the block should move to the new position
- **And** a visual indicator (line) should show where the block will land

### Requirement: Block Actions

The system SHALL provide a menu for block-level actions via the handle.

#### Scenario: User clicks drag handle

- **Given** the drag handle is visible
- **When** the user clicks the handle (without dragging)
- **Then** a dropdown menu should appear
- **And** the menu should include "Delete" and "Duplicate" options
