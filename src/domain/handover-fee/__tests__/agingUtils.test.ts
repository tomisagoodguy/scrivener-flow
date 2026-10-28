/**
 * 遞牌費帳齡計算（spec: Unpaid fee list with aging highlight）
 */
import { ageInDays, agingLevel, todayInTaipei } from '../agingUtils';

describe('todayInTaipei', () => {
    it('UTC 前一天深夜在台灣已是隔天', () => {
        expect(todayInTaipei(new Date('2026-10-27T23:30:00Z'))).toBe('2026-10-28');
    });

    it('UTC 下午在台灣仍是當天', () => {
        expect(todayInTaipei(new Date('2026-10-28T15:59:00Z'))).toBe('2026-10-28');
    });

    it('台灣午夜整點跨日', () => {
        expect(todayInTaipei(new Date('2026-10-28T16:00:00Z'))).toBe('2026-10-29');
    });
});

describe('帳齡邊界（today = 2026-10-28）', () => {
    it.each([
        ['2026-10-28', 0, 'none'],
        ['2026-10-25', 3, 'none'],
        ['2026-10-24', 4, 'orange'],
        ['2026-10-21', 7, 'orange'],
        ['2026-10-20', 8, 'red'],
    ] as const)('%s → %i 天 → %s', (feeDate, age, level) => {
        expect(ageInDays(feeDate, '2026-10-28')).toBe(age);
        expect(agingLevel(age)).toBe(level);
    });

    it('跨月份計算天數', () => {
        expect(ageInDays('2026-09-30', '2026-10-02')).toBe(2);
    });

    it('未來日期不算逾期', () => {
        expect(ageInDays('2026-10-30', '2026-10-28')).toBe(-2);
        expect(agingLevel(-2)).toBe('none');
    });
});
