# Change: Enable Image Resizing

## Why

Currently, the `RichTextEditor` (Tiptap) renders images with a default max-width, but users cannot interactively resize them. This limits the ability to create well-formatted documents, especially when dealing with screenshots or diagrams that might not need to be full-width.

## What Changes

- Add `re-resizable` dependency for UI resize handles.
- Create a custom Tiptap Node View for Images.
- Configure `RichTextEditor` to use the new Node View.
- Persist image dimensions in the document content.

## Impact

- Affected specs: `image-resizing`
- Affected code: `src/components/knowledge/RichTextEditor.tsx`, `src/components/knowledge/editor/`
