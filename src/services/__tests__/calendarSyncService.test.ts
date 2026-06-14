/**
 * Tests for calendarSyncService core logic.
 *
 * TDD: written BEFORE implementation. Covers task 4.3 — the per-field decision
 * table (決策「同步動作的決策邏輯」) plus dedicated-calendar provisioning.
 * calendar.ts network functions and getAccessToken are mocked.
 */

import * as calendar from '@/lib/google/calendar';
import {
    decideSyncAction,
    syncField,
    provisionCaseCalendar,
    CalendarAuthError,
    type SyncContext,
} from '@/services/calendarSyncService';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/app/actions/googleDrive', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/google/calendar', () => {
    const actual = jest.requireActual('@/lib/google/calendar');
    return {
        ...actual,
        insertCalendar: jest.fn(),
        getCalendar: jest.fn(),
        getEvent: jest.fn(),
        listEvents: jest.fn(),
        insertEvent: jest.fn(),
        patchEvent: jest.fn(),
        deleteEvent: jest.fn(),
    };
});

const mockedCalendar = calendar as jest.Mocked<typeof calendar>;

/** Minimal chainable Supabase mock that records write payloads. */
function makeSupabase(singleData: unknown) {
    const calls = {
        upsert: [] as unknown[],
        update: [] as unknown[],
        deletedIds: [] as unknown[],
        insert: [] as unknown[],
    };
    const chain: Record<string, unknown> = {};
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.in = () => chain;
    chain.order = () => chain;
    chain.maybeSingle = () => Promise.resolve({ data: singleData, error: null });
    chain.single = () => Promise.resolve({ data: singleData, error: null });
    chain.upsert = (v: unknown) => {
        calls.upsert.push(v);
        return Promise.resolve({ data: null, error: null });
    };
    chain.update = (v: unknown) => {
        calls.update.push(v);
        return { eq: () => Promise.resolve({ data: null, error: null }) };
    };
    chain.delete = () => ({
        eq: (_c: string, id: unknown) => {
            calls.deletedIds.push(id);
            return Promise.resolve({ data: null, error: null });
        },
    });
    chain.insert = (v: unknown) => {
        calls.insert.push(v);
        return Promise.resolve({ data: null, error: null });
    };
    const supabase = { from: jest.fn(() => chain) };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { supabase: supabase as any, calls };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockedCalendar.getEvent.mockResolvedValue({ ok: true, status: 200, data: { id: 'evt_1' } });
});

describe('decideSyncAction', () => {
    // Mirrors the spec example table (per-field sync decisions).
    it('value + no mapping → create', () => {
        expect(decideSyncAction('2026-07-24', null)).toBe('create');
    });
    it('value + mapping + changed synced value → update', () => {
        expect(decideSyncAction('2026-08-13', { synced_value: '2026-08-10' })).toBe('update');
    });
    it('value + mapping + same synced value → skip', () => {
        expect(decideSyncAction('2026-07-24T09:00:00+08:00', { synced_value: '2026-07-24T09:00:00+08:00' })).toBe('skip');
    });
    it('null value + mapping → delete', () => {
        expect(decideSyncAction(null, { synced_value: '2026-07-24' })).toBe('delete');
    });
    it('null value + no mapping → noop', () => {
        expect(decideSyncAction(null, null)).toBe('noop');
    });
});

