# Tasks: 任務完成過濾功能

## 1. ChecklistSection Toggle 與狀態管理

- [x] 1.1 在 `ChecklistSection.tsx` 新增 `showCompleted` state（預設 `true`），並在 `useEffect` 中從 `localStorage` 讀取初始值（key: `checklist_show_completed`）
- [x] 1.2 在 `ChecklistSection` 標題行加入 Toggle 按鈕（使用 `Eye` / `EyeOff` 圖示），點擊時切換 `showCompleted` 並同步寫入 `localStorage`
- [x] 1.3 將 `showCompleted` 以 `hideCompleted={!showCompleted}` 形式傳給兩個 `CaseTodos` 元件

## 2. 任務計數徽章

- [x] 2.1 在 `CaseTodos.tsx` 新增 `onCountChange?: (completed: number, total: number) => void` callback prop
- [x] 2.2 在 `CaseTodos.tsx` 的 render 邏輯中計算 `completedCount` 和 `totalCount`，並在數值變化時呼叫 `onCountChange`
- [x] 2.3 在 `ChecklistSection.tsx` 維護兩個 state（`signingCount`, `transferCount`），接收 callback 後更新，並在各欄位 `<h4>` 右側渲染計數徽章（`M/N`；若 M===N 改用綠色）

## 3. 完成動畫

- [x] 3.1 在 `CaseTodos.tsx` 新增 `leavingItems: Set<string>` state，當 `hideCompleted` 為 `true` 且任務被標記完成時，延遲 `150ms` 後將該 item key 加入 `leavingItems`
- [x] 3.2 為正在離開的 item 套用 inline style（`opacity: 0, maxHeight: 0`），動畫結束後由 `hideCompleted` 的 filter 邏輯自然隱藏

## 4. 驗收測試

- [ ] 4.1 手動驗證：「隱藏已完成」模式下勾選任務，確認動畫流暢且無 layout jump
- [ ] 4.2 手動驗證：刷新頁面後 Toggle 狀態正確保留
- [ ] 4.3 手動驗證：計數徽章在勾選/取消勾選時即時更新
- [ ] 4.4 手動驗證：「顯示已完成」模式下行為與現有邏輯完全一致（無 regression）
