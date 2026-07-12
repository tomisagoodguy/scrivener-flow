## Why

代書多數時間工作在 `/cases` 案件管理頁面而非首頁儀表板，艾森豪矩陣目前只在首頁可見，導致使用者要切回首頁才能看到自己的四象限分類。矩陣本身已是自行讀寫個人設定（`eisenhower_matrix`）的獨立元件，掛到 `/cases` 頁面即可與首頁天然同步，不需複製任何資料邏輯。

## What Changes

- `/cases` 頁面在「流程監控」（`GlobalPipelineChart`）下方新增「輕重緩急看板」區塊（2026-07-12 由「四象限焦點（買賣方）」更名，語意更貼近艾森豪矩陣「重要／緊急」核心概念且與其他區塊命名調性一致），與首頁 `EisenhowerMatrix` 使用同一元件與同一份 per-user 資料（同一顆 `useEisenhowerMatrix` hook、同一組 Server Action），因此在任一頁面拖曳/勾選/改標題，另一頁面重新整理後會看到相同結果。
- 新增可收合行為：矩陣加上收合/展開按鈕，**預設收起**；使用者展開後才渲染/顯示矩陣內容。
- 首頁維持現有行為（矩陣一律展開顯示，無收合按鈕），僅 `/cases` 頁面套用收合。
- 顯示條件比照「流程監控」現有邏輯：僅在監控檢視（非已結案／備忘錄／時程／未完成統整分頁）且有進行中案件時渲染。

## Capabilities

### Modified Capabilities

- `dashboard-eisenhower-matrix`: 矩陣渲染位置從「僅首頁」擴充為「首頁（一律展開）+ `/cases` 頁面流程監控下方（預設收合、可展開）」，並新增收合狀態的可觀察行為。

## Impact

- Affected specs: `dashboard-eisenhower-matrix`（MODIFIED）
- Affected code:
  - New: (none)
  - Modified:
    - `src/components/dashboard/eisenhower/EisenhowerMatrix.tsx`（新增 `collapsible` / `defaultCollapsed` prop，首頁呼叫端不傳即維持一律展開的既有行為）
    - `src/app/cases/page.tsx`（在 `GlobalPipelineChart` 之後、監控檢視區塊內掛載 `<EisenhowerMatrix collapsible defaultCollapsed />`）
  - Removed: (none)
- Dependencies: 不新增套件，沿用既有 `EisenhowerMatrix` / `useEisenhowerMatrix` / `eisenhowerActions.ts`。
