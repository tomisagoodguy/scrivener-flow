## Context

`/cases`（`src/app/cases/page.tsx`）是 Server Component，負責查詢案件、排序（印→稅→過→交里程碑優先序）、依 `status` URL 參數切換 Memo/Timeline/Pending/Monitoring 四種分頁內容。目前匯出按鈕、快速輸入列（`CasesRapidInput`）、快速導航（`CaseQuickNavigator`）、以及 Monitoring 分頁下的案件進度總覽圖表（`GlobalPipelineChart`）與輕重緩急看板（`EisenhowerMatrix`）都直接寫死在 JSX 裡，順序固定、無法隱藏。

首頁儀表板已實作同類需求（`openspec/specs/dashboard-widget-layout/spec.md`，程式碼在 `src/components/dashboard/WorkDashboard.tsx`、`DashboardWidgetShell.tsx`、`HiddenWidgetsMenu.tsx`、`src/hooks/useDashboardLayout.ts`、`src/app/actions/dashboardLayout.ts`），本次設計直接複用同一套架構與元件模式，只是套用到 `/cases` 頁面、換一組獨立的 widget id 與獨立的 DB 欄位。

## Goals / Non-Goals

**Goals:**

- `/cases` 頁面的 5 個功能板塊（`export-buttons`、`rapid-input`、`quick-navigator`、`pipeline-chart`、`eisenhower-matrix`）可由使用者個別隱藏、拖曳排序，設定持久化到 Supabase，跨裝置生效。
- 未設定過版面的使用者看到與現行寫死順序完全一致的預設版面（無感切換）。
- 複用首頁儀表板已驗證的技術棧（`@dnd-kit`、Server Action + `user_settings` JSONB 欄位、樂觀更新 hook），不重新發明機制。

**Non-Goals:**

- 案件列表 table 本身不在自訂範圍內，維持固定顯示、固定的里程碑排序邏輯（`.claude/rules/components.md` 明文保護，禁止改動）。
- Memo / Timeline / Pending 三個分頁內容不納入本次板塊自訂：它們由 `status` URL 參數控制、同一時間僅顯示一個，是分頁目的地而非可並存排列的板塊，不適用「同時顯示多個可拖曳板塊」的模型。
- 不合併 `dashboard_layout` 與 `cases_layout` 成單一共用欄位或共用 widget id 空間；兩者是獨立頁面的獨立設定，維持獨立 DB 欄位與獨立 Zod schema，避免任一頁面新增板塊時互相汙染對方的 widget id enum。
- 不改變 Monitoring 分頁本身的「是否顯示」條件（`statusParam !== 'Closed' && statusParam !== 'Memo' && statusParam !== 'Timeline' && statusParam !== 'Pending' && monitoringCases.length > 0`）；板塊自訂只作用於「Monitoring 分頁已經決定要顯示」之後的板塊排列，不控制分頁本身的顯示邏輯。

## Decisions

### 複用 dashboard-widget-layout 的元件與 hook 模式，而非抽成共用泛型元件

`DashboardWidgetShell`、`HiddenWidgetsMenu` 的 UI 邏輯與 `/cases` 需求完全相同（拖曳把手 + X 按鈕 + 隱藏清單），但目前這兩個元件的 props 型別（`DashboardWidgetId`）與 import 路徑（`@/domain/dashboard/layoutTypes`）綁死在首頁儀表板的型別上。

**選項 A（採用）**：`/cases` 新增獨立的 `CasesWidgetShell`、`CasesHiddenWidgetsMenu`（或將既有兩元件的 `id` 型別泛型化為 `<T extends string>` 並在兩處共用同一元件）。
**選項 B（否決）**：直接把 `DashboardWidgetId` 型別擴充成聯集（含 cases 的 5 個 id），與 `dashboard_layout` 共用同一個 Zod schema 與 DB 欄位。

