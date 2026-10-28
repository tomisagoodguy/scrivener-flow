/**
 * Tests for handoverFees server actions.
 *
 * 涵蓋：
 *  1. createHandoverFee：未登入拒絕、Zod 驗證失敗不寫入、成功寫入 user_id 與未收狀態、DB 錯誤回傳
 *  2. setHandoverFeePaid / deleteHandoverFee：paid_at / deleted_at 寫入值
 *  3. addScrivener：空白拒絕、active 同名拒絕、已隱藏同名還原、新名 sort_order = 最大值 + 1
 *  4. listUnpaidFees / listFeeHistory：查詢條件、排序方向、地政士 or 篩選、JOIN 姓名攤平
 */

const mockGetUser = jest.fn();
const mockFrom = jest.fn();
const mockRpc = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        auth: { getUser: mockGetUser },
        from: mockFrom,
        rpc: mockRpc,
    }),
}));
jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }));

import {
    addScrivener,
    archiveScrivener,
    createHandoverFee,
    deleteHandoverFee,
    listFeeHistory,
    listScrivenersWithDefaults,
    listUnpaidFees,
    setHandoverFeePaid,
} from '../handoverFees';

type Call = [string, unknown[]];

/** 可鏈式呼叫、await 時回傳 result 的查詢 builder，並記錄每一步呼叫 */
function makeBuilder(result: { data?: unknown; error?: unknown }) {
    const calls: Call[] = [];
    const builder: Record<string, unknown> = {};
    ['select', 'insert', 'update', 'eq', 'is', 'not', 'or', 'gte', 'lt', 'order', 'ilike', 'in'].forEach((m) => {
        builder[m] = jest.fn((...args: unknown[]) => {
            calls.push([m, args]);
            return builder;
        });
    });
    builder.maybeSingle = jest.fn(() => Promise.resolve({ data: result.data ?? null, error: result.error ?? null }));
    builder.then = (resolve: (v: unknown) => unknown) =>
        resolve({ data: result.data ?? null, error: result.error ?? null });
    return { builder, calls };
}

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const validInput = {
    fee_date: '2026-10-28',
    object_number: 'A123',
    payer_scrivener_id: A,
    payee_scrivener_id: B,
    amount: 3000,
};

beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
});

