# Work Log

## 2026-01-10

### Initial Assessment

- Active Document: `README.md` (Spec v2.0)
- Open Files: `src/types/index.ts`, `supabase/schema_demo_v1.sql`, `extract_excel.py`
- Current Status:Phase 1 (Basic CRUD, Auth, List) seems partially done.

  `src/app/page.tsx` (Dashboard) exists.

  `src/app/demo/page.tsx` exists (Demo Case/Excel view).

  `src/app/cases/new/page.tsx` exists (Create Case).

  `src/app/cases/page.tsx` (Case List) is MISSING.

  `extract_excel.py` suggests interest in Phase 2 (Excel Import).

### Plan

1. Verify `src/types/index.ts` for Case definitions.
2. Implement `src/app/cases/page.tsx` to provide the requested "Ongoing/Closed" case list with tabs, search, and filter (as per Spec v2.0 Phase 1).
3. Ensure consistency with `src/components/RecentCases.tsx`.

### Progress

- 20:30 - Created `src/app/cases/page.tsx`: Implemented Case List view with "Ongoing/Closed" tabs and search functionality. Matches Phase 1 spec.
- 20:35 - Created `src/app/cases/[id]/page.tsx` & `src/components/EditCaseForm.tsx`: implemented Case Detail/Edit page.
- 20:38 - Created `src/app/admin/import/page.tsx`: Setup basic skeleton for Excel import (Phase 2).
- 20:45 - Enhanced `src/app/admin/import/page.tsx`: Added debug logging for header detection to fix import issues.
- **Next**: Start Phase 2 (Excel Import) - Setup `/admin/import` page.

## 2026-01-11

### Design Review & Vibe Coding Upgrade

#### Current State

- **Theme**: Moved from "Notion-like" to **Glassmorphism**.
- **Tech Stack**: Next.js, Tailwind CSS, Lucide Icons.

#### Decisions

- **Visual Identity**: Adopted **Glassmorphism**, **Subtle Gradients**, and **Richer Shadows** for a premium, airy feel.
- **UI Overhaul**:
  - Updated `globals.css` with Sky/Ocean palette and Glass utilities.
  - Refactored `DashboardStats`, `RecentCases`, `Header`, and `NewCasePage` to use Glass UI (`.glass-card`).
  - Inputs are now semi-transparent (`bg-white/50`) with backdrop blur.

#### Plan

- [ ] Deepen Dark Mode integration (currently defined in CSS but need toggle).
- [ ] Add more micro-interactions (hover scales, glows).
- [ ] Consistent animation strategy.

### Case Management Refinement (Afternoon Session)

#### Key Updates

1. **Overtime Declaration & Alert System**

   - Added `OvertimeButton` component with toggle functionality.
   - Logic: "Not Declared" (default) -> "Declared" (Green).
   - **Smart Alert**: Displays a red, pulsing alert ("未申報用印加班費") if within 7 days of Seal Date (`seal_date`) and not yet declared.
   - Schema: Added `has_keyed_overtime` (boolean) to `cases` table.
2. **Transfer Date & Note Enhancement**

   - **Multi-input Logic**: Users can now select a preset note (e.g., "訴訟", "卡營業登記") or type a custom one alongside the Transfer Date.
   - **Visual Cues**:
     - If a `transfer_note` exists, the list view shows it with a **red background and pulse animation** to signal urgency/exception.
     - If only a date exists, it shows in red text.
   - Schema: Added `transfer_note` (text) to `milestones` table.
3. **Workflow Streamlining**

   - **Status Simplification**: Reduced status options to just **"辦理中" (Processing)** and **"結案" (Closed)** for clarity.
   - **Auto-Redirect**: Creating or saving a case now automatically redirects to the `/cases?status=Processing` list, removing friction.
   - **UI Fixes**:
     - Refined `CaseCard` to show more meaningful data (Phone numbers, Banks) with better contrast.
     - Fixed `EditCaseForm` bugs where functionality was lost during editing.

#### Refactoring & Fixes

- Fixed syntax errors in `NewCasePage` (`try/catch` block).
- Restored accidental deletion of `handleDelete` and form sections in `EditCaseForm`.
- Ensured database upserts (`milestones`, `financials`) use proper Unique constraints (`case_id`).

