/**
 * TDD: written BEFORE implementation.
 * Covers case-overtime-claim-toggle task 3.2 — useOvertimeClaim.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useOvertimeClaim } from '../useOvertimeClaim';

const mockSetOvertimeClaimed = jest.fn();
jest.mock('@/services/caseService', () => ({
    caseService: {
        setOvertimeClaimed: (...args: unknown[]) => mockSetOvertimeClaimed(...args),
    },
}));

jest.mock('@/lib/supabase/client', () => ({
    createClient: () => ({ __mockSupabase: true }),
}));

const mockNotifyError = jest.fn();
jest.mock('@/hooks/useNotification', () => ({
    useNotification: () => ({ error: mockNotifyError, success: jest.fn() }),
}));

describe('useOvertimeClaim', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('initializes claimed state from the initialClaimed argument', () => {
        const { result } = renderHook(() => useOvertimeClaim('case_1', 'buyer', false));
        expect(result.current.claimed).toBe(false);
    });

    it('toggle optimistically flips claimed and calls setOvertimeClaimed with the new value', async () => {
        mockSetOvertimeClaimed.mockResolvedValue(undefined);
        const { result } = renderHook(() => useOvertimeClaim('case_1', 'buyer', false));

        act(() => {
            result.current.toggle();
        });

        expect(result.current.claimed).toBe(true);

        await waitFor(() => expect(mockSetOvertimeClaimed).toHaveBeenCalledTimes(1));
        expect(mockSetOvertimeClaimed).toHaveBeenCalledWith(expect.anything(), 'case_1', 'buyer', true);
    });

    it('toggling seller independently does not affect buyer state (two separate hook instances)', async () => {
        mockSetOvertimeClaimed.mockResolvedValue(undefined);
        const buyer = renderHook(() => useOvertimeClaim('case_1', 'buyer', false));
        const seller = renderHook(() => useOvertimeClaim('case_1', 'seller', true));

        act(() => {
            seller.result.current.toggle();
        });

        expect(seller.result.current.claimed).toBe(false);
        expect(buyer.result.current.claimed).toBe(false);
    });

    it('reverts to the previous state and notifies an error when the update fails', async () => {
        mockSetOvertimeClaimed.mockRejectedValue(new Error('permission denied'));
        const { result } = renderHook(() => useOvertimeClaim('case_1', 'buyer', false));

        act(() => {
            result.current.toggle();
        });

        expect(result.current.claimed).toBe(true);

        await waitFor(() => expect(mockNotifyError).toHaveBeenCalled());
        expect(result.current.claimed).toBe(false);
    });

    it('ignores a toggle call while an update is already in flight', async () => {
        let resolveUpdate: () => void = () => {};
        mockSetOvertimeClaimed.mockReturnValue(
            new Promise<void>((resolve) => {
                resolveUpdate = resolve;
            })
        );
        const { result } = renderHook(() => useOvertimeClaim('case_1', 'buyer', false));

        act(() => {
            result.current.toggle();
        });
        act(() => {
            result.current.toggle();
        });

        expect(mockSetOvertimeClaimed).toHaveBeenCalledTimes(1);

        await act(async () => {
            resolveUpdate();
        });
    });
});
