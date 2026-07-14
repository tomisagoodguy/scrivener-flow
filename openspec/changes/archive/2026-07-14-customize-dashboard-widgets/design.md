## Context

`WorkDashboard.tsx` 目前以 JSX 寫死渲染順序：`WelcomeHeader` → `AIWorkAssistant` → (`UrgentAlerts` / `TaxWatch` 並排) → `PipelineView` → `EisenhowerMatrix` → `TodoContainer`。使用者已有 `user_settings` 表（`user_id` 為 PK，RLS 依 `auth.uid() = user_id` 隔離），本次擴充該表而非新建表，沿用既有 RLS policy（新欄位屬同一 row，既有 SELECT/INSERT/UPDATE/DELETE policy 自動涵蓋）。

專案技術堆疊：Next.js 16 App Router、React 19.2.3、Zod 4、Supabase JS。專案尚未安裝任何拖曳排序套件。

## Goals / Non-Goals

**Goals:**
- 使用者可隱藏/顯示任一儀表板區塊，隱藏後仍可透過常駐入口找回。
- 使用者可拖曳調整區塊順序，順序即時持久化。
- 新使用者（尚無 `dashboard_layout` 設定）看到的版面與現行寫死順序完全一致，零感知遷移。
- 沿用 `user_settings` 既有 RLS 隔離，不新增額外安全機制。

**Non-Goals:**
- 不支援跨欄多欄（multi-column grid）任意拖曳（例如把 `UrgentAlerts`/`TaxWatch` 拆開放到不同直欄）；本次僅支援單一垂直順序清單，`UrgentAlerts`/`TaxWatch` 視為一個可拖曳單位（並排區塊組）。
- 不支援團隊/角色共享版面模板（例如「代書預設版」、「投資模組預設版」）。
- 不支援區塊大小（size/span）自訂，僅處理顯示/隱藏與順序。
- 不做 `/cases` 頁面既有里程碑排序的變動（該排序規則獨立鎖定，見專案規則，不在本次範圍）。

## Decisions

### 拖曳排序套件選用 @dnd-kit

比較對象：`@dnd-kit/core` + `@dnd-kit/sortable` vs `react-beautiful-dnd` vs `react-dnd`。

- `react-beautiful-dnd`（Atlassian）已進入維護模式多年，官方不保證 React 18+ 相容，React 19 下已知有 `StrictMode`/並發渲染相關問題 → 排除。
- `react-dnd` 需自行組裝排序邏輯（無內建 sortable list primitive），且底層依賴 HTML5 drag events 在觸控裝置上體驗較差 → 排除。
- `@dnd-kit/core` + `@dnd-kit/sortable`：官方明確支援 React 18/19、無外部相依（不綁 HTML5 DnD API，用 Pointer/Touch sensor）、有現成 `SortableContext`/`useSortable` 處理垂直清單排序，社群持續維護 → 採用。

新增依賴：`@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities`（`package.json`）。

### 資料結構：`user_settings.dashboard_layout` JSONB 陣列

```ts
// src/domain/dashboard/layoutTypes.ts
export const DashboardWidgetIdSchema = z.enum([
  'welcome-header',
  'ai-work-assistant',
  'urgent-alerts-tax-watch', // UrgentAlerts + TaxWatch 並排區塊組，視為一個可拖曳/隱藏單位
  'pipeline-view',
  'eisenhower-matrix',
  'todo-container',
]);

export const DashboardWidgetLayoutItemSchema = z.object({
  id: DashboardWidgetIdSchema,
  visible: z.boolean(),
  order: z.number().int().min(0),
});

export const DashboardLayoutSchema = z.array(DashboardWidgetLayoutItemSchema);
export type DashboardWidgetId = z.infer<typeof DashboardWidgetIdSchema>;
export type DashboardWidgetLayoutItem = z.infer<typeof DashboardWidgetLayoutItemSchema>;
export type DashboardLayout = z.infer<typeof DashboardLayoutSchema>;

export const DEFAULT_DASHBOARD_LAYOUT: DashboardLayout = [
  { id: 'welcome-header', visible: true, order: 0 },
  { id: 'ai-work-assistant', visible: true, order: 1 },
  { id: 'urgent-alerts-tax-watch', visible: true, order: 2 },
  { id: 'pipeline-view', visible: true, order: 3 },
  { id: 'eisenhower-matrix', visible: true, order: 4 },
  { id: 'todo-container', visible: true, order: 5 },
];
```

