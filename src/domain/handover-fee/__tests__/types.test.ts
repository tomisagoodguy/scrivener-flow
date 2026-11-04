/**
 * 遞牌費新增驗證（spec: Record a handover fee → Example: validation cases）
 */
import { createHandoverFeeSchema, createSoloFeeSchema } from '../types';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';

const valid = {
    fee_date: '2026-10-28',
    object_number: 'A123',
    payer_scrivener_id: A,
    payee_scrivener_id: B,
    amount: 3000,
    note: '',
};

function firstError(input: unknown): string | undefined {
    const r = createHandoverFeeSchema.safeParse(input);
    return r.success ? undefined : r.error.issues[0]?.message;
}

describe('createHandoverFeeSchema', () => {
    it('有效輸入通過，物件編號去除前後空白', () => {
        const r = createHandoverFeeSchema.safeParse({ ...valid, object_number: '  A123 ' });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.object_number).toBe('A123');
    });

    it.each([
        ['只有空白', '   '],
        ['空字串', ''],
        ['未提供', undefined],
    ])('物件編號%s → 通過並存成 null', (_label, objectNumber) => {
        const r = createHandoverFeeSchema.safeParse({ ...valid, object_number: objectNumber });
        expect(r.success).toBe(true);
        if (r.success) expect(r.data.object_number).toBeNull();
    });

    it.each([
        ['付款人與收款人相同', { payee_scrivener_id: A }, '付款人與收款人不可相同'],
        ['金額 0', { amount: 0 }, '金額必須是正整數'],
        ['金額 -500', { amount: -500 }, '金額必須是正整數'],
        ['金額 1500.5', { amount: 1500.5 }, '金額必須是正整數'],
        ['缺付款人', { payer_scrivener_id: '' }, '請選擇付款人'],
        ['缺收款人', { payee_scrivener_id: '' }, '請選擇收款人'],
        ['日期格式錯誤', { fee_date: '2026/10/28' }, '日期格式錯誤'],
        ['不存在的日期', { fee_date: '2026-13-45' }, '日期格式錯誤'],
        ['2 月 30 日', { fee_date: '2026-02-30' }, '日期格式錯誤'],
        ['付款人 id 非 uuid', { payer_scrivener_id: 'abc' }, '付款人資料錯誤'],
        ['收款人 id 非 uuid', { payee_scrivener_id: 'abc' }, '收款人資料錯誤'],
        ['金額超過上限', { amount: 100_000_000 }, '金額過大'],
    ])('%s → 拒絕', (_label, patch, message) => {
        expect(firstError({ ...valid, ...patch })).toBe(message);
    });
});

/** spec: Record a solo handover entry → Example: solo validation cases */
describe('createSoloFeeSchema', () => {
    const solo = { fee_date: '2026-11-04', object_number: '', case_count: 1, amount: null, note: '' };

    it.each([
        ['件數 0', { case_count: 0 }, '件數必須是正整數'],
        ['件數 -1', { case_count: -1 }, '件數必須是正整數'],
        ['件數 1.5', { case_count: 1.5 }, '件數必須是正整數'],
        ['件數空白', { case_count: Number.NaN }, '件數必須是正整數'],
        ['件數 10000', { case_count: 10000 }, '件數必須是正整數'],
        ['金額 0', { amount: 0 }, '金額必須是正整數'],
        ['金額 1500.5', { amount: 1500.5 }, '金額必須是正整數'],
        ['金額超過上限', { amount: 100_000_000 }, '金額過大'],
        ['日期格式錯誤', { fee_date: '2026/11/04' }, '日期格式錯誤'],
    ])('%s → 拒絕', (_label, patch, message) => {
        const r = createSoloFeeSchema.safeParse({ ...solo, ...patch });
        expect(r.success ? undefined : r.error.issues[0]?.message).toBe(message);
    });

    it('件數 1、金額空白 → 通過且金額為 null', () => {
        const r = createSoloFeeSchema.safeParse(solo);
        expect(r.success).toBe(true);
        if (r.success) {
            expect(r.data.amount).toBeNull();
            expect(r.data.object_number).toBeNull();
        }
    });

    it('件數 3、金額 9000 → 通過', () => {
        const r = createSoloFeeSchema.safeParse({ ...solo, case_count: 3, amount: 9000 });
        expect(r.success).toBe(true);
        if (r.success) {
            expect(r.data.case_count).toBe(3);
            expect(r.data.amount).toBe(9000);
        }
    });

    it('件數上限 9999 通過', () => {
        expect(createSoloFeeSchema.safeParse({ ...solo, case_count: 9999 }).success).toBe(true);
    });
});
