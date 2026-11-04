/**
 * 歷史當月統計（spec: Monthly history summary）
 */
import { summarizeHistory } from '../historySummary';
import type { HandoverFeeWithNames, SoloHandoverFee } from '../types';

function solo(case_count: number, amount: number | null): SoloHandoverFee {
    return { id: `s${case_count}`, entry_type: 'solo', fee_date: '2026-11-04', object_number: null, case_count, amount, note: null };
}

function exchange(amount: number): HandoverFeeWithNames {
    return {
        id: `e${amount}`,
        entry_type: 'exchange',
        fee_date: '2026-11-04',
        object_number: null,
        payer_scrivener_id: 'a',
        payee_scrivener_id: 'b',
        amount,
        paid_at: null,
        note: null,
        payer_name: '孔協',
        payee_name: '家華',
    };
}

describe('summarizeHistory', () => {
    it('自己遞牌與互遞分開統計，未填金額只計件數', () => {
        expect(summarizeHistory([solo(3, 9000), solo(1, null), exchange(3000), exchange(2000)])).toEqual({
            solo: { cases: 4, amount: 9000 },
            exchange: { records: 2, amount: 5000 },
        });
    });

    it('空清單兩類皆為 0', () => {
        expect(summarizeHistory([])).toEqual({
            solo: { cases: 0, amount: 0 },
            exchange: { records: 0, amount: 0 },
        });
    });
});