否決選項 B 的原因：`DashboardWidgetId` 若擴充成兩頁面 widget id 的聯集，`DEFAULT_DASHBOARD_LAYOUT` 與 `DEFAULT_CASES_LAYOUT` 的 default 值、`mergeMissingWidgets` 的新 widget 判斷邏輯都會互相干擾（首頁新增一個 widget 會被 `/cases` 的 `mergeMissingWidgets` 誤判為「缺席的 widget」而補進 `/cases` 版面，反之亦然）。維持独立 domain 型別、獨立 DB 欄位是較乾淨的邊界。

`DashboardWidgetShell`/`HiddenWidgetsMenu` 兩元件改為泛型化（`<T extends string>` 取代寫死的 `DashboardWidgetId`），首頁與 `/cases` 共用同一份元件實作，只是各自傳入自己的 widget id 型別與 labels 對照表；避免複製貼上兩份幾乎相同的 UI 元件。

### `CasesWidgetLayout` 作為 Server→Client 邊界的單一入口

`page.tsx` 維持 Server Component（資料查詢、排序、`searchParams` 解析不變）。新增 `src/components/features/cases/CasesWidgetLayout.tsx`（Client Component），接收 `page.tsx` 已經查好、排序好的 `rawCases`/`monitoringCases`/`cases`（及 `statusParam`/`viewParam`/`stageParam` 等已解析的原始值）作為 props，內部用 `useCasesLayout()` 讀版面設定、`DndContext`/`SortableContext` + widget registry 動態渲染 5 個板塊。

Memo/Timeline/Pending 分頁內容與案件列表 table 的條件渲染邏輯**維持留在 `page.tsx`**，不搬進 `CasesWidgetLayout`（它們不屬於本次自訂範圍，搬移只會增加不必要的 props 傳遞面）。`CasesWidgetLayout` 只包住 5 個板塊，插入在 `page.tsx` 原本這些 JSX 所在的位置。

### widget registry 依「目前分頁是否適用」動態決定可見清單

`pipeline-chart`、`eisenhower-matrix` 只在 Monitoring 分頁（非 Memo/Timeline/Pending/Closed）且 `monitoringCases.length > 0` 時才有內容可渲染；其餘分頁下這兩個 id 即使使用者設定為 `visible: true`，registry 中找不到對應內容則不渲染該 shell（比照 `WorkDashboard.tsx` 用 `WIDGET_REGISTRY[w.id]` 是否存在過濾 `visibleWidgetIds`/`hiddenWidgetIds` 的既有模式），不視為錯誤，也不出現在「隱藏板塊」清單中（因為它本來就不 applicable，不是使用者主動隱藏的）。

`export-buttons`、`rapid-input`、`quick-navigator` 在所有分頁皆適用，不受此限制。

## Implementation Contract

