/**
 * TDD: written BEFORE implementation.
 * Covers case-overtime-claim-toggle task 3.1 — setOvertimeClaimed.
 */

import { caseService } from '@/services/caseService';

describe('setOvertimeClaimed', () => {
    it('updates buyer_overtime_claimed to true when party is "buyer"', async () => {
        const eqMock = jest.fn(() => Promise.resolve({ data: null, error: null }));
        const updateMock = jest.fn(() => ({ eq: eqMock }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = { from: jest.fn(() => ({ update: updateMock })) } as any;

        await caseService.setOvertimeClaimed(supabase, 'case_1', 'buyer', true);

        expect(supabase.from).toHaveBeenCalledWith('cases');
        expect(updateMock).toHaveBeenCalledWith({ buyer_overtime_claimed: true });
        expect(eqMock).toHaveBeenCalledWith('id', 'case_1');
    });

    it('updates seller_overtime_claimed to false when party is "seller"', async () => {
        const eqMock = jest.fn(() => Promise.resolve({ data: null, error: null }));
        const updateMock = jest.fn(() => ({ eq: eqMock }));
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const supabase = { from: jest.fn(() => ({ update: updateMock })) } as any;

        await caseService.setOvertimeClaimed(supabase, 'case_1', 'seller', false);

        expect(updateMock).toHaveBeenCalledWith({ seller_overtime_claimed: false });
    });

    it('throws when the database rejects the update (e.g. RLS denial for a non-owner)', async () => {
        const supabase = {
            from: jest.fn(() => ({
                update: () => ({
                    eq: () => Promise.resolve({ data: null, error: { code: '42501', message: 'permission denied' } }),
                }),
            })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any;

        await expect(caseService.setOvertimeClaimed(supabase, 'case_1', 'buyer', true)).rejects.toThrow(
            'permission denied'
        );
    });
});
