## Why

`/cases` 頁面（`src/app/cases/page.tsx`）目前的功能板塊（匯出按鈕、快速輸入列、快速導航、案件進度總覽圖表、輕重緩急看板）順序與是否顯示完全寫死，所有使用者被迫看到相同版面。首頁儀表板已完成同類需求（`dashboard-widget-layout`，`openspec/specs/dashboard-widget-layout/spec.md`），代書希望 `/cases` 頁面也能依個人工作習慣自訂要看哪些板塊、以什麼順序看，不需要的板塊可先隱藏、需要時隨時復原。

## What Changes

- 為 `/cases` 頁面新增可自訂的功能板塊清單：匯出按鈕群組（`export-buttons`）、快速輸入列（`rapid-input`）、快速導航（`quick-navigator`）、案件進度總覽圖表（`pipeline-chart`）、輕重緩急看板（`eisenhower-matrix`）。
- 每個板塊比照首頁儀表板模式，提供隱藏（右上角 X 按鈕）與拖曳排序（拖曳把手）能力。
- 新增「隱藏板塊」常駐入口按鈕：只要有任一板塊被隱藏，畫面固定位置出現按鈕，點擊後列出所有已隱藏板塊，可個別選擇重新顯示。
- 使用者的顯示/隱藏與排序狀態即時持久化到資料庫，跨裝置、跨瀏覽器 session 皆維持一致，複用 `user_settings` 表（新增 `cases_layout` 欄位，與現有 `dashboard_layout` 欄位並存、互不影響）。
- **案件列表 table 本身固定顯示、不可隱藏、不可排序**（核心功能，維持既有的印→稅→過→交里程碑排序邏輯，見 `.claude/rules/components.md` 的「案件列表排序」保護條款，本次不變動）。
- **Memo / Timeline / Pending 三個分頁內容不納入本次板塊自訂範圍**：它們是透過 `status` URL 參數切換的互斥分頁目的地（同一時間只顯示一個），不是可同時並存、可自由排列顯示/隱藏的板塊，語意上與「板塊」不同。
- `src/app/cases/page.tsx`（Server Component）新增一個 Client Component 包裹層（`CasesWidgetLayout`），負責讀取使用者的板塊版面設定並動態渲染上述 5 個板塊；`page.tsx` 本身的資料查詢、排序、Server 端邏輯不變，只把目前直接寫在 JSX 裡的板塊渲染委派給這個新元件。
- 新增使用者尚未設定過版面時的預設值：等同現行寫死的順序與全部顯示，確保既有使用者無感切換。

## Capabilities

### New Capabilities

- `cases-widget-layout`: 使用者可自訂 `/cases` 頁面功能板塊（匯出按鈕、快速輸入列、快速導航、案件進度總覽圖表、輕重緩急看板）的顯示/隱藏狀態與排序，設定持久化並跨裝置生效，含隱藏板塊的復原入口；案件列表 table 固定不受此設定影響。

### Modified Capabilities

(none)

## Impact

- Affected specs: `cases-widget-layout`（新增）
- Affected code:
  - New:
    - `src/domain/cases/layoutTypes.ts`（Zod schema + TypeScript 型別：widget id、visible、order，比照 `src/domain/dashboard/layoutTypes.ts` 結構但獨立的 `DashboardWidgetId` 集合改為 5 個 cases 板塊 id）
    - `src/components/features/cases/CasesWidgetLayout.tsx`（Client Component：`DndContext`/`SortableContext` + widget registry，比照 `src/components/dashboard/WorkDashboard.tsx` 的動態渲染模式，接收 `page.tsx` 已查好的資料作為 props）
    - `src/hooks/useCasesLayout.ts`（讀取/更新使用者 `/cases` 板塊版面設定的 hook，含樂觀更新，比照 `src/hooks/useDashboardLayout.ts`）
    - `src/app/actions/casesLayout.ts`（Server Action：讀取與寫入 `user_settings.cases_layout`，比照 `src/app/actions/dashboardLayout.ts`）
    - `supabase/migrations/<timestamp>_add_cases_layout.sql`（`user_settings` 新增 `cases_layout jsonb` 欄位，沿用既有 4 條 RLS policy）
  - Modified:
    - `src/app/cases/page.tsx`（把匯出按鈕、`CasesRapidInput`、`CaseQuickNavigator`、`GlobalPipelineChart`、`EisenhowerMatrix` 五處目前直接寫死的 JSX 區塊，改為透過 `CasesWidgetLayout` 動態渲染；Memo/Timeline/Pending 分頁的條件渲染邏輯與案件列表 table 渲染邏輯維持原樣、不搬移）
  - Removed: (none)
