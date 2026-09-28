'use client';

import { useOvertimeClaim, type OvertimeClaimParty } from '@/hooks/useOvertimeClaim';

interface OvertimeClaimButtonProps {
    caseId: string;
    party: OvertimeClaimParty;
    initialClaimed: boolean;
}

const PARTY_LABEL: Record<OvertimeClaimParty, string> = {
    buyer: '買方',
    seller: '賣方',
};

/**
 * 買方/賣方加班費登打狀態勾選鈕。與蓋印章待辦完全獨立，純粹記錄使用者是否已登打。
 */
export default function OvertimeClaimButton({ caseId, party, initialClaimed }: OvertimeClaimButtonProps) {
    const { claimed, isUpdating, toggle } = useOvertimeClaim(caseId, party, initialClaimed);

    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggle();
            }}
            disabled={isUpdating}
            title={`${PARTY_LABEL[party]}加班費${claimed ? '已登打' : '尚未登打'}，點擊切換`}
            className={`
                text-[10px] font-bold px-1.5 py-0.5 rounded border transition-all whitespace-nowrap
                ${
                    claimed
                        ? 'bg-slate-100 text-slate-400 border-slate-200'
                        : 'bg-amber-500/10 text-amber-600 border-amber-500/30 hover:bg-amber-500 hover:text-white'
                }
                ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
        >
            {claimed ? '✓ 加班費' : '⏳ 加班費'}
        </button>
    );
}
