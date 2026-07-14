## Why

首頁儀表板（`src/components/dashboard/WorkDashboard.tsx`）目前 7 個區塊（WelcomeHeader、AIWorkAssistant、UrgentAlerts、TaxWatch、PipelineView、EisenhowerMatrix、TodoContainer）的顯示順序與是否顯示完全寫死在 JSX，所有使用者被迫看到相同版面。團隊成員反映每個人工作習慣不同（有人不需要 AI 助理區塊、有人希望稅務區塊排最前面），應該讓使用者自行決定要看哪些區塊、以什麼順序看。

## What Changes

- 每個儀表板區塊新增可隱藏能力：區塊右上角提供「X」按鈕，點擊後該區塊從版面消失。
- 新增「隱藏區塊」常駐入口按鈕：只要有任一區塊被隱藏，畫面上固定位置就會出現一顆按鈕，點擊後彈出清單，列出所有已隱藏的區塊，使用者可個別選擇重新顯示。
- 每個區塊新增可拖曳排序能力：使用者可透過拖曳把手調整區塊在頁面上的垂直順序。
- 使用者的顯示/隱藏狀態與排序狀態即時持久化到資料庫，跨裝置、跨瀏覽器 session 皆維持一致。
- `WorkDashboard.tsx` 從「寫死渲染順序的 JSX」改為「依使用者設定動態渲染區塊清單」的架構，區塊本身元件（如 `TaxWatch`、`PipelineView` 等）的內部邏輯不變。
- 新增使用者尚未設定過版面時的預設值：等同現行寫死的順序與全部顯示，確保既有使用者無感覺切換。

## Capabilities

### New Capabilities

- `dashboard-widget-layout`: 使用者可自訂儀表板區塊的顯示/隱藏狀態與排序，設定持久化並跨裝置生效，含隱藏區塊的復原入口。

### Modified Capabilities

(none)

## Impact

- Affected specs: `dashboard-widget-layout`（新增）
- Affected code:
  - New:
    - `src/domain/dashboard/layoutTypes.ts`（Zod schema + TypeScript 型別：widget id、visible、order）
    - `src/components/dashboard/DashboardWidgetShell.tsx`（可拖曳、可隱藏的區塊外殼元件，包住現有各區塊）
    - `src/components/dashboard/HiddenWidgetsMenu.tsx`（常駐入口按鈕 + 已隱藏區塊清單彈出選單）
    - `src/hooks/useDashboardLayout.ts`（讀取/更新使用者版面設定的 hook，含樂觀更新）
    - `src/app/actions/dashboardLayout.ts`（Server Action：讀取與寫入 `user_settings.dashboard_layout`）
    - `supabase/migrations/<timestamp>_add_dashboard_layout.sql`（`user_settings` 新增 `dashboard_layout jsonb` 欄位）
  - Modified:
    - `src/components/dashboard/WorkDashboard.tsx`（改為依 `useDashboardLayout` 回傳的清單動態渲染區塊，套用 `DashboardWidgetShell`）
    - `package.json`（新增 `@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities` 依賴）
  - Removed: (none)
