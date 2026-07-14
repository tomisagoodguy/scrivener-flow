## 1. 資料層：Schema 與 Migration

- [x] 1.1 [P] 撰寫 `src/domain/dashboard/layoutTypes.ts` 的單元測試（`__tests__/layoutTypes.test.ts`）：涵蓋 `DashboardLayoutSchema` 對合法陣列、缺欄位、型別錯誤（如 `order` 為字串）、空陣列的 parse 結果，驗證目標：`yarn test --testPathPatterns layoutTypes` 全綠。
- [x] 1.2 實作 `src/domain/dashboard/layoutTypes.ts`：定義 `DashboardWidgetIdSchema`、`DashboardWidgetLayoutItemSchema`、`DashboardLayoutSchema`、`DEFAULT_DASHBOARD_LAYOUT`（對應資料結構：`user_settings.dashboard_layout` JSONB 陣列設計），使 1.1 測試通過為驗證目標。
- [x] 1.3 新增 `supabase/migrations/<timestamp>_add_dashboard_layout.sql`：對 `user_settings` 表新增 `dashboard_layout JSONB` 欄位（無 DEFAULT，允許 NULL 代表未設定），沿用既有 RLS policy；驗證目標：`supabase db reset`（或專案既有 migration 驗證流程）套用後 `information_schema.columns` 可查到該欄位，且既有 4 條 RLS policy 未被修改。

## 2. Server Action：讀寫版面設定

- [x] 2.1 [P] 撰寫 `src/app/actions/dashboardLayout.ts` 的單元測試：涵蓋設計文件「讀寫路徑：Server Action + 樂觀更新 hook」所述之 `getDashboardLayout()`（無資料回傳 `DEFAULT_DASHBOARD_LAYOUT`、schema 驗證失敗回傳預設值、缺少新 widget id 時做 union merge 對應「New Widget Migration for Existing Layouts」需求）與 `updateDashboardLayout()`（合法輸入寫入成功、非法輸入被 Zod 擋下不寫入）行為，驗證目標：`yarn test --testPathPatterns dashboardLayout` 全綠。
- [x] 2.2 實作 `src/app/actions/dashboardLayout.ts`：`getDashboardLayout()` 讀取 `user_settings.dashboard_layout`（對應「Default Layout for Unconfigured Users」與「New Widget Migration for Existing Layouts」需求）、`updateDashboardLayout(layout)` 驗證後 UPSERT 整份陣列（對應「Layout Persistence Across Sessions」需求），皆使用 Server 端 Supabase client 走 RLS；驗證目標：2.1 測試通過。

## 3. Hook：樂觀更新狀態管理

- [x] 3.1 [P] 撰寫 `src/hooks/useDashboardLayout.ts` 的單元測試：涵蓋 `hideWidget`（對應「Widget Visibility Toggle」需求）、`showWidget`（對應「Hidden Widgets Restore Entry Point」需求，含插入到 order 最大值 + 1）、`reorderWidgets`（對應「Widget Reordering via Drag and Drop」需求）的樂觀狀態轉換，以及 `updateDashboardLayout` 呼叫失敗時回滾至上一狀態並回傳錯誤旗標（對應「Persistence failure does not corrupt displayed state」情境），驗證目標：`yarn test --testPathPatterns useDashboardLayout` 全綠。
- [x] 3.2 實作 `src/hooks/useDashboardLayout.ts`：整合 2.2 的 Server Action，提供讀寫路徑 + 樂觀更新 hook 所述之 `{ layout, isLoading, hideWidget, showWidget, reorderWidgets }` 介面；驗證目標：3.1 測試通過。

## 4. UI 元件：區塊外殼與隱藏清單

- [x] 4.1 [P] 撰寫 `src/components/dashboard/DashboardWidgetShell.tsx` 的元件測試：驗證非 `welcome-header` 區塊渲染拖曳把手與 X 按鈕（對應設計文件「元件架構：`DashboardWidgetShell` 包裹既有區塊」、「Widget Visibility Toggle」與「welcome-header has no dismiss control」情境），`welcome-header` 不渲染任一控制項，X 按鈕點擊觸發 `hideWidget` 回呼；驗證目標：`yarn test --testPathPatterns DashboardWidgetShell` 全綠。
- [x] 4.2 實作 `src/components/dashboard/DashboardWidgetShell.tsx`：使用 `@dnd-kit/sortable` 的 `useSortable`（對應拖曳排序套件選用 @dnd-kit 決策）套用 transform/transition，包裹 children 並渲染拖曳把手與條件式 X 按鈕；驗證目標：4.1 測試通過。
- [x] 4.3 [P] 撰寫 `src/components/dashboard/HiddenWidgetsMenu.tsx` 的元件測試：驗證清單為空時不渲染按鈕（對應「Entry point disappears when no widgets are hidden」情境）、有隱藏項目時渲染按鈕與清單（對應「Entry point appears after hiding a widget」情境）、點擊清單項目觸發 `showWidget` 回呼且該項自清單移除（對應「User restores a hidden widget」情境）；驗證目標：`yarn test --testPathPatterns HiddenWidgetsMenu` 全綠。
- [x] 4.4 實作 `src/components/dashboard/HiddenWidgetsMenu.tsx`：對應設計文件「隱藏區塊復原入口：`HiddenWidgetsMenu`」，固定定位浮動按鈕 + 展開清單；驗證目標：4.3 測試通過。

## 5. 新增依賴與套件安裝

- [x] 5.1 於 `package.json` 新增 `@dnd-kit/core`、`@dnd-kit/sortable`、`@dnd-kit/utilities` 依賴並執行 `yarn add`（禁用 `npm install`），驗證目標：`yarn.lock` 更新且三個套件出現在 `node_modules/@dnd-kit/`。

## 6. 整合進首頁儀表板

- [x] 6.1 改寫 `src/components/dashboard/WorkDashboard.tsx`：以 `WIDGET_REGISTRY`（widget id → 既有元件 JSX 對照表）取代寫死渲染，依 `useDashboardLayout` 回傳依 `order` 排序且 `visible === true` 的清單渲染，套用 `DndContext`/`SortableContext` 與 `DashboardWidgetShell` 包裹（對應「Default Layout for Unconfigured Users」需求：新使用者版面須與現行寫死順序逐項一致），並在頁面固定位置渲染 `HiddenWidgetsMenu`；驗證目標：`yarn tsc --noEmit` 無錯誤，且 `yarn dev` 手動驗證首頁未設定過版面的帳號顯示順序與變更前完全一致。
- [ ] 6.2 手動驗證完整互動流程（對應「Widget Reordering via Drag and Drop」的 reordering three widgets 範例）：登入本地環境，依序執行「隱藏一個區塊 → 浮動按鈕出現 → 重新整理頁面狀態保留 → 從浮動按鈕復原該區塊 → 拖曳兩個區塊互換順序 → 重新整理頁面順序保留」，驗證目標：全流程手動操作截圖或逐步記錄，且瀏覽器 DevTools 裝置模擬下觸控拖曳（`PointerSensor`/`TouchSensor`）可正常運作，行為與「Layout persists after reload」及「Layout persists across devices」情境一致。