選用「陣列（每項含 id/visible/order）」而非「兩個獨立陣列（順序陣列 + 隱藏 id 集合）」：單一資料結構同時承載順序與可見性，讀寫時不需保持兩份資料同步，序列化後即為 dnd-kit `SortableContext` 所需的 items 順序來源。

`welcome-header` 目前**不提供**隱藏/拖曳把手（它是頁首問候語，非功能性資訊區塊，隱藏它沒有實質效益）；其餘 5 個單位皆可隱藏與拖曳。`DashboardWidgetIdSchema` 仍將 `welcome-header` 納入清單以保留未來擴充彈性，但 `DashboardWidgetShell` 對它渲染時不掛拖曳把手與 X 按鈕。

### 讀寫路徑：Server Action + 樂觀更新 hook

`src/app/actions/dashboardLayout.ts` 提供 `getDashboardLayout()`（讀取，缺列則回傳 `DEFAULT_DASHBOARD_LAYOUT`）與 `updateDashboardLayout(layout: DashboardLayout)`（UPSERT 整個陣列，Zod 驗證後才寫入）。`src/hooks/useDashboardLayout.ts` 封裝：初次載入呼叫 `getDashboardLayout`、拖曳結束或按 X/復原時先本地樂觀更新 UI，再背景呼叫 `updateDashboardLayout`；失敗時 revert 並顯示 toast 錯誤。

選擇「整份陣列覆寫」而非「單筆 upsert 每個 widget」：陣列本身承載順序，順序變更（拖曳）本質是整份 diff，逐筆更新無法表達「順序」這個跨列關聯欄位，UPSERT 整份 JSONB 最簡單且符合現有 `custom_quick_notes`/`dashboard_notes` 欄位的既有寫入模式（見 `src/app/actions/` 中類似的 jsonb 欄位讀寫慣例）。

### 元件架構：`DashboardWidgetShell` 包裹既有區塊

`WorkDashboard.tsx` 改為一個 `WIDGET_REGISTRY: Record<DashboardWidgetId, ReactNode>` 對照表（id → 對應既有元件的 JSX），依 `useDashboardLayout` 回傳、依 `order` 排序且 `visible === true` 的清單，逐一用 `DashboardWidgetShell` 包裹後渲染在 `SortableContext` 內。`DashboardWidgetShell` 負責：拖曳把手圖示、右上角 X 按鈕（呼叫時把該 widget 的 `visible` 設為 `false`）、`useSortable` 的 transform/transition 套用。既有各區塊元件（`TaxWatch`、`PipelineView` 等）內部邏輯完全不變，只是被包了一層外殼。

### 隱藏區塊復原入口：`HiddenWidgetsMenu`

固定定位（`fixed bottom-6 right-6` 或頁面既有的浮動按鈕慣例區）的圓形按鈕，僅在 `layout.some(w => !w.visible)` 為真時渲染；點擊展開清單，列出所有 `visible === false` 的 widget（顯示名稱，如「稅務追蹤」），點擊清單項目即呼叫 `useDashboardLayout` 的 `showWidget(id)` 把該項 `visible` 設回 `true` 並插回清單尾端（`order` 設為目前最大值 + 1）。

## Implementation Contract

**Behavior**：
- 首頁載入時，若使用者尚無 `dashboard_layout` 設定，畫面呈現與現行寫死順序完全相同（`DEFAULT_DASHBOARD_LAYOUT`）。
- 使用者點擊任一非 `welcome-header` 區塊右上角的 X 按鈕，該區塊立即從版面消失，且畫面右下角出現/更新一顆浮動按鈕（若之前不存在則新出現）。
- 使用者點擊該浮動按鈕，展開清單顯示所有目前隱藏的區塊名稱；點擊清單中一項，該區塊重新出現在版面最下方，且該清單項從選單移除；若移除後清單已無項目，浮動按鈕消失。
- 使用者拖曳任一區塊的拖曳把手到新位置放開，版面順序立即依放開位置更新。
- 重新整理頁面、換裝置或換瀏覽器登入同一帳號，顯示/隱藏與順序狀態與上次操作結果一致（由資料庫讀回）。

