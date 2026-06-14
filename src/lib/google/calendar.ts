/**
 * Google Calendar REST 封裝（以 fetch 直接呼叫，不引入 googleapis 套件）。
 *
 * 沿用 googleDrive.ts 既有「以 access token 呼叫 Google REST」模式。
 * 包含：
 *   - 純函式：事件 payload 與標題組合（全天 / 定時）、子行事曆建立 body
 *   - 網路函式：calendars.insert / get、events insert / patch / delete
 *
 * 設計決策見 openspec/changes/google-calendar-milestone-sync/design.md。
 */

export const CALENDAR_TIME_ZONE = 'Asia/Taipei';
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
const DEFAULT_CALENDAR_NAME = '案件';

export interface CalendarEventResource {
    summary: string;
    start: { date?: string; dateTime?: string; timeZone?: string };
    end: { date?: string; dateTime?: string; timeZone?: string };
}

export interface CalendarApiResult<T = unknown> {
    ok: boolean;
    status: number;
    data?: T;
    error?: string;
}

// --- 純函式：日期工具 ---

/** 'YYYY-MM-DD' + 1 天（全天事件的 end.date 為 exclusive）。 */
function addOneDay(dateStr: string): string {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
}

/** ISO timestamptz + 1 小時，回傳 ISO 字串。 */
function addOneHour(isoStr: string): string {
    return new Date(new Date(isoStr).getTime() + 60 * 60 * 1000).toISOString();
}

// --- 純函式：事件 payload 組裝 ---

/** date 來源（里程碑、稅限）→ 全天事件，end = 日期 + 1 天。 */
export function buildAllDayEvent(title: string, dateStr: string): CalendarEventResource {
    return {
        summary: title,
        start: { date: dateStr },
        end: { date: addOneDay(dateStr) },
    };
}

/** timestamptz 來源（約定、待辦）→ 1 小時定時事件，時區 Asia/Taipei。 */
export function buildTimedEvent(title: string, isoStr: string): CalendarEventResource {
    return {
        summary: title,
        start: { dateTime: isoStr, timeZone: CALENDAR_TIME_ZONE },
        end: { dateTime: addOneHour(isoStr), timeZone: CALENDAR_TIME_ZONE },
    };
}

/** 依 allDay 旗標分派至全天 / 定時 payload。 */
export function buildEventPayload(params: { title: string; value: string; allDay: boolean }): CalendarEventResource {
    return params.allDay
        ? buildAllDayEvent(params.title, params.value)
        : buildTimedEvent(params.title, params.value);
}

// --- 純函式：標題組合（proposal 範例格式） ---

export type EventTitleInput =
    | { kind: 'milestone'; label: string; parties: string; caseNumber: string }
    | { kind: 'appointment'; label: string; time: string; caseNumber: string }
    | { kind: 'todo'; content: string; caseNumber: string }
    | { kind: 'tax'; label: string; caseNumber: string };

export function buildEventTitle(input: EventTitleInput): string {
    switch (input.kind) {
        case 'milestone':
            return `${input.label}｜${input.parties} ${input.caseNumber}`;
        case 'appointment':
            return `${input.label}約 ${input.time}｜${input.caseNumber}`;
        case 'todo':
            return `待辦：${input.content}｜${input.caseNumber}`;
        case 'tax':
            return `${input.label}截止｜${input.caseNumber}`;
    }
}

/** 子行事曆建立 body（calendars.insert）。 */
export function buildCalendarInsertBody(name: string = DEFAULT_CALENDAR_NAME): { summary: string; timeZone: string } {
    return { summary: name, timeZone: CALENDAR_TIME_ZONE };
}

// --- 網路函式 ---

async function toResult<T>(res: Response): Promise<CalendarApiResult<T>> {
    if (res.status === 204) {
        return { ok: true, status: 204 };
    }
    let body: unknown;
    try {
        body = await res.json();
    } catch {
        body = undefined;
    }
    if (!res.ok) {
        const error = (body as { error?: { message?: string } })?.error?.message;
        return { ok: false, status: res.status, error };
    }
    return { ok: true, status: res.status, data: body as T };
}

function authHeaders(token: string): Record<string, string> {
    return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

/** 建立專用子行事曆，回傳其 id。 */
export async function insertCalendar(token: string, name?: string): Promise<CalendarApiResult<{ id: string }>> {
    const res = await fetch(`${CALENDAR_API_BASE}/calendars`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(buildCalendarInsertBody(name)),
    });
    return toResult<{ id: string }>(res);
}

/** 確認子行事曆是否仍存在（404 表示被使用者刪除）。 */
export async function getCalendar(token: string, calendarId: string): Promise<CalendarApiResult<{ id: string }>> {
    const res = await fetch(`${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}`, {
        headers: { Authorization: `Bearer ${token}` },
    });
    return toResult<{ id: string }>(res);
}

export async function insertEvent(
    token: string,
    calendarId: string,
    payload: CalendarEventResource
): Promise<CalendarApiResult<{ id: string }>> {
    const res = await fetch(`${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`, {
        method: 'POST',
        headers: authHeaders(token),
        body: JSON.stringify(payload),
    });
    return toResult<{ id: string }>(res);
}

export async function patchEvent(
    token: string,
    calendarId: string,
    eventId: string,
    payload: CalendarEventResource
): Promise<CalendarApiResult<{ id: string }>> {
    const res = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
            method: 'PATCH',
            headers: authHeaders(token),
            body: JSON.stringify(payload),
        }
    );
    return toResult<{ id: string }>(res);
}

/** 確認事件是否仍存在（skip 決策時避免 DB 有 mapping 但 Google 端已空）。 */
export async function getEvent(
    token: string,
    calendarId: string,
    eventId: string
): Promise<CalendarApiResult<{ id: string }>> {
    const res = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return toResult<{ id: string }>(res);
}

/** 列出子行事曆事件（用於回填後驗證實際寫入筆數）。 */
export async function listEvents(
    token: string,
    calendarId: string,
    maxResults = 250
): Promise<CalendarApiResult<{ items?: { id: string }[] }>> {
    const res = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?maxResults=${maxResults}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return toResult<{ items?: { id: string }[] }>(res);
}

/** 刪除事件；404/410 視為已刪除（目標達成）→ 回傳 ok。 */
export async function deleteEvent(token: string, calendarId: string, eventId: string): Promise<CalendarApiResult> {
    const res = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
        {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        }
    );
    if (res.status === 404 || res.status === 410) {
        return { ok: true, status: res.status };
    }
    return toResult(res);
}
