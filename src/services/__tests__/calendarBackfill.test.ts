/**
 * Tests for backfillAll (task 7.2).
 *
 * Uses the REAL syncCase / syncTodo / syncField with mocked calendar network
 * functions and a stateful in-memory Supabase mock that persists mappings
 * across runs, so idempotency is genuinely exercised:
 *   - first run creates events for every non-null source field
 *   - second run with unchanged data creates NO new events (no Google API call)
 *   - only active todos (is_deleted=false, is_completed=false) are synced
 */

import * as calendar from '@/lib/google/calendar';
import { backfillAll, type SyncContext } from '@/services/calendarSyncService';

jest.mock('@/lib/supabase/server', () => ({ createClient: jest.fn() }));
jest.mock('@/app/actions/googleDrive', () => ({ getAccessToken: jest.fn() }));
jest.mock('@/lib/google/calendar', () => {
    const actual = jest.requireActual('@/lib/google/calendar');
    return {
        ...actual,
        insertCalendar: jest.fn(),
        getCalendar: jest.fn(),
        insertEvent: jest.fn(),
        patchEvent: jest.fn(),
        deleteEvent: jest.fn(),
    };
});

const mockedCalendar = calendar as jest.Mocked<typeof calendar>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rows = Record<string, any>[];

/** Stateful Supabase mock supporting the queries backfill/syncCase/syncTodo issue. */
function makeStatefulSupabase(store: Record<string, Rows>) {
    function filtersMatch(row: Record<string, unknown>, filters: [string, unknown][]) {
        return filters.every(([c, v]) => row[c] === v);
    }

    function build(table: string) {
        const filters: [string, unknown][] = [];
        let op: 'select' | 'update' | 'delete' = 'select';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let updateVals: any = null;

        const rowsFor = () => (store[table] ?? []).filter((r) => filtersMatch(r, filters));

        const resolveList = () => Promise.resolve({ data: rowsFor(), error: null });
        const resolveSingle = () => Promise.resolve({ data: rowsFor()[0] ?? null, error: null });

        const runTerminal = () => {
            if (op === 'update') {
                rowsFor().forEach((r) => Object.assign(r, updateVals));
                return Promise.resolve({ data: null, error: null });
            }
            if (op === 'delete') {
                store[table] = (store[table] ?? []).filter((r) => !filtersMatch(r, filters));
                return Promise.resolve({ data: null, error: null });
            }
            return resolveList();
        };

        const api: Record<string, unknown> = {
            select: () => api,
            order: () => api,
            eq: (c: string, v: unknown) => {
                filters.push([c, v]);
                return api;
            },
            in: (c: string, vals: unknown[]) => {
                // simple: keep rows whose c is in vals — modelled as post-filter
                filters.push([c, vals as unknown]);
                return api;
            },
            maybeSingle: () => resolveSingle(),
            single: () => resolveSingle(),
            update: (vals: unknown) => {
                op = 'update';
                updateVals = vals;
                return api;
            },
            delete: () => {
                op = 'delete';
                return api;
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            upsert: (row: any, opts?: { onConflict?: string }) => {
                const keys = (opts?.onConflict ?? 'id').split(',');
                const list = (store[table] = store[table] ?? []);
                const existing = list.find((r) => keys.every((k) => r[k] === row[k]));
                if (existing) Object.assign(existing, row);
                else list.push({ id: `id_${list.length + 1}`, ...row });
                return Promise.resolve({ data: null, error: null });
            },
            // thenable: awaiting a select-list / update / delete chain
            then: (resolve: (v: unknown) => unknown) => runTerminal().then(resolve),
        };
        return api;
    }

    return { from: jest.fn((table: string) => build(table)) } as unknown as SyncContext['supabase'];
}

function makeCtx(store: Record<string, Rows>): SyncContext {
    return { supabase: makeStatefulSupabase(store), userId: 'u1', token: 'tok', calendarId: 'cal_1' };
}

beforeEach(() => {
    jest.clearAllMocks();
    let counter = 0;
    mockedCalendar.insertEvent.mockImplementation(() =>
        Promise.resolve({ ok: true, status: 200, data: { id: `evt_${++counter}` } })
    );
    mockedCalendar.patchEvent.mockResolvedValue({ ok: true, status: 200, data: { id: 'evt_p' } });
    mockedCalendar.deleteEvent.mockResolvedValue({ ok: true, status: 204 });
});

function seedStore(): Record<string, Rows> {
    return {
        cases: [{ id: 'c1', case_number: 'AA1258366', buyer_name: '林淑萍', seller_name: '連俊麒' }],
        milestones: [
            {
                case_id: 'c1',
                contract_date: null,
                seal_date: '2026-07-24',
                tax_payment_date: null,
                transfer_date: null,
                handover_date: null,
                sign_appointment: null,
                seal_appointment: null,
                tax_appointment: null,
                handover_appointment: null,
            },
        ],
        financials: [
            {
                case_id: 'c1',
                land_value_tax_deadline: null,
                deed_tax_deadline: null,
                land_tax_deadline: null,
                house_tax_deadline: '2026-08-13',
            },
        ],
        todos: [
            { id: 't1', content: '核對謄本', due_date: '2026-07-24T09:00:00+08:00', is_completed: false, is_deleted: false, case_id: 'c1' },
            // excluded: soft-deleted todo must NOT be synced
            { id: 't2', content: '舊待辦', due_date: '2026-07-25T09:00:00+08:00', is_completed: false, is_deleted: true, case_id: 'c1' },
        ],
        user_settings: [{ user_id: 'u1', case_calendar_id: 'cal_1' }],
        calendar_event_mappings: [],
    };
}

describe('backfillAll', () => {
    it('creates one event per non-null source field on first run', async () => {
        const store = seedStore();
        const res = await backfillAll(makeCtx(store));

        expect(res.status).toBe('ok');
        // seal_date + house_tax_deadline + active todo due_date = 3 events
        expect(mockedCalendar.insertEvent).toHaveBeenCalledTimes(3);
        expect(store.calendar_event_mappings).toHaveLength(3);
        // the soft-deleted todo t2 produced no mapping
        const todoMappings = store.calendar_event_mappings.filter((m) => m.source_table === 'todos');
        expect(todoMappings).toHaveLength(1);
        expect(todoMappings[0].source_id).toBe('t1');
    });

    it('is idempotent: a second run with unchanged data makes no Google API calls', async () => {
        const store = seedStore();
        await backfillAll(makeCtx(store)); // run 1
        expect(mockedCalendar.insertEvent).toHaveBeenCalledTimes(3);

        jest.clearAllMocks(); // reset counts, keep store state (mappings persisted)
        const res = await backfillAll(makeCtx(store)); // run 2 — same ctx data, persisted mappings

        expect(res.status).toBe('ok');
        expect(mockedCalendar.insertEvent).not.toHaveBeenCalled();
        expect(mockedCalendar.patchEvent).not.toHaveBeenCalled();
        expect(store.calendar_event_mappings).toHaveLength(3); // no duplicates
    });

    it('deletes events for closed cases and does not create new ones', async () => {
        // A Closed case that was previously synced (mapping exists) must have its
        // event removed; no new event is created.
        const store: Record<string, Rows> = {
            cases: [{ id: 'c1', case_number: 'X1', buyer_name: 'A', seller_name: 'B', status: 'Closed' }],
            milestones: [
                {
                    case_id: 'c1',
                    seal_date: '2026-07-24',
                    contract_date: null,
                    tax_payment_date: null,
                    transfer_date: null,
                    handover_date: null,
                    sign_appointment: null,
                    seal_appointment: null,
                    tax_appointment: null,
                    handover_appointment: null,
                },
            ],
            financials: [
                { case_id: 'c1', land_value_tax_deadline: null, deed_tax_deadline: null, land_tax_deadline: null, house_tax_deadline: null },
            ],
            todos: [],
            user_settings: [{ user_id: 'u1', case_calendar_id: 'cal_1' }],
            calendar_event_mappings: [
                {
                    id: 'm1',
                    user_id: 'u1',
                    source_table: 'milestones',
                    source_id: 'c1',
                    source_field: 'seal_date',
                    google_event_id: 'evt_old',
                    google_calendar_id: 'cal_1',
                    synced_value: '2026-07-24',
                },
            ],
        };

        const res = await backfillAll(makeCtx(store));

        expect(res.status).toBe('ok');
        expect(mockedCalendar.insertEvent).not.toHaveBeenCalled();
        expect(mockedCalendar.deleteEvent).toHaveBeenCalledWith('tok', 'cal_1', 'evt_old');
        expect(store.calendar_event_mappings).toHaveLength(0);
    });

    it('propagates needs_reauth from the injected context', async () => {
        const res = await backfillAll({ status: 'needs_reauth' } as never);
        expect(res.status).toBe('needs_reauth');
    });
});
