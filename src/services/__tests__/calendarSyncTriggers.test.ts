/**
 * Tests for task 6.3 — Automatic sync on data changes must NOT break the
 * originating save: when the calendar sync action throws, caseService.update
 * and the todoService mutations still resolve successfully.
 */

import { caseService } from '@/services/caseService';
import { todoService } from '@/services/todoService';
import { syncCaseToCalendar, syncTodoToCalendar } from '@/app/actions/calendarSync';

jest.mock('@/app/actions/calendarSync', () => ({
    syncCaseToCalendar: jest.fn(),
    syncTodoToCalendar: jest.fn(),
}));

const mockedSyncCase = syncCaseToCalendar as jest.Mock;
const mockedSyncTodo = syncTodoToCalendar as jest.Mock;

beforeEach(() => {
    jest.clearAllMocks();
    mockedSyncCase.mockRejectedValue(new Error('calendar boom'));
    mockedSyncTodo.mockRejectedValue(new Error('calendar boom'));
});

/** Chainable mock for caseService.updateCaseComplete (insert path, no existing rows). */
function caseSupabase() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {};
    chain.update = () => chain;
    chain.insert = () => Promise.resolve({ error: null });
    chain.select = () => chain;
    chain.eq = () => chain;
    chain.maybeSingle = () => Promise.resolve({ data: null, error: null });
    chain.then = (r: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(r);
    return { from: jest.fn(() => chain) };
}

/** Chainable mock for todoService mutations. */
function todoSupabase() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain: any = {};
    chain.insert = () => chain;
    chain.select = () => chain;
    chain.single = () => Promise.resolve({ data: { id: 't1' }, error: null });
    chain.update = () => chain;
    chain.delete = () => chain;
    chain.eq = () => chain;
    chain.then = (r: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(r);
    return { from: jest.fn(() => chain) };
}

describe('caseService.updateCaseComplete — sync failure isolation', () => {
    it('still resolves when calendar sync throws', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = caseSupabase() as any;
        const data: Record<string, FormDataEntryValue> = { case_number: 'AA1', seal_date: '2026-07-24' };

        const result = await caseService.updateCaseComplete(supabase, 'case_1', data, 'notes', 'private');

        expect(result.milestoneData.seal_date).toBe('2026-07-24');
        expect(mockedSyncCase).toHaveBeenCalledWith('case_1');
    });
});

describe('todoService — sync failure isolation', () => {
    it('createTodo resolves when calendar sync throws', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = todoSupabase() as any;
        await expect(
            todoService.createTodo(supabase, {
                user_id: 'u1',
                content: 'x',
                due_date: '2026-07-24T09:00:00+08:00',
                source_type: 'manual',
                is_completed: false,
                priority: 'normal',
            })
        ).resolves.toBeUndefined();
        expect(mockedSyncTodo).toHaveBeenCalledWith('t1');
    });

    it('toggleTodo resolves when calendar sync throws', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = todoSupabase() as any;
        await expect(todoService.toggleTodo(supabase, 't9', false)).resolves.toBeUndefined();
        expect(mockedSyncTodo).toHaveBeenCalledWith('t9');
    });

    it('deleteTodo resolves when calendar sync throws', async () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = todoSupabase() as any;
        await expect(todoService.deleteTodo(supabase, 't9')).resolves.toBeUndefined();
        expect(mockedSyncTodo).toHaveBeenCalledWith('t9');
    });
});
