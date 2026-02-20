# Spec: task-completion-filter

## Overview

案件辦事清單（ChecklistSection）的任務完成過濾功能。
允許使用者在「顯示全部任務」和「隱藏已完成任務」之間切換，
並提供完成動畫與計數徽章。

## Requirements

### task-visibility-toggle

ChecklistSection 提供一個持久化的 Toggle，控制所有任務欄位是否顯示已完成項目。

### task-completion-animation

在「隱藏已完成」模式下，勾選任務後執行 `opacity + max-height` 淡出動畫（300ms）。

### display-mode-persistence

使用者的顯示模式偏好透過 `localStorage`（key: `checklist_show_completed`）跨頁面保留。

### task-count-badge

每個任務欄位（簽約與用印階段、過戶與交屋階段）的標題顯示即時 `完成數/總數` 計數徽章。

## Affected Files

- `src/components/features/cases/edit-case/ChecklistSection.tsx`
- `src/components/features/cases/CaseTodos.tsx`
