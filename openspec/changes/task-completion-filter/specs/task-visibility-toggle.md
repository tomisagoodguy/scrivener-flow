# Spec: task-visibility-toggle

## Summary

在 `ChecklistSection.tsx` 標題列右側新增 Toggle 按鈕，讓使用者切換「顯示已完成」/「隱藏已完成」模式。

## Requirements

### Requirement: Toggle UI 元素

- **WHEN** 使用者進入案件詳情頁（`/cases/[id]`）
- **THEN** 在辦事清單（ChecklistSection）的區塊標題右側可見一個 Toggle 按鈕
- **AND** Toggle 顯示 Eye 圖示（顯示時）或 EyeOff 圖示（隱藏時）加上文字提示

### Requirement: Toggle 切換行為

- **WHEN** 使用者點擊 Toggle（當前為「顯示已完成」）
- **THEN** `showCompleted` state 切換為 `false`
- **AND** 所有 `CaseTodos` 元件的 `hideCompleted` prop 立即變為 `true`
- **AND** 已完成任務從視圖中消失

- **WHEN** 使用者點擊 Toggle（當前為「隱藏已完成」）
- **THEN** `showCompleted` state 切換為 `true`
- **AND** 所有已完成任務重新顯示

### Requirement: 預設狀態

- **WHEN** localStorage 中無紀錄（首次使用）
- **THEN** `showCompleted` 預設為 `true`（顯示全部，與現有行為一致）

## Acceptance Criteria

- [ ] Toggle 按鈕可見且可點擊
- [ ] 切換後任務列表即時更新（無頁面刷新）
- [ ] 視覺設計與現有 UI 風格一致（使用現有 button class）
- [ ] Toggle 動畫時間 ≤ 350ms