1. **Fixed Task Tracking (Todos System)**
   - **Context**: Implemented a core requirement for post-contract workflows.
   - **Feature**: A set of 12 fixed tasks (e.g., "買方蓋印章", "賣方蓋印章", "用印款", "完稅款", etc.) now appears on each case card.
   - **Interactivity**: Integrated `CaseTodos` component that allows quick-toggling task completion directly from the list view (or edit form) via a clean, clickable badge UI.
   - **Auto-Initialization**: New cases are automatically assigned the full suite of tasks (default: uncompleted).
   - **Schema**: Added `todos` (JSONB) column to the `cases` table to store task states flexibly.

## 2026-01-11 Evening Update (u3c.4)

### Desktop UI Layout Overhaul (Phase 1)

**Goal**: Optimize the application for computer users by moving from a mobile-first vertical stack to a multi-column horizontal layout on large screens.

1. **New Horizontal Form (Edit & Create)**

   - **Basic Info**: Reorganized into a 4-column grid (Case#, City, Buyer, Seller).
   - **Milestones**: Grouped logically in horizontal blocks. Dates and payment amounts are now side-by-side.
   - **Density**: Significantly reduced vertical scrolling on desktop, allowing the entire form to be viewed with minimal movement.
   - **Visual Hierarchy**: Refined labels, font weights, and primary colors (amber/blue/emerald/purple) for different stages (Signature/Seal/Tax/Tail).
2. **Redesigned Case List (Desktop Optimization)**

   - **Case Cards**: Switched from vertical chunks to a horizontal dashboard-like card on desktop.
   - **Tabular Timeline**: The 5 core milestones (簽約, 用印, 完稅, 過戶, 尾款, 交屋) are now displayed in a single horizontal row with connecting arrows.
   - **Quick Stats**: Grouped People, Banks, and Prices in distinct, scanable blocks.
3. **Schema & Logic Alignment**

   - **Milestone Payload**: Expanded submission logic to handle all 6 payment-related dates and amounts (`sign_diff`, `contract`, `seal`, `tax`, `balance`).
   - **Validation**: Corrected field mapping for phone numbers and bank details during new case creation.
   - **Tax Type Integration**: Ensured `tax_type` (一般/自用) is fully supported in the UI and persisted in the `cases` table.

### High-Density Monitoring &战情中心 (戰情中心模式)

**Goal**: Transform the application into a professional monitoring station capable of managing 30+ simultaneous cases with high readability.

1. **Excel-Style high-density Table View**

   - **UI Overhaul**: Replaced Case Cards with a rigorous grid-based table (`border-slate-300`).
   - **Readability Upgrade**: Force-increased font sizes to **16px (Extra Bold)** for case IDs and names, with high contrast for visual accessibility.
   - **Sticky Headers**: Implemented `sticky top-0` headers for seamless scrolling through up to 30 cases.
   - **Stage Tracking**: Optimized the 6-stage timeline (簽>印>稅>尾>過>交) into a compact, color-coded cell.
   - **Pending Item Flags**: Direct visibility of unfinished tasks (Red small badges) in the list view, limited to 10 items + counter.
2. **Advanced Monitoring Tools (War Room)**

   - **Global Pipeline Chart**: Added a horizontal flowchart tracking the distribution of cases across all 6 stages.
   - **30-Day Timeline Gantt View**: A professional Gantt-style timeline showing all upcoming milestones for the next 30 days across all active cases.
   - **7-Day Work Alert Dashboard**: Refined the horizontal day-by-day alert board for immediate priority tracking.
3. **Logic & Data Standardization**

   - **Timeline Sequence**: Fixed the correct order: **簽約 > 用印 > 完稅 > 過戶 > 交屋**.
   - **Tax Type Expansion**: Added compound options like "一生一次 + 道路用地" etc.
   - **Checklist Visibility**: Hides completed items in List View (for density) but shows all in Edit Form (for review).
4. **Stability & Error Handling**

   - **Diagnostic UI**: Implemented a "Force-Extraction" error display that stringifies hidden Supabase error properties into a visible red alert box.
   - **Schema Alignment Fixes**: Adjusted payloads in `NewCasePage` to match the latest `recreate_full_schema.sql` (filtering out `cancellation_type` if missing).
   - **Build Failure Fixes**: Resolved JSX parsing errors (escaped `>`) and duplicate `try-catch` blocks.

## 2026-01-12

### Business Logic & Schema Finalization

1. **稅單性質 (Tax Type) 標準化**

   - 規範選項：`一般`、`一生一次`、`一生一屋`、`道路用地`、`一生一次+道路用地`、`一生一屋+道路用地`。
   - 已同步更新至 `NewCasePage.tsx` 下拉選單。
2. **日期與流程對齊**

   - **日期映射**：交屋日即為尾款日，表單中已移除獨立的「尾款日」輸入框。
   - **DOCX 解析**：`parseDocx.ts` 現在會將「尾款」日期自動填入 `handover_date`。
3. **資料庫 Schema 修正 (District Error)**

   - 修正了 `cases` 資料表 `district` 欄位為 Not Null 導致的建立失敗。
   - **邏輯**：目前系統預設 `city` 為「臺北市」，原 UI 的地區選單（如士林、內湖）改為填入 `district` 欄位。
4. **UI 文字精簡**

   - 塗銷方式：將「代書塗銷 (我方辦理)」精簡為「代書塗銷」。
5. **Hydration 修正**

   - 在 `layout.tsx` 的 `body` 標籤加入 `suppressHydrationWarning`，解決因瀏覽器擴充功能或字體載入導致的水合警語。
6. **系統全面同步 (System-wide Sync)**

   - **案件管理清單**：移除了 6 階段流程中的「尾」階段，更新為：**簽 > 印 > 稅 > 過 > 交**。
   - **編輯表單 (`EditCaseForm.tsx`)**：
     - 移除「尾款日」輸入框與資料處理邏輯。
     - 將「尾款金額」移至「交屋」區塊，與「代償日」、「交屋日」組合顯示。
     - 更新了「稅單性質」的下拉選單選項。
   - **圖表與監控**：同步更新 `GlobalPipelineChart` 與 `TimelineGanttView` 移除尾款重複階段。

### UI/UX Refinements (Night Session: Phase 2)

1. **資料庫欄位補全 (Schema Fix)**

   - 解決了「代辦事項 (Todos)」無法儲存的問題。
   - 新增 SQL 腳本補齊了 `cases` 與 `milestones` 表格中缺失的欄位：`todos` (JSONB), `buyer_phone`, `seller_phone`, `district`, `contract_amount` 等。
2. **待辦事項清單優化 (Case List Todos)**

   - **Auto-Hide**: 首頁列表的待辦事項現在只會顯示「未完成 (紅色)」的項目。
   - **Optimistic UI**: 點擊紅色項目後立即變綠 (已完成)，重新整理後自動隱藏，保持版面乾淨。
   - **Pending Tasks**: 在清單卡片下方新增了「📝 備忘」區域，顯示文字型的備註事項。
3. **列表版面與空間重組**

   - 縮減了案號、地區、人名等非核心資訊的欄位寬度與字級 (12-13px)。
   - 釋放大量水平空間給「待辦事項」與「流程進度」，讓操作更順手。
4. **表單一致性優化 (Form Synchronization)**

   - **承辦地點**：`EditCaseForm` (編輯頁) 的地點選項已「完全同步」新增頁邏輯。
   - 選項統一為：`台北(士)`、`台北(內)`、`新北(內)`，並移除不必要的縣市/區域切分輸入框，確保前後台體驗一致。
5. **視覺監控與甘特圖優化**

   - **Pipeline Chart (上方圓餅流程)**：
     - 縮小了步驟間距，確保在單一螢幕畫面中能完整顯示 5 大步驟 (簽→交)，無需左右滑動。
     - 修正了圓圈特效被邊框裁切的問題，增加了垂直呼吸空間。
   - **30 日甘特圖 (Gantt View)**：
     - **Semantic Theming**：全面改用 `bg-card`, `bg-muted` 等語意化變數。
     - **視覺修正**：確實解決了「白天模式下黑底黑字顯示不清」的嚴重 Bug，現在具備正確的亮色對比度 (深色標題 + 亮色卡片 + 黑色文字)。

### User Interaction & Feature Expansion (Late Night Session)

1. **Timeline Gantt View Refinements**

   - Implemented **Collapse/Expand** functionality for the Gantt chart to reduce visual clutter.
   - Reduced the maximum height of the expanded Gantt chart to **300px**.
   - Resolved a build error caused by duplicated JSX tags during the refactor.
2. **Case List & Todos Enhancements**

   - **Visual Upgrade**: Increased the font size and padding of Todo/Task buttons for better readability (`text-[12px]`, `px-3`).
   - **Attention Section**: Introduced a dedicated **"⚠️ 應注意" (Attention)** section in the Case List (Edit Page) and Gantt View.
     - Items in this section (e.g., "報稅檢查", "戶籍遷入") are **always visible**, ensuring critical checks are never hidden.
     - Other tasks are grouped under "其他代辦" and can be hidden when completed.
   - **Task Expansion**: Added **"代償", "塗銷", "二撥"** to the core workflow tasks (Transfer/Handover stage).
   - **Text Wrap Support**: Enabled `whitespace-normal` for task buttons to allow long text (e.g., "提醒銀行立契日") to wrap naturally without breaking layout.
3. **Quick Notes (懶人包) Upgrade**

   - **Customizable Notes**: Transformed `QuickNotes` into a dynamic component.
   - **Persistence**: Users can now **add custom notes** which are saved to `localStorage`, verifying persistence across sessions.
   - **UI Polish**: Added a clear "+ 新增常用" button and updated the tag styling to be larger and cleaner (`text-sm`, `px-4`).
4. **Form Usability Improvements**

   - **Textarea Expansion**: Significantly increased the size of `pending_tasks` (to 10 rows) and `notes` (to 10 rows) in the Edit Form to accommodate detailed logs.
   - **Clean Layout**: Reverted the split-view in the main *Case List* table to keep the dashboard compact, while retaining the detailed split-view in the *Edit Page*.

### Highlighting & Refinements (Late Night Session - Part 2)

1. **Color-Coded Milestone Steps**

   - **Feature**: Enabled click-to-highlight functionality for the 5 key milestone steps (簽, 印, 稅, 過, 交) in the Case List view.
   - **Visuals**: Toggling a step turns its background to **Amber (暖黃色)**, providing a high-contrast visual cue against the default Blue/Gray.
   - **Persistence**: Highlight state is saved locally (`localStorage`) per case and step, ensuring personal markers remain after refresh.
2. **Fixes**

   - Resolved a build error caused by a missing `<td>` tag in the Case List table structure.
   - Fixed a duplicate import error for `CaseCompactTodoList` in `src/app/cases/page.tsx`.

### Next Actions: Google Authentication

- **Goal**: Enable Google OAuth for secure, user-segregated login.
- **Reason**: To prevent data mixing between different users (currently all users see all cases).
- **Plan**: Configure Supabase Auth Provider and implement RLS policies.

### 2026-01-12 QuickNotes Fix & Financial Features

- **Fixed**: Resolved persistent "unresponsive delete button" in QuickNotes.
  - Root Cause: `onClick` conflicts with focus/blur events in the list item.
  - Solution: Switched to `onMouseDown` for immediate event capturing and physically separated the delete button from the main button to prevents event bubbling issues.
- **Added**: "Pre-Collected Fee" (預收規費) field.
  - Added `pre_collected_fee` column to database and `financials` table.
  - Implemented smart input formatting (auto-converts "5" to "50000").
  - Added to Case List view with "Wan" (萬) unit display.
  - Made the cell clickable/highlightable for status tracking (Yellow highlight).

### 2026-01-13 (Auth & User Separation)

1. **Google Login Integration**:

   - Created `src/app/login/page.tsx` with a modern Glass UI login page.
   - Implemented `src/middleware.ts` to protect routes and manage Auth Sessions via Cookies (`@supabase/ssr`).
   - Added OAuth Callback at `src/app/auth/callback/route.ts` to handle Google Sign-In redirect.
   - Refactored `supabaseClient.ts` to use SSR-compatible pattern.
2. **User Data Separation (RLS)**:

   - Added logic to `NewCasePage.tsx` to automatically attach `user_id` to new cases.
   - **Migration Required**: Created `supabase/migrations/20260113_add_auth.sql` to:
     - Add `user_id` column to `cases` table.
     - Enable Row Level Security (RLS) on all core tables.
     - Add Policies to restrict access to "Own Data Only" (Insert/Select/Update/Delete).

### Next Steps

- [ ] **Run Migration**: Execute `supabase/migrations/20260113_add_auth.sql` in Supabase Dashboard SQL Editor.
- [ ] **Enable Google Auth**: Go to Supabase Dashboard -> Authentication -> Providers -> Google -> Enable and paste Client ID/Secret.
- [ ] **Verification**: Login with Google and create a case to verify ownership.

### 2026-01-13 Late Night Update: Professional Dashboard & Calendar Sync

1. **Homepage Redesign (Pro Dashboard)**
    - **Bento Grid Layout**: Transformed the homepage into a modular "Pro Dashboard".
        - **Left (Workspace)**: Quick Notes & Resource Links (Banks, Clauses, Redemptions).
        - **Right (Tools)**: Date Calculator for quick scheduling.
        - **Bottom (Activity)**: Full-width "Recent Cases" feed.
    - **Modern Aesthetic (Slate/White)**:
        - Removed "Glassmorphism" for a cleaner, high-performance **Slate/White** theme.
        - Improved readability with sharp contrast and subtle gray backgrounds (`#F0F2F5`).
        - Added dynamic "Good Morning/Afternoon" greeting.

2. **Google Calendar Integration (Deep Sync)**
    - **Dashboard Gantt View**:
        - **Two-Way Visibility**: The 30-day Gantt chart now pulls events from your **Google Calendar** (first row).
        - **Collision Detection**: Instantly spot conflicts between personal events and case milestones.
        - **Global Monitoring**: The Gantt chart is now **decoupled** from the case list filters, meaning it always shows *all active cases* + *calendar events*, even when you are filtering for specific tasks below.
    - **Sync Button**: Added a feature in the Case Edit page to **one-click push** case milestones (Sign, Seal, Tax, Transfer, Handover) to Google Calendar.

3. **UI/UX Refinements**
    - **Bank/Redemption/Clauses Pages**: Unified all resource libraries into **High-Density Tables** for rapid scanning.
    - **Consistent Styling**: Standardized buttons, inputs, and card styles across the entire app.

- [x] **Cloud Deployment (Vercel)**: Successful build and deployment process (Troubleshot 6 build errors).
- [ ] **Google OAuth Post-Setup**: Update Authorized Redirect URIs in Google Cloud Console.

## 2026-01-13 (Late Night)

### Vercel Deployment & Build Error Troubleshooting

Successfully pushed to Vercel and resolved series of production build errors:

1. **Type Mismatch**: Fixed `Case` vs `DemoCase` type conflicts in `GoogleCalendarSyncButton.tsx` and `CaseDetailPage`.
2. **Syntax Error**: Removed duplicate `return` statement in `DashboardDateCalculator.tsx`.
3. **Object Literal Property Collision**: Removed duplicate `notes` property in `NewCasePage.tsx`.
4. **Missing Components**: Removed non-existent Shadcn UI (`Button`, `Input`) imports in `CasesPage.tsx`.
5. **Redundant Linting**: Removed unused `@ts-expect-error` in `page.tsx` that caused CI failure.
6. **Missing Server Action**: Implemented missing `generateDoc.ts` to satisfy `DocumentGenerator.tsx` dependencies.

### Status

- **Homepage**: Fully redesigned with neutral professional theme.
- **Gantt Chart**: Persistence fixed, Google Calendar row always visible.
- **Data Tables**: All resource pages (Banks, Redemptions, Clauses) converted to high-density grids.
- **Vercel**: Deployment successful (Build #6).

### Pending for Tomorrow

1. **Google Console Config**: Log in to Google Cloud Console, add `https://your-app-url.vercel.app/auth/callback` to Redirect URIs.
2. **Final Verification**: Check mobile responsiveness of the new dashboard.

## 2026-01-14

### Vercel Deployment & Production Fixes

- **Context**: Resolving Vercel build errors to achieve a stable production deployment.
- **Key Issues Resolved**:
    1.  **TypeScript Array Mismatches**: Fixed Type error where milestones and financials were treated as objects in code but defined as arrays. Updated EditCaseForm, TimelineDashboard, TimelineGanttView, GoogleCalendarSyncButton, ExportExcelButton, and stageUtils to use safe array access pattern: (c.milestones?.[0] || {}) as any.
    2.  **Next.js Static Build Error**: Resolved useSearchParams() should be wrapped in a suspense boundary by wrapping the global Header in a Suspense boundary within RootLayout.
    3.  **Supabase Auth Redirects**: Configured Redirect URLs in Supabase Dashboard to whitelist the production domain (https://scrivener-flow.vercel.app/**), ensuring sucessful Google OAuth login flow.
- **Outcome**:
    - **Vercel Deployment**: **Successful (Ready )**.
    - **Production URL**: https://scrivener-flow.vercel.app.
    - **Features Validated**: Google Login, Dashboard Rendering, Case Creation, Excel Export, Deployment Pipeline.
