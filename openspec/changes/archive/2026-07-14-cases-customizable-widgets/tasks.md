## 1. 資料層：Schema 與 Migration

- [x] 1.1 [P] 撰寫 `src/domain/cases/layoutTypes.ts` 的單元測試（`__tests__/layoutTypes.test.ts`）：涵蓋 `CasesLayoutSchema` 對合法陣列、缺欄位、型別錯誤（如 `order` 為字串）、空陣列、非法 `id` 值（不在 5 個 widget id 之列）的 parse 結果，驗證目標：`yarn test --testPathPatterns "domain/cases/__tests__/layoutTypes"` 全綠。
- [x] 1.2 實作 `src/domain/cases/layoutTypes.ts`：定義 `CasesWidgetIdSchema`（`export-buttons`/`rapid-input`/`quick-navigator`/`pipeline-chart`/`eisenhower-matrix` 五個 enum 值）、`CasesWidgetLayoutItemSchema`、`CasesLayoutSchema`、`CASES_WIDGET_LABELS`、`DEFAULT_CASES_LAYOUT`（對應設計文件「資料結構」小節：五個 id 依序 order 0-4，皆 `visible: true`），使 1.1 測試通過為驗證目標。
- [x] 1.3 新增 `supabase/migrations/<timestamp>_add_cases_layout.sql`：對 `user_settings` 表新增 `cases_layout JSONB` 欄位（`ADD COLUMN IF NOT EXISTS`，無 DEFAULT，允許 NULL 代表未設定），沿用既有 RLS policy；套用到遠端 Supabase 專案前須先詢問使用者確認（比照 `dashboard-widget-layout` change 的既有慣例）。驗證目標：套用後查詢 `information_schema.columns` 可查到該欄位，且 `user_settings` 原有 4 條 RLS policy（`pg_policies` 查詢）未被修改。

## 2. Server Action：讀寫版面設定

- [x] 2.1 [P] 撰寫 `src/app/actions/casesLayout.ts` 的單元測試：涵蓋設計文件「Implementation Contract」所述之 `getCasesLayout()`（無資料回傳 `DEFAULT_CASES_LAYOUT`、schema 驗證失敗回傳預設值、缺少新 widget id 時做 union merge 對應「New Widget Migration for Existing Layouts」需求）與 `updateCasesLayout()`（合法輸入寫入成功、非法輸入被 Zod 擋下不寫入）行為，驗證目標：`yarn test --testPathPatterns "actions/__tests__/casesLayout"` 全綠。
- [x] 2.2 實作 `src/app/actions/casesLayout.ts`：`getCasesLayout()` 讀取 `user_settings.cases_layout`（對應「Default Layout for Unconfigured Users」與「New Widget Migration for Existing Layouts」需求）、`updateCasesLayout(layout)` 驗證後 UPSERT 整份陣列（對應「Layout Persistence Across Sessions」需求），皆使用 Server 端 Supabase client 走 RLS；驗證目標：2.1 測試通過。

## 3. Hook：樂觀更新狀態管理

- [x] 3.1 [P] 撰寫 `src/hooks/useCasesLayout.ts` 的單元測試：涵蓋 `hideWidget`（對應「Widget Visibility Toggle」需求）、`showWidget`（對應「Hidden Widgets Restore Entry Point」需求，含插入到 order 最大值 + 1）、`reorderWidgets`（對應「Widget Reordering via Drag and Drop」需求）的樂觀狀態轉換，以及 `updateCasesLayout` 呼叫失敗時回滾至上一狀態並回傳錯誤旗標（對應「Persistence failure does not corrupt displayed state」情境），驗證目標：`yarn test --testPathPatterns "hooks/__tests__/useCasesLayout"` 全綠。
- [x] 3.2 實作 `src/hooks/useCasesLayout.ts`：整合 2.2 的 Server Action，提供 `{ layout, isLoading, hideWidget, showWidget, reorderWidgets }` 介面，語意比照 `useDashboardLayout`；驗證目標：3.1 測試通過。

## 4. UI 元件泛型化：共用 Shell 與 Hidden Menu

