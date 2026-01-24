# Change: Enable Image Alignment

## Why

Currently, images are forced to be centered in the note editor. Users want the flexibility to align images to the left, center, or right to better structure their notes and create more visually appealing documents.

## What Changes

- Update `ResizableImageComponent` to include alignment controls (Left, Center, Right).
- Update `ResizableImageExtension` to support updating the `textAlign` attribute.
- Ensure the alignment is persisted in the document.

## Impact

- Affected specs: `image-alignment`
- Affected code: `src/components/knowledge/editor/ResizableImageComponent.tsx`
