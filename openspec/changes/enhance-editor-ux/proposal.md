# Change: Enhance Editor UX

## Why

Users currently rely on a fixed toolbar for formatting, which breaks their writing flow. To provide a modern, "Notion-like" experience (inspired by `novel`), users need context-aware tools that appear exactly when needed.

## What Changes

- **Slash Commands**: Typing `/` triggers a popup menu to insert blocks (Headings, Lists, Images, etc.).
- **Bubble Menu**: Selecting text triggers a floating menu for inline formatting (Bold, Italic, Link).
- **Dependencies**: Add `tippy.js` (for positioning) or use Tiptap's built-in `BubbleMenu` and `FloatingMenu` components.

## Impact

- Affected specs: `editor-ux`
- Affected code: `src/components/knowledge/RichTextEditor.tsx`, `src/components/knowledge/editor/`
