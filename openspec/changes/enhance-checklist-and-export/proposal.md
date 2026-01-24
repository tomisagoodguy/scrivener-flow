# Enhance Checklist and Export

## Metadata

- ID: enhance-checklist-and-export
- Status: Draft
- Author: Antigravity

## Summary

Modifies the "Cases" feature to fix build errors, enhance checklist flexibility, and rename UI elements for better clarity.

## Problem Statement

1. **Build Error**: Application build fails due to missing `uuid` dependency required by `exceljs`.
2. **Static Checklist**: The current "todo" list in case management is hardcoded and doesn't allow users to track custom tasks.
3. **UI Terminology**: The button label "讀取案件單 (.docx)" doesn't accurately reflect its function of reading visiting logs/notes.

## Solution Overview

1. **Dependency Fix**: Add `uuid` to project dependencies to satisfy `exceljs` requirements.
2. **Dynamic Checklist**: Update `CaseCompactTodoList` to support adding custom checklist items per case, persisting effectively to the existing `todos` JSONB column.
3. **UI Rename**: Rename the upload button to "讀取多筆代書備忘錄(.docx)".

## Impact Analysis

- **Build**: Resolves `Module not found` error, enabling successful deployment.
- **UX**: Users can now track ad-hoc tasks, improving case management flexibility.
- **DB**: Uses existing `todos` JSONB column; no schema migration required, but frontend logic will change to render dynamic keys.