**Interface / data shape**：
- `DashboardLayoutSchema`：`z.array({ id: DashboardWidgetIdSchema, visible: boolean, order: number })`（見 Decisions 章節，定義於 `src/domain/dashboard/layoutTypes.ts`）。
- `getDashboardLayout(): Promise<DashboardLayout>`、`updateDashboardLayout(layout: DashboardLayout): Promise<{ success: boolean; error?: string }>`（`src/app/actions/dashboardLayout.ts`，皆為 Server Action，內部用 `createClient()`（Server client，走 RLS）操作 `user_settings.dashboard_layout`）。
- `useDashboardLayout()` 回傳 `{ layout: DashboardLayout; isLoading: boolean; hideWidget: (id) => void; showWidget: (id) => void; reorderWidgets: (newOrder: DashboardWidgetId[]) => void }`。

**Failure modes**：
- `updateDashboardLayout` 寫入失敗（網路/RLS 拒絕）：`useDashboardLayout` 樂觀更新回滾至上一個已知合法狀態，並透過既有 toast 機制（專案既有 error toast 慣例）顯示「儲存版面設定失敗，請重試」，不得靜默吞掉錯誤。
- 讀取到的 `dashboard_layout` JSON 不符合 `DashboardLayoutSchema`（例如手動改壞資料、欄位缺漏）：Server Action 端 Zod `safeParse` 失敗時回退為 `DEFAULT_DASHBOARD_LAYOUT`，不拋錯造成頁面白屏。
- `dashboard_layout` 陣列缺少目前程式碼認得的某個 widget id（例如未來新增區塊但既有使用者資料庫版本尚未包含）：讀取後與 `DEFAULT_DASHBOARD_LAYOUT` 做 union merge，缺項補上（`visible: true`, `order` 接在現有最大值之後），避免新區塊「憑空消失」。

**Acceptance criteria**：
- 單元測試：`DashboardLayoutSchema` 對合法/不合法輸入的 parse 行為；`useDashboardLayout` 的 `hideWidget`/`showWidget`/`reorderWidgets` 狀態轉換（含樂觀更新與失敗回滾）。
- 手動驗證：`yarn dev` 起本地伺服器，登入後對首頁執行「隱藏一個區塊 → 出現浮動按鈕 → 重新整理頁面 → 狀態保留 → 從浮動按鈕復原 → 拖曳兩個區塊互換順序 → 重新整理 → 順序保留」全流程。
- `yarn tsc --noEmit` 與 `yarn test` 綠燈。

**Scope boundaries**：
- In scope：`WorkDashboard.tsx` 對應的首頁 7 個區塊（其中 `welcome-header` 僅列入 registry、不提供隱藏/拖曳）之顯示/隱藏/排序、`user_settings` 新欄位、Server Action、對應 hook 與 UI 元件。
- Out of scope：投資模組（`/investment/*`）儀表板、`/cases` 頁面版面、任何其他頁面的區塊化；`/cases` 里程碑預設排序依專案規則禁止改動，本次完全不觸碰。

## Risks / Trade-offs

- [Risk] 使用者現有 session 快取的舊版 `WorkDashboard.tsx` 渲染邏輯與新版部署後資料庫尚無設定值的過渡狀態不一致 → Mitigation：`DEFAULT_DASHBOARD_LAYOUT` 與現行寫死順序保持逐項一致，讀取失敗/無資料一律回退預設值，確保部署當下不影響任何使用者體感。
- [Risk] JSONB 陣列缺乏 DB 層 schema 驗證，未來若有 migration 手動改壞資料可能導致解析失敗 → Mitigation：Server Action 端一律 Zod `safeParse`，失敗回退預設值（見 Failure modes）。
- [Risk] 拖曳排序在觸控裝置（平板）上手感與滑鼠不同，@dnd-kit 需正確設定 `PointerSensor`/`TouchSensor` 才能兩者皆順暢 → Mitigation：`DashboardWidgetShell` 使用 `@dnd-kit/core` 的 `useSensors([PointerSensor, TouchSensor])`，手動驗證涵蓋桌面與行動裝置寬度（`playwright-skill` 或瀏覽器 DevTools 裝置模擬）。
- [Trade-off] 「並排區塊組」（`UrgentAlerts`/`TaxWatch`）視為單一可拖曳單位而非各自獨立，簡化本次資料結構與拖曳邏輯，但犧牲使用者把兩者拆開排序的彈性（已列入 Non-Goals，未來如有需求可再開新變更處理）。

