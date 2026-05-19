import { findFollowerByDisplayName } from '@/lib/lineFollowerService';

const mockMaybeSingle = jest.fn();
const mockLimit = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockIlike = jest.fn(() => ({ limit: mockLimit }));
const mockEqActive = jest.fn(() => ({ ilike: mockIlike }));
const mockSelect = jest.fn(() => ({ eq: mockEqActive }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock('@/lib/supabase/service', () => ({
    getAdminClient: () => ({ from: mockFrom }),
}));

describe('findFollowerByDisplayName', () => {
    beforeEach(() => jest.clearAllMocks());

    it('returns user_id when display_name matches exactly', async () => {
        mockMaybeSingle.mockResolvedValue({ data: { user_id: 'Uabc123' }, error: null });
        const result = await findFollowerByDisplayName('Alice');
        expect(result).toBe('Uabc123');
        expect(mockIlike).toHaveBeenCalledWith('display_name', 'Alice');
    });

    it('returns user_id when display_name differs in case', async () => {
        mockMaybeSingle.mockResolvedValue({ data: { user_id: 'Uabc123' }, error: null });
        // ilike is case-insensitive at DB level; we just verify the query is issued with ilike
        const result = await findFollowerByDisplayName('alice');
        expect(result).toBe('Uabc123');
        expect(mockIlike).toHaveBeenCalledWith('display_name', 'alice');
    });

    it('returns null when no active record exists', async () => {
        mockMaybeSingle.mockResolvedValue({ data: null, error: null });
        const result = await findFollowerByDisplayName('Nobody');
        expect(result).toBeNull();
    });
});
