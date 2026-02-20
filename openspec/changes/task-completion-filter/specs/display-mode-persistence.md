# Spec: display-mode-persistence

## Summary

使用者的「顯示/隱藏已完成」偏好設定透過 `localStorage` 在頁面刷新後保留。

## Requirements

### Requirement: 偏好寫入

- **WHEN** 使用者點擊 Toggle 切換顯示模式
- **THEN** 新狀態立即同步寫入 `localStorage`
- **AND** key: `checklist_show_completed`，value: `"true"` 或 `"false"`（字串）

### Requirement: 偏好讀取

- **WHEN** 元件 mount（`useEffect`）
- **THEN** 從 `localStorage` 讀取 `checklist_show_completed`
- **AND** 若值為 `"false"` → `showCompleted` 初始化為 `false`
- **AND** 若值為 `"true"` 或 key 不存在 → `showCompleted` 初始化為 `true`

### Requirement: 避免 SSR Hydration 問題

- **WHEN** 頁面首次在 Server 端渲染
- **THEN** `showCompleted` 初始 state 值固定為 `true`（不在 useState 直接讀 localStorage）
- **AND** 實際偏好值在 client-side `useEffect` 後才套用

## Acceptance Criteria

- [ ] `localStorage` key 為精確的 `checklist_show_completed`（無拼字錯誤）
- [ ] 刷新頁面後 Toggle 狀態正確還原
- [ ] 跨不同案件頁面（`/cases/[id]`）偏好一致
- [ ] 無 React hydration warning（不在 render phase 直接讀 localStorage）
