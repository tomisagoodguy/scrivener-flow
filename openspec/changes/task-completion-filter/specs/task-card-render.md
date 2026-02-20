# Spec: task-card-render（已修改能力）

## Summary

修改 `CaseTodos.tsx` 以支援：

1. 受控的 `hideCompleted` prop（由 `ChecklistSection` 動態傳入）
2. 向外 expose `completedCount` 和 `totalCount` 供父元件計數使用

## Requirements

### Requirement: 計數 Callback（新增 prop）

- **WHEN** `CaseTodos` 元件 render 或任務狀態更新
- **THEN** 若提供了 `onCountChange` prop，以 `(completedCount, totalCount)` 呼叫它
- **AND** `completedCount` = 目前已完成任務數（基於 `todos` state）
- **AND** `totalCount` = 欄位中全部任務數（固定值，不隨 `hideCompleted` 而變）

**新 Prop 定義：**

```typescript
onCountChange?: (completed: number, total: number) => void;
```

### Requirement: hideCompleted 動態傳入

- **WHEN** `ChecklistSection` 的 `showCompleted` state 改變
- **THEN** `CaseTodos` 的 `hideCompleted` prop 值即時更新
- **AND** `CaseTodos` 根據新的 `hideCompleted` 值立即重新 render 任務列表

### Requirement: 向下相容性

- **WHEN** `onCountChange` prop 未提供（其他使用方，如 `CaseCompactTodoList`）
- **THEN** 元件行為與現有完全相同，無任何副作用

## Acceptance Criteria

- [ ] `onCountChange` 為 **optional** prop（不影響既有使用方）
- [ ] 計數在任務勾選/取消後即時更新（不需刷新頁面）
- [ ] `totalCount` 始終反映欄位中所有任務數（不受 `hideCompleted` 影響）
- [ ] TypeScript 型別正確（無 `any`，無 type error）
