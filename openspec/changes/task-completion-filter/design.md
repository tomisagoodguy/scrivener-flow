# Design: 任務完成過濾功能

## Context

### 現有架構分析

截圖中的 Kanban 看板（5個欄位：簽約/用印/貸款/完稅/交屋）是 `ChecklistSection.tsx` 的一部分，
透過 `CaseTodos.tsx` 元件渲染每個欄位的子任務。

**關鍵檔案路徑：**

```
src/components/features/cases/edit-case/ChecklistSection.tsx  ← 主要 Kanban 容器
src/components/features/cases/CaseTodos.tsx                  ← 子任務渲染元件
src/hooks/useCaseTodos.ts                                    ← 任務狀態管理 Hook
```

**目前資料流：**

1. `ChecklistSection` → 定義 `SIGNING_ITEMS` / `TRANSFER_ITEMS` 清單
2. 傳入 `CaseTodos` → `prefix` (S_/T_) + `hideCompleted?: boolean`
3. `CaseTodos` 讀取 `useCaseTodos` → 本地 state + Supabase `todos` 欄位
4. 每個任務渲染為 Tag 按鈕，點擊觸發 `toggleTodo`

**現有問題：**

- `CaseTodos` 已有 `hideCompleted` prop，但 `ChecklistSection` 寫死為 `false`
- 沒有 UI 讓使用者自行切換顯示模式
- 沒有完成動畫（點擊後直接變綠色，但仍在原位）

---

## Goals / Non-Goals

**Goals:**

1. 在 `ChecklistSection` 標題列加入「顯示已完成」Toggle
2. Toggle 狀態透過 `localStorage` 持久化（key: `checklist_show_completed`）
3. 勾選任務後執行淡出 + 向上滑動動畫，再根據 Toggle 狀態決定是否隱藏
4. 欄位標題顯示 `完成數/總數` 計數（即時更新）

**Non-Goals:**

- 不修改 Supabase 資料結構
- 不影響 `CaseCompactTodoList`（案件列表 Excel View）
- 不新增 Redux/Zustand（保持現有 React state 方式）
- 不修改 `TodoContainer` 或 `TodoListView`（智慧待辦中心）

---

## Decisions

### 1. Toggle 控制層級：Section 級（非 Column 級）

**選擇**: 在 `ChecklistSection` 最上層放一個 Toggle，控制所有欄位。

**理由**:

- 使用者通常希望「全部清爽」或「全部可見」，分欄控制過於複雜
- 減少 state 個數（1個 boolean vs N 個）

**替代方案**: 每欄獨立 Toggle → 被否決，UI 過於雜亂

### 2. 動畫實作：CSS transition + height: 0

**選擇**: 使用 CSS `max-height` + `opacity` transition，無需額外動畫庫

```css
.leaving {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: max-height 0.3s ease, opacity 0.2s ease;
}
```

**理由**: 不引入新依賴（framer-motion 等），與現有 Tailwind CSS 相容

**替代方案**: framer-motion AnimatePresence → 被否決，引入額外 bundle size

### 3. 持久化：localStorage（非 Context/Cookie）

**選擇**: `localStorage.getItem('checklist_show_completed')`

**理由**: 純前端偏好設定，無需 server-side 狀態，最簡單

### 4. 修改範圍：最小侵入原則

只修改 `ChecklistSection.tsx`，不動 `CaseTodos.tsx` 的核心邏輯。
`CaseTodos` 已支援 `hideCompleted` prop，直接傳值即可。

---

## Risks / Trade-offs

| 風險 | 說明 | 緩解方案 |
|---|---|---|
| 動畫跳動 | 隱藏任務後，其他任務可能 layout jump | 使用 `max-height: 0` 漸進 collapse |
| 欄尾「新增」按鈕計數錯誤 | 隱藏已完成後，`0/N` 計數仍需正確反映 total | 計數基於 `allItems.length`，不依賴 DOM |
| localStorage 初始值閃爍 | SSR 沒有 localStorage | 使用 `useEffect` 讀取，預設值 `false` |
