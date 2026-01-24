# Design: Image Resizing Implementation

## Architecture

We will extend the default Tiptap `Image` extension to use a custom **React Node View**. This allows us to wrap the standard `<img>` element with React components that handle user interactions (resizing).

### Component Structure

1. **`ResizableImageComponent`**: A React component that will be rendered by Tiptap for every `image` node.
    - It will use the `NodeViewWrapper` from `@tiptap/react`.
    - It will wrap the image in a `<Resizable>` component (using `re-resizable` library).
    - It will handle `onResizeStop` events to update the node's attributes (width/height) so the size persists when saving/loading.

### Data Persistence

The `width` and `height` attributes need to be stored in the document JSON/HTML.

- We will extend the `Image` extension schema to include `width` and `height` attributes if they aren't already fully supported/parsed.

### User Interface

- **Resize Handles**: Visual indicators (dots or bars) on the edges/corners of the selected image.
- **Selection**: The resize handles should only appear when the image is selected (clicked).
- **Visual Feedback**: Real-time feedback during dragging.

## Technical Decisions

- **Library**: `re-resizable` is robust and lightweight for this purpose.
- **Extension**: We will configure the existing `Image` extension with `addNodeView` rather than creating a completely new extension from scratch, to keep things simple.

## Edge Cases

- **Mobile**: Resizing checks on touch devices.
- **Max Width**: Constraints to prevent resizing beyond the editor container width.
- **Alignments**: Ensure resizing works with potential future alignment features (left/center/right). Note: Current scope is resizing only.
