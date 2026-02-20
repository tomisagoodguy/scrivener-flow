# Specs: 任務完成過濾功能

## NEW CAPABILITIES

---

### Requirement: task-visibility-toggle

ChecklistSection 必須提供一個 Toggle 按鈕，讓使用者在「顯示已完成」和「隱藏已完成」之間切換。

**Scenario: 預設狀態（首次開啟）**

- **WHEN** 使用者首次進入案件詳情頁
- **THEN** `showCompleted` 預設為 `true`（顯示全部），等同於現有行為

**Scenario: 切換為隱藏已完成**

- **WHEN** 使用者點擊 Toggle（目前為「顯示已完成」狀態）
- **THEN** 所有已完成（`todos[item] === true`）的任務按鈕從視圖中隱藏
- **AND** 每個欄位的計數徽章更新為 `未完成數/總數`

**Scenario: 切換回顯示已完成**

- **WHEN** 使用者再次點擊 Toggle（目前為「隱藏已完成」狀態）
- **THEN** 所有已完成任務按鈕重新出現

**Acceptance Criteria:**

- Toggle 位於 ChecklistSection 的標題行右側
- Toggle 有清楚的視覺標示（例如：眼睛圖示 + 文字）
- 切換時動畫不超過 350ms

---

### Requirement: task-completion-animation

當任務從「未完成」切換為「已完成」且當前模式為「隱藏已完成」時，
該任務卡片應執行淡出動畫後消失。

**Scenario: 隱藏模式下勾選任務**

- **WHEN** 使用者處於「隱藏已完成」模式
- **AND** 點擊一個未完成的任務按鈕
- **THEN** 該任務先顯示為已完成狀態（綠色）
- **AND** 延遲 `300ms` 後執行 `opacity: 0 + max-height: 0` 動畫
- **AND** 動畫完成後，該任務從 DOM 中隱藏（`display: none` 或 filter）

**Scenario: 顯示模式下勾選任務**

- **WHEN** 使用者處於「顯示已完成」模式
- **AND** 點擊一個未完成的任務按鈕
- **THEN** 任務變為綠色勾選狀態，但仍然顯示在原位（不消失）
- **AND** 行為與現有邏輯完全一致（無新動畫）

**Acceptance Criteria:**

- 動畫流暢，不影響其他任務按鈕的位置（無 layout jump）
- 動畫 duration: `opacity 200ms, max-height 300ms`

---

### Requirement: display-mode-persistence

使用者的「顯示模式」偏好必須在頁面刷新後保留。

**Scenario: 偏好保存**

- **WHEN** 使用者切換 Toggle
- **THEN** 新狀態立即寫入 `localStorage`，key 為 `checklist_show_completed`，value 為 `"true"` 或 `"false"`

**Scenario: 頁面重新載入**

- **WHEN** 使用者重新進入任何案件詳情頁
- **THEN** 系統從 `localStorage` 讀取 `checklist_show_completed`
- **AND** Toggle 和任務顯示狀態恢復為上次設定

**Scenario: localStorage 不可用（首次 / 清除）**

- **WHEN** `localStorage` 中無對應 key
- **THEN** 預設值為 `true`（顯示全部）

**Acceptance Criteria:**

- 使用 `useEffect` 讀取 localStorage，避免 SSR hydration 不一致
- 寫入 localStorage 在 Toggle 點擊事件同步執行

---

### Requirement: task-count-badge

每個欄位標題右側必須即時顯示 `完成數/總數` 計數。

**Scenario: 任務全部未完成**

- **WHEN** 所有任務均未勾選
- **THEN** 計數顯示 `0/N`（N = 總任務數）

**Scenario: 部分完成**

- **WHEN** M 個任務已完成（共 N 個）
- **THEN** 計數顯示 `M/N`

**Scenario: 勾選任務**

- **WHEN** 使用者完成一個任務
- **THEN** 計數在不刷新頁面的情況下從 `M/N` 更新為 `(M+1)/N`

**Acceptance Criteria:**

- 計數反映 `displayItems` 中的 completed 狀態（基於 `todos` local state）
- 計數位置：欄位標題（h4）右側，小型灰色徽章
- 若 M === N，計數徽章顯示為綠色（全部完成）

## MODIFIED CAPABILITIES

---

### Modified: task-card-render（`CaseTodos.tsx`）

現有任務卡片渲染邏輯需支援「受控 hideCompleted」模式。

**變更前行為:**

- `hideCompleted` prop 由父元件靜態傳入（`ChecklistSection` 寫死 `false`）

**變更後行為:**

- `CaseTodos` 的 `hideCompleted` prop 改由 `ChecklistSection` 動態傳入（與 Toggle state 綁定）
- `CaseTodos` 需對外 expose `completedCount` 和 `totalCount`（透過 props callback 或 context）以供標題計數使用

**Non-Breaking:**

- `hideCompleted` prop 維持原有 API（`boolean`），不影響其他使用方（`CaseCompactTodoList` 等）
