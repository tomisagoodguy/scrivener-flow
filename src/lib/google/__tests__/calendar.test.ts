/**
 * Tests for the Google Calendar REST wrapper + pure payload/title builders.
 *
 * TDD: written BEFORE implementation. Covers task 3.3:
 *   - 子行事曆建立 body
 *   - 全天 vs 定時兩種 event payload（決策「事件型態：全天 vs 定時」）
 *   - 四種來源的標題組合格式（proposal 範例）
 *   - fetch 封裝的成功 / 404 狀態回傳
 */

import {
    CALENDAR_TIME_ZONE,
    buildAllDayEvent,
    buildTimedEvent,
    buildEventPayload,
    buildEventTitle,
    buildCalendarInsertBody,
    insertCalendar,
    insertEvent,
    patchEvent,
    deleteEvent,
} from '@/lib/google/calendar';

describe('calendar payload builders', () => {
    it('builds an all-day event with end = date + 1 day', () => {
        // Spec example: milestone date 2026-07-24 → all-day event
        const ev = buildAllDayEvent('用印｜林淑萍/連俊麒 AA1258366', '2026-07-24');
        expect(ev.summary).toBe('用印｜林淑萍/連俊麒 AA1258366');
        expect(ev.start).toEqual({ date: '2026-07-24' });
        expect(ev.end).toEqual({ date: '2026-07-25' });
        expect(ev.start.dateTime).toBeUndefined();
    });

    it('builds a one-hour timed event in Asia/Taipei', () => {
        // Spec example: appointment time 2026-07-24T14:00+08:00 → 1-hour timed event
        const ev = buildTimedEvent('用印約 14:00｜AA1258366', '2026-07-24T14:00:00+08:00');
        expect(ev.summary).toBe('用印約 14:00｜AA1258366');
        expect(ev.start.dateTime).toBeDefined();
        expect(ev.end.dateTime).toBeDefined();
        expect(ev.start.timeZone).toBe(CALENDAR_TIME_ZONE);
        expect(ev.end.timeZone).toBe(CALENDAR_TIME_ZONE);
        // end is exactly one hour after start
        const startMs = new Date(ev.start.dateTime as string).getTime();
        const endMs = new Date(ev.end.dateTime as string).getTime();
        expect(endMs - startMs).toBe(60 * 60 * 1000);
        // start preserves the original instant
        expect(startMs).toBe(new Date('2026-07-24T14:00:00+08:00').getTime());
    });

    it('buildEventPayload dispatches by allDay flag', () => {
        const allDay = buildEventPayload({ title: 'T', value: '2026-08-13', allDay: true });
        expect(allDay.start).toEqual({ date: '2026-08-13' });

        const timed = buildEventPayload({ title: 'T', value: '2026-07-24T09:00:00+08:00', allDay: false });
        expect(timed.start.dateTime).toBeDefined();
    });
});

describe('buildEventTitle', () => {
    it('formats a milestone title', () => {
        expect(
            buildEventTitle({ kind: 'milestone', label: '用印', parties: '林淑萍/連俊麒', caseNumber: 'AA1258366' })
        ).toBe('用印｜林淑萍/連俊麒 AA1258366');
    });

    it('formats an appointment title with time', () => {
        expect(
            buildEventTitle({ kind: 'appointment', label: '用印', time: '14:00', caseNumber: 'AA1258366' })
        ).toBe('用印約 14:00｜AA1258366');
    });

    it('formats a todo title', () => {
        expect(
            buildEventTitle({ kind: 'todo', content: '核對謄本', caseNumber: 'AA1258366' })
        ).toBe('待辦：核對謄本｜AA1258366');
    });

    it('formats a tax-deadline title', () => {
        expect(
            buildEventTitle({ kind: 'tax', label: '房屋稅', caseNumber: 'AA1258366' })
        ).toBe('房屋稅截止｜AA1258366');
    });
});

describe('buildCalendarInsertBody', () => {
    it('defaults to the 案件 calendar in Asia/Taipei', () => {
        expect(buildCalendarInsertBody()).toEqual({ summary: '案件', timeZone: CALENDAR_TIME_ZONE });
    });

    it('honours a custom name', () => {
        expect(buildCalendarInsertBody('專案')).toEqual({ summary: '專案', timeZone: CALENDAR_TIME_ZONE });
    });
});

describe('calendar REST wrappers', () => {
    const fetchMock = jest.fn();

    beforeEach(() => {
        fetchMock.mockReset();
        global.fetch = fetchMock as unknown as typeof fetch;
    });

    function okResponse(body: unknown, status = 200) {
        return Promise.resolve({
            ok: status >= 200 && status < 300,
            status,
            json: () => Promise.resolve(body),
            text: () => Promise.resolve(JSON.stringify(body)),
        });
    }

    it('insertCalendar returns the created calendar id', async () => {
        fetchMock.mockReturnValueOnce(okResponse({ id: 'cal_123' }, 200));
        const res = await insertCalendar('tok');
        expect(res.ok).toBe(true);
        expect(res.status).toBe(200);
        expect(res.data?.id).toBe('cal_123');
        // POST to calendars endpoint with bearer token
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toContain('/calendars');
        expect(init.method).toBe('POST');
        expect(init.headers.Authorization).toBe('Bearer tok');
    });

    it('insertEvent posts to the events endpoint of the target calendar', async () => {
        fetchMock.mockReturnValueOnce(okResponse({ id: 'evt_1' }, 200));
        const res = await insertEvent('tok', 'cal_123', buildAllDayEvent('T', '2026-07-24'));
        expect(res.ok).toBe(true);
        expect(res.data?.id).toBe('evt_1');
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toContain(encodeURIComponent('cal_123'));
        expect(url).toContain('/events');
        expect(init.method).toBe('POST');
    });

    it('patchEvent surfaces a 404 (event deleted on Google side)', async () => {
        fetchMock.mockReturnValueOnce(okResponse({ error: { message: 'Not Found' } }, 404));
        const res = await patchEvent('tok', 'cal_123', 'evt_gone', buildAllDayEvent('T', '2026-07-24'));
        expect(res.ok).toBe(false);
        expect(res.status).toBe(404);
    });

    it('deleteEvent treats 410 Gone as success (already deleted)', async () => {
        fetchMock.mockReturnValueOnce(okResponse('', 410));
        const res = await deleteEvent('tok', 'cal_123', 'evt_1');
        expect(res.ok).toBe(true);
    });
});