describe('syncField', () => {
    const baseCtx = (supabase: SyncContext['supabase']): SyncContext => ({
        supabase,
        userId: 'u1',
        token: 'tok',
        calendarId: 'cal_1',
    });

    it('creates an all-day event and mapping when none exists', async () => {
        mockedCalendar.insertEvent.mockResolvedValue({ ok: true, status: 200, data: { id: 'evt_new' } });
        const { supabase, calls } = makeSupabase(null); // no existing mapping

        await syncField(baseCtx(supabase), {
            sourceTable: 'milestones',
            sourceId: 'case_1',
            sourceField: 'seal_date',
            value: '2026-07-24',
            allDay: true,
            title: '用印｜林淑萍/連俊麒 AA1258366',
        });

        expect(mockedCalendar.insertEvent).toHaveBeenCalledTimes(1);
        const payload = mockedCalendar.insertEvent.mock.calls[0][2];
        expect(payload.start).toEqual({ date: '2026-07-24' });
        expect(calls.upsert).toHaveLength(1);
        expect(calls.upsert[0]).toMatchObject({
            source_table: 'milestones',
            source_id: 'case_1',
            source_field: 'seal_date',
            google_event_id: 'evt_new',
            google_calendar_id: 'cal_1',
            synced_value: '2026-07-24',
        });
    });

    it('creates a timed event for a timestamp source', async () => {
        mockedCalendar.insertEvent.mockResolvedValue({ ok: true, status: 200, data: { id: 'evt_t' } });
        const { supabase } = makeSupabase(null);

        await syncField(baseCtx(supabase), {
            sourceTable: 'milestones',
            sourceId: 'case_1',
            sourceField: 'sign_appointment',
            value: '2026-07-24T14:00:00+08:00',
            allDay: false,
            title: '簽約約 14:00｜AA1258366',
        });

        const payload = mockedCalendar.insertEvent.mock.calls[0][2];
        expect(payload.start.dateTime).toBeDefined();
        expect(payload.start.timeZone).toBe(calendar.CALENDAR_TIME_ZONE);
    });

    it('patches the event and updates synced value when the value changed', async () => {
        mockedCalendar.patchEvent.mockResolvedValue({ ok: true, status: 200, data: { id: 'evt_1' } });
        const { supabase, calls } = makeSupabase({
            id: 'map_1',
            google_event_id: 'evt_1',
            google_calendar_id: 'cal_1',
            synced_value: '2026-08-10',
        });

        await syncField(baseCtx(supabase), {
            sourceTable: 'financials',
            sourceId: 'case_1',
            sourceField: 'house_tax_deadline',
            value: '2026-08-13',
            allDay: true,
            title: '房屋稅截止｜AA1258366',
        });

        expect(mockedCalendar.patchEvent).toHaveBeenCalledTimes(1);
        expect(mockedCalendar.insertEvent).not.toHaveBeenCalled();
        expect(calls.update[0]).toMatchObject({ synced_value: '2026-08-13' });
    });

    it('skips entirely when the synced value is unchanged and the Google event still exists', async () => {
        mockedCalendar.getEvent.mockResolvedValue({ ok: true, status: 200, data: { id: 'evt_1' } });
        const { supabase, calls } = makeSupabase({
            id: 'map_1',
            google_event_id: 'evt_1',
            google_calendar_id: 'cal_1',
            synced_value: '2026-07-24T09:00:00+08:00',
        });

        await syncField(baseCtx(supabase), {
            sourceTable: 'todos',
            sourceId: 'todo_1',
            sourceField: 'due_date',
            value: '2026-07-24T09:00:00+08:00',
            allDay: false,
            title: '待辦：核對謄本｜AA1258366',
        });

        expect(mockedCalendar.getEvent).toHaveBeenCalledWith('tok', 'cal_1', 'evt_1');
        expect(mockedCalendar.insertEvent).not.toHaveBeenCalled();
        expect(mockedCalendar.patchEvent).not.toHaveBeenCalled();
        expect(calls.update).toHaveLength(0);
        expect(calls.upsert).toHaveLength(0);
    });

    it('recreates the event when skip would apply but Google returns 404', async () => {
        mockedCalendar.getEvent.mockResolvedValue({ ok: false, status: 404, error: 'Not Found' });
        mockedCalendar.insertEvent.mockResolvedValue({ ok: true, status: 200, data: { id: 'evt_new' } });
        const { supabase, calls } = makeSupabase({
            id: 'map_1',
            google_event_id: 'evt_1',
            google_calendar_id: 'cal_1',
            synced_value: '2026-07-24T09:00:00+08:00',
        });

        await syncField(baseCtx(supabase), {
            sourceTable: 'todos',
            sourceId: 'todo_1',
            sourceField: 'due_date',
            value: '2026-07-24T09:00:00+08:00',
            allDay: false,
            title: '待辦：核對謄本｜AA1258366',
        });

        expect(mockedCalendar.insertEvent).toHaveBeenCalledTimes(1);
        expect(calls.update[0]).toMatchObject({
            google_event_id: 'evt_new',
            google_calendar_id: 'cal_1',
        });
    });

    it('recreates the event when mapping points at a replaced sub-calendar id', async () => {
        mockedCalendar.insertEvent.mockResolvedValue({ ok: true, status: 200, data: { id: 'evt_new' } });
        const { supabase, calls } = makeSupabase({
            id: 'map_1',
            google_event_id: 'evt_1',
            google_calendar_id: 'cal_old',
            synced_value: '2026-07-24',
        });

        await syncField(baseCtx(supabase), {
            sourceTable: 'milestones',
            sourceId: 'case_1',
            sourceField: 'seal_date',
            value: '2026-07-24',
            allDay: true,
            title: '用印｜AA1258366',
        });

        expect(mockedCalendar.getEvent).not.toHaveBeenCalled();
        expect(mockedCalendar.insertEvent).toHaveBeenCalledWith('tok', 'cal_1', expect.any(Object));
        expect(calls.update[0]).toMatchObject({ google_calendar_id: 'cal_1', google_event_id: 'evt_new' });
    });

    it('deletes the event and mapping when the value is cleared', async () => {
        mockedCalendar.deleteEvent.mockResolvedValue({ ok: true, status: 204 });
        const { supabase, calls } = makeSupabase({
            id: 'map_1',
            google_event_id: 'evt_1',
            google_calendar_id: 'cal_1',
            synced_value: '2026-07-24',
        });

        await syncField(baseCtx(supabase), {
            sourceTable: 'milestones',
            sourceId: 'case_1',
            sourceField: 'seal_date',
            value: null,
            allDay: true,
            title: '用印｜林淑萍/連俊麒 AA1258366',
        });

        expect(mockedCalendar.deleteEvent).toHaveBeenCalledWith('tok', 'cal_1', 'evt_1');
        expect(calls.deletedIds).toEqual(['map_1']);
    });

    it('recreates the event when patch returns 404 (event removed on Google side)', async () => {
        mockedCalendar.patchEvent.mockResolvedValue({ ok: false, status: 404 });
        mockedCalendar.insertEvent.mockResolvedValue({ ok: true, status: 200, data: { id: 'evt_re' } });
        const { supabase, calls } = makeSupabase({
            id: 'map_1',
            google_event_id: 'evt_gone',
            google_calendar_id: 'cal_1',
            synced_value: '2026-08-10',
        });

        await syncField(baseCtx(supabase), {
            sourceTable: 'financials',
            sourceId: 'case_1',
            sourceField: 'house_tax_deadline',
            value: '2026-08-13',
            allDay: true,
            title: '房屋稅截止｜AA1258366',
        });

        expect(mockedCalendar.insertEvent).toHaveBeenCalledTimes(1);
        expect(calls.update[0]).toMatchObject({ google_event_id: 'evt_re', synced_value: '2026-08-13' });
    });

    it('throws CalendarAuthError when the API returns 403 insufficient scope', async () => {
        mockedCalendar.insertEvent.mockResolvedValue({ ok: false, status: 403, error: 'insufficient' });
        const { supabase } = makeSupabase(null);

        await expect(
            syncField(baseCtx(supabase), {
                sourceTable: 'milestones',
                sourceId: 'case_1',
                sourceField: 'seal_date',
                value: '2026-07-24',
                allDay: true,
                title: 'T',
            })
        ).rejects.toBeInstanceOf(CalendarAuthError);
    });
});

