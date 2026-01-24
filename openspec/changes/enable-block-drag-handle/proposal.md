# Change: Enable Block Drag Handle

## Why

User strictly requested a "Notion-like" experience where content feels like independent blocks that can be rearranged. Currently, the editor feels like a standard document processor. The missing key interaction is the "Drag Handle" in the gutter.

## What Changes

- Implement a floating Drag Handle ("⋮⋮" icon) that follows the mouse cursor in the editor gutter.
- Implement Drag & Drop logic to reorder Tiptap nodes.
- Add a menu to the handle for block operations (Delete, Duplicate).
- Use `drag-handle-plugin` or similar logic compatible with React/Next.js.

## Impact

- Affected specs: `drag-handle-interaction`
- Affected code: `src/components/knowledge/RichTextEditor.tsx`, `src/components/knowledge/editor/DragHandle.tsx`
