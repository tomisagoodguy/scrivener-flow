'use server';

/**
 * Google 行事曆同步的 Server Action 入口。
 *
 * - syncCaseToCalendar / syncTodoToCalendar：供 caseService / todoService 在資料
 *   變更後觸發（client 端透過 Server Action 邊界呼叫，失敗隔離由呼叫端負責）。
 * - backfillCalendar：設定頁的一次性回填，先 provisioning 再逐案 + 逐待辦同步。
 *
 * 實際同步邏輯在 src/services/calendarSyncService.ts（伺服器端）。
 */

import { syncCase, syncTodo, backfillAll, type CalendarSyncResult } from '@/services/calendarSyncService';

export async function syncCaseToCalendar(caseId: string): Promise<CalendarSyncResult> {
    return syncCase(caseId);
}

export async function syncTodoToCalendar(todoId: string): Promise<CalendarSyncResult> {
    return syncTodo(todoId);
}

export async function backfillCalendar(): Promise<CalendarSyncResult> {
    return backfillAll();
}