describe('provisionCaseCalendar', () => {
    it('reuses a stored calendar id that still exists', async () => {
        mockedCalendar.getCalendar.mockResolvedValue({ ok: true, status: 200, data: { id: 'cal_stored' } });
        const { supabase, calls } = makeSupabase({ case_calendar_id: 'cal_stored' });

        const id = await provisionCaseCalendar(supabase, 'u1', 'tok');

        expect(id).toBe('cal_stored');
        expect(mockedCalendar.insertCalendar).not.toHaveBeenCalled();
        expect(calls.upsert).toHaveLength(0);
    });

    it('creates a new calendar when none is stored', async () => {
        mockedCalendar.insertCalendar.mockResolvedValue({ ok: true, status: 200, data: { id: 'cal_new' } });
        const { supabase, calls } = makeSupabase({ case_calendar_id: null });

        const id = await provisionCaseCalendar(supabase, 'u1', 'tok');

        expect(id).toBe('cal_new');
        expect(mockedCalendar.insertCalendar).toHaveBeenCalledTimes(1);
        expect(calls.upsert[0]).toMatchObject({ user_id: 'u1', case_calendar_id: 'cal_new' });
    });

    it('recreates the calendar when the stored id returns 404', async () => {
        mockedCalendar.getCalendar.mockResolvedValue({ ok: false, status: 404 });
        mockedCalendar.insertCalendar.mockResolvedValue({ ok: true, status: 200, data: { id: 'cal_fresh' } });
        const { supabase, calls } = makeSupabase({ case_calendar_id: 'cal_dead' });

        const id = await provisionCaseCalendar(supabase, 'u1', 'tok');

        expect(id).toBe('cal_fresh');
        expect(mockedCalendar.insertCalendar).toHaveBeenCalledTimes(1);
        expect(calls.upsert[0]).toMatchObject({ case_calendar_id: 'cal_fresh' });
    });

    it('throws CalendarAuthError when calendar creation returns 403', async () => {
        mockedCalendar.insertCalendar.mockResolvedValue({ ok: false, status: 403, error: 'insufficient' });
        const { supabase } = makeSupabase({ case_calendar_id: null });

        await expect(provisionCaseCalendar(supabase, 'u1', 'tok')).rejects.toBeInstanceOf(CalendarAuthError);
    });
});