describe('createHandoverFee', () => {
    it('未登入回 Unauthorized，不查 DB', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });
        expect(await createHandoverFee(validInput)).toEqual({ success: false, error: 'Unauthorized' });
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('驗證失敗不寫入並回傳錯誤訊息', async () => {
        const result = await createHandoverFee({ ...validInput, payee_scrivener_id: A });
        expect(result).toEqual({ success: false, error: '付款人與收款人不可相同' });
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('成功寫入 user_id、trim 後物件編號、未收狀態', async () => {
        const check = makeBuilder({ data: [{ id: A }, { id: B }] });
        const { builder, calls } = makeBuilder({});
        mockFrom.mockReturnValueOnce(check.builder).mockReturnValueOnce(builder);

        const result = await createHandoverFee({ ...validInput, object_number: ' A123 ', note: '' });
        expect(result).toEqual({ success: true });
        expect(mockFrom).toHaveBeenNthCalledWith(1, 'scriveners');
        expect(check.calls).toContainEqual(['is', ['archived_at', null]]);
        expect(check.calls).toContainEqual(['in', ['id', [A, B]]]);
        expect(mockFrom).toHaveBeenNthCalledWith(2, 'handover_fees');
        expect(calls[0]).toEqual([
            'insert',
            [
                {
                    user_id: 'u1',
                    fee_date: '2026-10-28',
                    object_number: 'A123',
                    payer_scrivener_id: A,
                    payee_scrivener_id: B,
                    amount: 3000,
                    note: null,
                    paid_at: null,
                },
            ],
        ]);
    });

    it('付款人或收款人已隱藏或不屬於本人 → 拒絕且不寫入', async () => {
        mockFrom.mockReturnValueOnce(makeBuilder({ data: [{ id: B }] }).builder);
        expect(await createHandoverFee(validInput)).toEqual({
            success: false,
            error: '付款人或收款人不在使用中的名單，請重新選擇',
        });
        expect(mockFrom).toHaveBeenCalledTimes(1);
    });

    it('DB 錯誤回傳錯誤', async () => {
        mockFrom
            .mockReturnValueOnce(makeBuilder({ data: [{ id: A }, { id: B }] }).builder)
            .mockReturnValueOnce(makeBuilder({ error: { message: 'violates foreign key constraint' } }).builder);
        expect(await createHandoverFee(validInput)).toEqual({
            success: false,
            error: 'violates foreign key constraint',
        });
    });
});

describe('setHandoverFeePaid / deleteHandoverFee', () => {
    it('標記已收寫入非 null 的 paid_at，且只改未刪除的列', async () => {
        const { builder, calls } = makeBuilder({ data: [{ id: 'f1' }] });
        mockFrom.mockReturnValue(builder);
        expect(await setHandoverFeePaid('f1', true)).toEqual({ success: true });
        const payload = calls[0][1][0] as { paid_at: string | null };
        expect(typeof payload.paid_at).toBe('string');
        expect(calls).toContainEqual(['eq', ['id', 'f1']]);
        expect(calls).toContainEqual(['is', ['deleted_at', null]]);
    });

    it('改回未收寫入 null', async () => {
        const { builder, calls } = makeBuilder({ data: [{ id: 'f1' }] });
        mockFrom.mockReturnValue(builder);
        await setHandoverFeePaid('f1', false);
        expect(calls[0]).toEqual(['update', [{ paid_at: null }]]);
    });

    it('刪除為軟刪除，寫入 deleted_at', async () => {
        const { builder, calls } = makeBuilder({ data: [{ id: 'f1' }] });
        mockFrom.mockReturnValue(builder);
        expect(await deleteHandoverFee('f1')).toEqual({ success: true });
        const payload = calls[0][1][0] as { deleted_at: string };
        expect(calls[0][0]).toBe('update');
        expect(typeof payload.deleted_at).toBe('string');
        expect(calls).toContainEqual(['is', ['deleted_at', null]]);
    });

    it.each([
        ['setHandoverFeePaid', () => setHandoverFeePaid('missing', true)],
        ['deleteHandoverFee', () => deleteHandoverFee('missing')],
        ['archiveScrivener', () => archiveScrivener('missing')],
    ])('%s：影響 0 列時回「找不到紀錄」', async (_name, run) => {
        mockFrom.mockReturnValue(makeBuilder({ data: [] }).builder);
        expect(await run()).toEqual({ success: false, error: '找不到紀錄，請重新整理' });
    });
});

describe('addScrivener / archiveScrivener', () => {
    it('trim 後空字串拒絕', async () => {
        expect(await addScrivener('   ')).toEqual({ success: false, error: '請輸入地政士姓名' });
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('active 同名拒絕', async () => {
        mockFrom.mockReturnValueOnce(makeBuilder({ data: { id: 's1', archived_at: null } }).builder);
        expect(await addScrivener('家華')).toEqual({ success: false, error: '已有同名地政士' });
    });

    it('已隱藏同名 → 還原（清除 archived_at），不新增', async () => {
        const lookup = makeBuilder({ data: { id: 's7', archived_at: '2026-10-01T00:00:00Z' } });
        const restore = makeBuilder({});
        mockFrom.mockReturnValueOnce(lookup.builder).mockReturnValueOnce(restore.builder);

        expect(await addScrivener(' 來慶 ')).toEqual({ success: true });
        expect(lookup.calls).toContainEqual(['eq', ['name', '來慶']]);
        expect(restore.calls[0]).toEqual(['update', [{ archived_at: null }]]);
        expect(restore.calls).toContainEqual(['eq', ['id', 's7']]);
    });

    it('新名 → sort_order 取最大值 + 1', async () => {
        const lookup = makeBuilder({ data: null });
        const maxOrder = makeBuilder({ data: [{ sort_order: 6 }] });
        const insert = makeBuilder({});
        mockFrom
            .mockReturnValueOnce(lookup.builder)
            .mockReturnValueOnce(maxOrder.builder)
            .mockReturnValueOnce(insert.builder);

        expect(await addScrivener('志明')).toEqual({ success: true });
        expect(insert.calls[0]).toEqual(['insert', [{ user_id: 'u1', name: '志明', sort_order: 7 }]]);
    });

    it('名單為空時新名 sort_order = 0', async () => {
        mockFrom
            .mockReturnValueOnce(makeBuilder({ data: null }).builder)
            .mockReturnValueOnce(makeBuilder({ data: [] }).builder);
        const insert = makeBuilder({});
        mockFrom.mockReturnValueOnce(insert.builder);

        await addScrivener('志明');
        expect(insert.calls[0]).toEqual(['insert', [{ user_id: 'u1', name: '志明', sort_order: 0 }]]);
    });

    it('同時新增同名撞到唯一索引（23505）→ 友善訊息', async () => {
        mockFrom
            .mockReturnValueOnce(makeBuilder({ data: null }).builder)
            .mockReturnValueOnce(makeBuilder({ data: [] }).builder)
            .mockReturnValueOnce(
                makeBuilder({ error: { code: '23505', message: 'duplicate key value violates unique constraint' } }).builder
            );
        expect(await addScrivener('志明')).toEqual({ success: false, error: '已有同名地政士' });
    });

    it('隱藏寫入 archived_at', async () => {
        const { builder, calls } = makeBuilder({ data: [{ id: 's1' }] });
        mockFrom.mockReturnValue(builder);
        expect(await archiveScrivener('s1')).toEqual({ success: true });
        const payload = calls[0][1][0] as { archived_at: string };
        expect(typeof payload.archived_at).toBe('string');
    });
});

describe('listScrivenersWithDefaults', () => {
    it('先呼叫 ensure_default_scriveners 再讀名單', async () => {
        mockRpc.mockResolvedValue({ error: null });
        const rows = [{ id: A, name: '孔協', sort_order: 0, archived_at: null }];
        const { builder, calls } = makeBuilder({ data: rows });
        mockFrom.mockReturnValue(builder);

        expect(await listScrivenersWithDefaults()).toEqual({ success: true, data: rows });
        expect(mockRpc).toHaveBeenCalledWith('ensure_default_scriveners');
        expect(calls).toContainEqual(['order', ['sort_order', { ascending: true }]]);
    });

    it('RPC 失敗回傳錯誤', async () => {
        mockRpc.mockResolvedValue({ error: { message: 'rpc boom' } });
        expect(await listScrivenersWithDefaults()).toEqual({ success: false, error: 'rpc boom' });
    });
});

describe('listUnpaidFees / listFeeHistory', () => {
    const joined = {
        id: 'f1',
        fee_date: '2026-10-12',
        object_number: 'B456',
        payer_scrivener_id: B,
        payee_scrivener_id: A,
        amount: 2000,
        paid_at: null,
        note: null,
        payer: [{ name: '定康' }],
        payee: { name: '孔協' },
    };

    it('未收：排除已收與已刪除，日期由舊到新，姓名攤平（JOIN 陣列或物件皆可）', async () => {
        const { builder, calls } = makeBuilder({ data: [joined] });
        mockFrom.mockReturnValue(builder);

        const result = await listUnpaidFees();
        expect(calls).toContainEqual(['is', ['paid_at', null]]);
        expect(calls).toContainEqual(['is', ['deleted_at', null]]);
        expect(calls).toContainEqual(['order', ['fee_date', { ascending: true }]]);
        expect(result).toEqual({
            success: true,
            data: [
                {
                    id: 'f1',
                    fee_date: '2026-10-12',
                    object_number: 'B456',
                    payer_scrivener_id: B,
                    payee_scrivener_id: A,
                    amount: 2000,
                    paid_at: null,
                    note: null,
                    payer_name: '定康',
                    payee_name: '孔協',
                },
            ],
        });
    });

    it('歷史：月份區間、日期由新到舊、地政士 payer 或 payee 篩選', async () => {
        const { builder, calls } = makeBuilder({ data: [] });
        mockFrom.mockReturnValue(builder);

        await listFeeHistory({ month: '2026-10', scrivenerId: A });
        expect(calls).toContainEqual(['gte', ['fee_date', '2026-10-01']]);
        expect(calls).toContainEqual(['lt', ['fee_date', '2026-11-01']]);
        expect(calls).toContainEqual(['is', ['deleted_at', null]]);
        expect(calls).toContainEqual(['order', ['fee_date', { ascending: false }]]);
        expect(calls).toContainEqual(['or', [`payer_scrivener_id.eq.${A},payee_scrivener_id.eq.${A}`]]);
    });

    it('歷史：12 月跨年', async () => {
        const { builder, calls } = makeBuilder({ data: [] });
        mockFrom.mockReturnValue(builder);
        await listFeeHistory({ month: '2026-12' });
        expect(calls).toContainEqual(['lt', ['fee_date', '2027-01-01']]);
        expect(calls.some(([m]) => m === 'or')).toBe(false);
    });

    it('歷史：非 uuid 的地政士 id 與錯誤月份拒絕（防 filter 注入）', async () => {
        expect(await listFeeHistory({ month: '2026-10', scrivenerId: 'x,deleted_at.not.is.null' })).toEqual({
            success: false,
            error: '地政士參數錯誤',
        });
        expect(await listFeeHistory({ month: '2026-13' })).toEqual({ success: false, error: '月份格式錯誤' });
        expect(mockFrom).not.toHaveBeenCalled();
    });
});