- [x] 4.1 執行既有 `yarn test --testPathPatterns "DashboardWidgetShell|HiddenWidgetsMenu"`，確認泛型化前基準測試全綠（記錄為泛型化後的行為不變基準），對應設計決策「複用 dashboard-widget-layout 的元件與 hook 模式，而非抽成共用泛型元件」。
- [x] 4.2 [P] 補充 `src/components/dashboard/__tests__/DashboardWidgetShell.test.tsx` 與 `HiddenWidgetsMenu.test.tsx` 的泛型參數測試案例：以任意字串 id（非 `DashboardWidgetId` 專屬值，例如 `'export-buttons'`）渲染元件，驗證拖曳把手/X 按鈕/清單渲染邏輯與型別無關；驗證目標：新增案例先失敗（型別或執行期錯誤），確認測試能偵測泛型化前的型別綁死問題。
- [x] 4.3 將 `src/components/dashboard/DashboardWidgetShell.tsx` 的 `id`/`onHide` props 型別由 `DashboardWidgetId` 改為泛型 `T extends string`（元件簽名改為 `DashboardWidgetShell<T extends string>`），內部邏輯（`useSortable`、拖曳把手、X 按鈕渲染條件）不變；驗證目標：4.1 與 4.2 全部測試通過，`yarn tsc --noEmit` 無錯誤。
- [x] 4.4 將 `src/components/dashboard/HiddenWidgetsMenu.tsx` 的 `hiddenWidgetIds`/`onShow` props 型別由 `DashboardWidgetId` 改為泛型 `T extends string`，並新增 `labels: Record<T, string>` prop 取代原本寫死 import 的 `DASHBOARD_WIDGET_LABELS`（呼叫端各自傳入自己的 labels 對照表）；同步更新 `src/components/dashboard/WorkDashboard.tsx` 呼叫處傳入 `DASHBOARD_WIDGET_LABELS`；驗證目標：4.1 與 4.2 全部測試通過，`yarn tsc --noEmit` 無錯誤。

## 5. UI 元件：`/cases` 板塊版面容器

- [x] 5.1 [P] 撰寫 `src/components/features/cases/__tests__/CasesWidgetLayout.test.tsx`：驗證預設版面下 5 個板塊依序渲染（`export-buttons`/`rapid-input`/`quick-navigator`/`pipeline-chart`/`eisenhower-matrix`）、`pipeline-chart`/`eisenhower-matrix` 在傳入 `showMonitoringWidgets={false}` 時不渲染且不計入隱藏清單（對應「Tab-Inapplicable Widgets Are Not Treated as User-Hidden」需求）、點擊 X 按鈕觸發 `hideWidget`；驗證目標：`yarn test --testPathPatterns "features/cases/__tests__/CasesWidgetLayout"` 全綠。
- [x] 5.2 實作 `src/components/features/cases/CasesWidgetLayout.tsx`：Client Component，作為設計決策「`CasesWidgetLayout` 作為 Server→Client 邊界的單一入口」的實作，以 `WIDGET_REGISTRY: Partial<Record<CasesWidgetId, ReactNode>>`（`showMonitoringWidgets` 為 false 時不將 `pipeline-chart`/`eisenhower-matrix` 加入 registry，實作「widget registry 依「目前分頁是否適用」動態決定可見清單」決策）取代呼叫端寫死渲染，依 `useCasesLayout` 回傳依 `order` 排序且 `visible === true` 的清單渲染，套用 `DndContext`/`SortableContext` 與泛型化後的 `DashboardWidgetShell<CasesWidgetId>` 包裹，並在頁面固定位置渲染泛型化後的 `HiddenWidgetsMenu<CasesWidgetId>`；props 只接收板塊實際需要的欄位（比照現行 `CasesRapidInput` 只挑選 `id/case_number/buyer_name/seller_name` 四欄的做法，不整包傳遞 `DemoCase[]`），對應設計文件「Risks / Trade-offs」的 hydration payload 風險緩解；驗證目標：5.1 測試通過。

## 6. 整合進 `/cases` 頁面

- [x] 6.1 改寫 `src/app/cases/page.tsx`：將匯出按鈕（`ExportExcelButton`/`ExportHtmlButton`）、`CasesRapidInput`、`CaseQuickNavigator`、`GlobalPipelineChart`、`EisenhowerMatrix` 五處目前直接寫死的 JSX，改為透過 `CasesWidgetLayout` 動態渲染（傳入 `showMonitoringWidgets={statusParam !== 'Closed' && statusParam !== 'Memo' && statusParam !== 'Timeline' && statusParam !== 'Pending' && monitoringCases.length > 0}` 沿用既有分頁顯示條件）；Memo/Timeline/Pending 分頁的條件渲染邏輯與案件列表 table 渲染邏輯維持原樣不搬移；驗證目標：`yarn tsc --noEmit` 無錯誤，且未設定過版面的帳號造訪 `/cases` 時 5 個板塊顯示順序與變更前完全一致（對應「Default Layout for Unconfigured Users」需求）。
- [x] 6.2 驗證完整互動流程（對應「Widget Reordering via Drag and Drop」的 reordering three widgets 範例）：登入本地環境（或依當時環境限制改用 code review + 單元測試 + 實際 migration 套用驗證，並在本任務註記所用驗證方式），依序確認「隱藏一個板塊 → 浮動按鈕出現 → 重新整理頁面狀態保留 → 從浮動按鈕復原該板塊 → 拖曳兩個板塊互換順序 → 重新整理頁面順序保留 → 案件列表 table 全程固定顯示不受影響 → 切換至 Memo 分頁時 pipeline-chart/eisenhower-matrix 不出現在隱藏清單」全流程，驗證目標：全流程操作記錄或等效驗證證據，行為與「Layout persists after reload」「Layout persists across devices」「Case List Table Is Not Customizable」「Tab-Inapplicable Widgets Are Not Treated as User-Hidden」情境一致。
