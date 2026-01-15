# Work Log - 2026-01-14

## Completed Tasks

1. **Resolved Build Errors**: Fixed JSX parsing errors in `TodoContainer.tsx` and `TodoListView.tsx`.
2. **Schema Alignment**: Fixed `cases_status_check` error by switching default status to 'Processing'.
3. **Enhanced Todo System**:
    * Implemented `TodoContainer` with List, Matrix, and Calendar views.
    * Added "System Todos" for automatic legal date and tax deadline reminders.
    * Added "Personal Todos" with due dates.
    * Implemented "Soft Delete" (`is_deleted`) to allow deletion without losing history or causing instant respawn of system tasks.
    * Added "Smart Resurrection" to bring back system tasks if case dates change.
    * Added Magnified Info Card (Tooltip) for calendar view tasks.
    * Added dedicated Delete button (Trash icon) without annoying confirm dialogs.
4. **Homepage Layout**:
    * Restored `DashboardQuickNotes` to the right column, stacked below Date Calculator.
    * Expanded "Smart Agency Center" (Todo) to 750px height for better visibility.

## Mistakes & Lessons Learned (Self-Reflection)

### 1. Database Schema & Cache Sync

* **Mistake**: Attempted to query/upsert `todos` table with new columns (`case_id`, `source_type`) immediately after migration without explicitly reloading the Supabase/PostgREST schema cache.
* **Result**: `Could not find the 'case_id' column` error.
* **Lesson**: Always execute `NOTIFY pgrst, 'reload schema';` in the same migration script or immediately after verifying a schema change if using Supabase client side immediately. Don't assume the API picks it up instantly.

### 2. Logic Flaw in System Task Sync (Zombie Tasks)

* **Mistake**: Implemented "Delete" as a hard delete (`DELETE FROM ...`) but the `fetchAndSyncTodos` logic simply re-inserted the system task on the next refresh because the "Insertion Condition" (date exists in case) was still met.
* **Result**: User deleted a task, refreshed, and it came back (Zombie Task).
* **Lesson**: For system-generated content, "Delete" must be a state (`is_deleted = true`), not a data removal. And the sync logic must respect this state—only creating *new* ones if they truly didn't exist, and only "resurrecting" deleted ones if critical parameters (like the date) actually changed.

### 3. UX Disconnect (Confirm Dialogs)

* **Mistake**: Added a native `confirm()` dialog for deleting small items like todos.
* **Result**: User felt "Trash can no reaction" because the browser dialog might be subtle or just annoying/slow to appear.
* **Lesson**: For high-frequency actions like checking off or deleting todos, use **Optimistic UI** updates (immediate visual feedback) without blocking dialogs. Undo toasts are better than Confirm dialogs.

### 4. Overwriting User Features (The "Where is my Notes?" Incident)

* **Mistake**: Replaced the existing `DashboardQuickNotes` with the new Todo feature on the homepage without verifying if the user wanted to *keep* the old notes inside the new layout.
* **Result**: User had to explicitily ask to add it back.
* **Lesson**: When enhancing a page, **augment** rather than **replace**, unless explicitly told to replace. Always check what was there before simply overwriting the main slot.

### 5. UI Layout Constraints (Clipped Tooltips)

* **Mistake**: Set `overflow-hidden` on the Calendar Grid, causing the "Magnified Tooltip" to be clipped and invisible.
* **Result**: Tooltip didn't show up.
* **Lesson**: When designing popovers or tooltips inside complex grids/containers, ensure `overflow` properties allow them to be visible, or use `z-index` and relative positioning carefully. `overflow-visible` is usually needed for popups.
