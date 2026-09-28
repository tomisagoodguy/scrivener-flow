import { useCallback, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { caseService } from '@/services/caseService';
import { useNotification } from '@/hooks/useNotification';

export type OvertimeClaimParty = 'buyer' | 'seller';

export interface UseOvertimeClaimReturn {
    claimed: boolean;
    isUpdating: boolean;
    toggle: () => Promise<void>;
}

/**
 * 案件買方/賣方加班費登打狀態的手動勾選切換。與里程碑/待辦完全獨立，
 * 樂觀更新 + 失敗還原，比照 `useCaseTodos.ts` 的寫法。
 */
export function useOvertimeClaim(
    caseId: string,
    party: OvertimeClaimParty,
    initialClaimed: boolean
): UseOvertimeClaimReturn {
    const [claimed, setClaimed] = useState(initialClaimed);
    const [isUpdating, setIsUpdating] = useState(false);
    const isUpdatingRef = useRef(false);
    const notify = useNotification();

    const toggle = useCallback(async () => {
        if (isUpdatingRef.current) return;

        const newValue = !claimed;
        isUpdatingRef.current = true;
        setIsUpdating(true);
        setClaimed(newValue);

        try {
            const supabase = createClient();
            await caseService.setOvertimeClaimed(supabase, caseId, party, newValue);
        } catch (error: unknown) {
            setClaimed(!newValue);
            notify.error('加班費登打狀態更新失敗', error);
        } finally {
            isUpdatingRef.current = false;
            setIsUpdating(false);
        }
    }, [caseId, party, claimed, notify]);

    return { claimed, isUpdating, toggle };
}
