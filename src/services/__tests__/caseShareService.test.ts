/**
 * TDD: written BEFORE implementation.
 * Covers case-readonly-share task 2.2 — addShare (idempotent) / removeShare / listShares / searchShareableUsers.
 */

import {
    addShare,
    removeShare,
    listShares,
    searchShareableUsers,
    computeIsOwnedByCurrentUser,
} from '@/services/caseShareService';
import * as chatService from '@/lib/chat/chatService';

jest.mock('@/lib/chat/chatService', () => ({
    listChatUsers: jest.fn(),
}));

const mockedChatService = chatService as jest.Mocked<typeof chatService>;

/** Minimal chainable Supabase mock that records insert payloads, matching the pattern in calendarSyncService.test.ts. */
function makeSupabase() {
    const calls = {
        insert: [] as unknown[],
    };
    const supabase = {
        from: jest.fn(() => ({
            insert: (v: unknown) => {
                calls.insert.push(v);
                return Promise.resolve({ data: null, error: null });
            },
        })),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { supabase: supabase as any, calls };
}

describe('addShare', () => {
    it('inserts a case_shares row with case_id, shared_with, shared_by', async () => {
        const { supabase, calls } = makeSupabase();

        await addShare(supabase, 'case_1', 'user_b', 'user_a');

        expect(calls.insert).toHaveLength(1);
        expect(calls.insert[0]).toMatchObject({ case_id: 'case_1', shared_with: 'user_b', shared_by: 'user_a' });
    });

    it('is idempotent: does not throw when the row already exists (unique violation 23505)', async () => {
        const supabase = {
            from: jest.fn(() => ({
                insert: () => Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate key' } }),
            })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        await expect(addShare(supabase, 'case_1', 'user_b', 'user_a')).resolves.toBeUndefined();
    });

    it('rethrows non-duplicate errors (e.g. RLS rejection for a non-owner)', async () => {
        const supabase = {
            from: jest.fn(() => ({
                insert: () => Promise.resolve({ data: null, error: { code: '42501', message: 'permission denied' } }),
            })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        await expect(addShare(supabase, 'case_1', 'user_b', 'user_a')).rejects.toThrow('permission denied');
    });
});

describe('removeShare', () => {
    it('deletes the case_shares row matching case_id and shared_with', async () => {
        const eqCase = jest.fn(() => ({ eq: eqShared }));
        const eqShared = jest.fn(() => Promise.resolve({ data: null, error: null }));
        const supabase = {
            from: jest.fn(() => ({ delete: () => ({ eq: eqCase }) })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        await removeShare(supabase, 'case_1', 'user_b');

        expect(eqCase).toHaveBeenCalledWith('case_id', 'case_1');
        expect(eqShared).toHaveBeenCalledWith('shared_with', 'user_b');
    });

    it('throws when the database rejects the delete (e.g. non-owner via RLS)', async () => {
        const supabase = {
            from: jest.fn(() => ({
                delete: () => ({
                    eq: () => ({
                        eq: () => Promise.resolve({ data: null, error: { code: '42501', message: 'permission denied' } }),
                    }),
                }),
            })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        await expect(removeShare(supabase, 'case_1', 'user_b')).rejects.toThrow('permission denied');
    });
});

describe('listShares', () => {
    it('returns the shares for a case', async () => {
        const rows = [{ id: 's1', case_id: 'case_1', shared_with: 'user_b', shared_by: 'user_a', created_at: '2026-07-12T00:00:00Z' }];
        const supabase = {
            from: jest.fn(() => ({
                select: () => ({ eq: () => Promise.resolve({ data: rows, error: null }) }),
            })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        const result = await listShares(supabase, 'case_1');

        expect(result).toEqual(rows);
    });
});

describe('searchShareableUsers', () => {
    beforeEach(() => jest.clearAllMocks());

    it('filters listChatUsers by email or name substring match', async () => {
        mockedChatService.listChatUsers.mockResolvedValue([
            { id: 'u1', email: 'alice@example.com', full_name: '愛麗絲' },
            { id: 'u2', email: 'bob@example.com', full_name: '鮑伯' },
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = {} as any;

        const result = await searchShareableUsers(supabase, 'alice');

        expect(result).toEqual([{ id: 'u1', email: 'alice@example.com', full_name: '愛麗絲' }]);
    });

    it('returns all users when query is empty', async () => {
        mockedChatService.listChatUsers.mockResolvedValue([
            { id: 'u1', email: 'alice@example.com', full_name: '愛麗絲' },
            { id: 'u2', email: 'bob@example.com', full_name: '鮑伯' },
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = {} as any;

        const result = await searchShareableUsers(supabase, '');

        expect(result).toHaveLength(2);
    });
});

describe('computeIsOwnedByCurrentUser', () => {
    it('returns true when the case user_id matches the current user (owner scenario)', () => {
        expect(computeIsOwnedByCurrentUser('user_a', 'user_a')).toBe(true);
    });

    it('returns false when the case user_id differs from the current user (shared user scenario)', () => {
        expect(computeIsOwnedByCurrentUser('user_a', 'user_b')).toBe(false);
    });

    it('returns false when the case user_id is null or undefined', () => {
        expect(computeIsOwnedByCurrentUser(null, 'user_b')).toBe(false);
        expect(computeIsOwnedByCurrentUser(undefined, 'user_b')).toBe(false);
    });
});
