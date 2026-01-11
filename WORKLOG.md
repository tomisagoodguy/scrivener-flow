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
