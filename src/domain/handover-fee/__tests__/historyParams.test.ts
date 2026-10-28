/**
 * 歷史篩選 URL 參數正規化（spec: Handover fee history with filters）
 * 不合法的 month / scrivener 退回預設值，而不是讓整個歷史區塊變成錯誤訊息
 */
import { isNavigableMonth, normalizeHistoryParams } from '../historyParams';

const A = '11111111-1111-4111-8111-111111111111';
const NOW = new Date('2026-10-29T02:00:00Z');

describe('normalizeHistoryParams', () => {
    it.each([
        ['合法參數保留', '2026-09', A, { month: '2026-09', scrivenerId: A }],
        ['未提供 → 本月、全部', undefined, undefined, { month: '2026-10', scrivenerId: '' }],
        ['月份不合法 → 本月', '2026-13', A, { month: '2026-10', scrivenerId: A }],
        ['地政士非 uuid → 全部', '2026-09', 'abc', { month: '2026-09', scrivenerId: '' }],
        ['注入字串 → 全部', '2026-09', `${A},deleted_at.not.is.null`, { month: '2026-09', scrivenerId: '' }],
    ])('%s', (_label, month, scrivener, expected) => {
        expect(normalizeHistoryParams(month, scrivener, NOW)).toEqual(expected);
    });
});

describe('isNavigableMonth', () => {
    it.each([
        ['2026-10', true],
        ['1900-01', true],
        ['0202-10', false],
        ['2026-13', false],
        ['', false],
    ])('%s → %s', (value, expected) => {
        expect(isNavigableMonth(value)).toBe(expected);
    });
});
