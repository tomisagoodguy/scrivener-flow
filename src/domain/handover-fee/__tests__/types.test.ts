/**
 * 遞牌費新增驗證（spec: Record a handover fee → Example: validation cases）
 */
import { createHandoverFeeSchema } from '../types';

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
        ['付款人與收款人相同', { payee_scrivener_id: A }, '付款人與收款人不可相同'],
        ['金額 0', { amount: 0 }, '金額必須是正整數'],
        ['金額 -500', { amount: -500 }, '金額必須是正整數'],
        ['金額 1500.5', { amount: 1500.5 }, '金額必須是正整數'],
        ['物件編號只有空白', { object_number: '   ' }, '請輸入物件編號'],
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