- **資料結構**：`src/domain/cases/layoutTypes.ts` 匯出 `CasesWidgetIdSchema = z.enum(['export-buttons', 'rapid-input', 'quick-navigator', 'pipeline-chart', 'eisenhower-matrix'])`、`CasesLayoutSchema = z.array(z.object({ id: CasesWidgetIdSchema, visible: z.boolean(), order: z.number().int().min(0) }))`、`DEFAULT_CASES_LAYOUT`（對應現行寫死順序：`export-buttons` 0、`rapid-input` 1、`quick-navigator` 2、`pipeline-chart` 3、`eisenhower-matrix` 4，皆 `visible: true`）。
- **持久化**：`src/app/actions/casesLayout.ts` 匯出 `getCasesLayout(): Promise<CasesLayout>`（未登入或格式不符回退 `DEFAULT_CASES_LAYOUT`，比照 `getDashboardLayout()` 的 `mergeMissingWidgets` 邏輯處理新上線 widget）與 `updateCasesLayout(layout): Promise<{ success: boolean; error?: string }>`（Zod 驗證失敗不寫入），皆讀寫 `user_settings.cases_layout`（新欄位，`user_id` 唯一鍵 upsert，沿用既有 4 條 RLS policy，不新增/修改 policy）。
- **Hook**：`src/hooks/useCasesLayout.ts` 回傳 `{ layout, isLoading, hideWidget, showWidget, reorderWidgets }`，語意與 `useDashboardLayout` 一致（樂觀更新、失敗回滾、`showWidget` 插入 order 最大值+1、`reorderWidgets` 對可見清單重新指派 order 0..n-1）。
- **UI 元件**：`DashboardWidgetShell`、`HiddenWidgetsMenu` 泛型化為接受 `id: T`（`T extends string`），`/cases` 與首頁分別傳入各自的 widget id 型別、`onHide`/`onShow` callback 與 labels 對照表；兩處呼叫端各自的 `WIDGET_REGISTRY: Partial<Record<T, ReactNode>>` 各自定義。
- **驗收條件**：
  1. 未設定過版面的帳號造訪 `/cases`，5 個板塊顯示順序與現行版面（`export-buttons → rapid-input → quick-navigator → pipeline-chart → eisenhower-matrix`）逐項一致。
  2. 點擊任一板塊的 X 按鈕，該板塊自版面消失，且畫面固定位置出現「隱藏板塊」按鈕；點擊該按鈕可看到清單並選擇復原。
  3. 拖曳任兩個板塊互換順序後重新整理頁面，順序保留。
  4. 案件列表 table 在任何板塊隱藏/排序狀態下皆固定顯示於原位置，不受影響。
  5. 切換到 Memo/Timeline/Pending 分頁時，`pipeline-chart`/`eisenhower-matrix` 不渲染（因該分頁本來就不顯示 Monitoring 內容），且不會被誤判為「使用者隱藏」而出現在隱藏板塊清單。
  6. `yarn tsc --noEmit` 無錯誤；`DashboardWidgetShell`/`HiddenWidgetsMenu` 泛型化後，首頁儀表板既有測試（`DashboardWidgetShell.test.tsx`、`HiddenWidgetsMenu.test.tsx`）維持全綠，不因泛型化而破壞既有行為。

## Risks / Trade-offs

- [Risk] 泛型化 `DashboardWidgetShell`/`HiddenWidgetsMenu` 有可能在重構過程中意外改變首頁儀表板既有行為 → Mitigation：泛型化前先確保首頁既有測試全綠，泛型化後立即重跑同一批測試，行為不變才算完成；純型別參數化，不改動任何渲染邏輯或 CSS。
- [Risk] `CasesWidgetLayout` 作為新的 Server→Client 邊界，若 props 傳遞的案件資料量大（`rawCases`/`monitoringCases` 完整物件），可能增加 Client bundle 的 hydration payload → Mitigation：只傳遞板塊實際需要的欄位（比照現行 `CasesRapidInput` 已經只挑選 `id/case_number/buyer_name/seller_name` 四欄的做法），不整包傳遞完整 `DemoCase[]`。
- [Risk] 新增 `cases_layout` 欄位與既有 `dashboard_layout` 欄位並存於同一張 `user_settings` 表，未來若頁面數增加會持續堆疊欄位 → Mitigation：本次不處理，屬於已知的可接受技術債，非本次變更範圍；若未來第三個頁面出現同類需求，屆時再評估是否重構成獨立 `page_layouts` 表。

## Migration Plan

1. 新增 `supabase/migrations/<timestamp>_add_cases_layout.sql`：`ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS cases_layout JSONB;`（非破壞性，沿用既有 RLS policy，套用前需先問使用者確認，比照 `dashboard-widget-layout` change 的既有慣例）。
2. 部署後對既有使用者無感：`cases_layout` 為 NULL 時 `getCasesLayout()` 回退 `DEFAULT_CASES_LAYOUT`，畫面與部署前完全一致。
3. Rollback：若需回退，移除呼叫端改回原本寫死 JSX 即可；`cases_layout` 欄位本身不需要 DROP COLUMN（保留欄位對現行程式碼無副作用，避免額外的破壞性 migration）。

## Open Questions

(none)
