# Spec: task-completion-animation

## Summary

在「隱藏已完成」模式下，勾選任務後執行淡出 + 收縮動畫再隱藏。

## Requirements

### Requirement: 動畫觸發條件

- **WHEN** `hideCompleted` 為 `true`（使用者處於「隱藏已完成」模式）
- **AND** 使用者點擊一個未完成任務的 Toggle
- **THEN** 任務先切換為完成狀態（綠色勾選）
- **AND** 延遲 `300ms` 後套用離場動畫 class

### Requirement: 動畫效果

- **WHEN** 離場動畫觸發
- **THEN** 任務元素執行 `opacity: 1 → 0`（200ms）+ `max-height: 收縮 → 0`（300ms）
- **AND** 動畫期間，下方其他任務平滑上移（無瞬間 jump）
- **AND** 動畫完成後，任務由 `displayItems` filter 邏輯自然排除（不再 render）

### Requirement: 正常模式無動畫

- **WHEN** `hideCompleted` 為 `false`（使用者處於「顯示已完成」模式）
- **AND** 使用者點擊任務 Toggle
- **THEN** 任務僅改變視覺樣式（綠色），維持原位，無消失動畫
- **AND** 行為與現有實作完全一致

## Acceptance Criteria

- [ ] 動畫只在 `hideCompleted = true` 模式下觸發
- [ ] `opacity` transition: 200ms ease-out
- [ ] `max-height` transition: 300ms ease-in-out
- [ ] 無 layout jump（其他任務不跳動）
- [ ] 動畫完成後元素不佔用 DOM 空間
