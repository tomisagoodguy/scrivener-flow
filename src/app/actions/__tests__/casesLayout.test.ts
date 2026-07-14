/**
 * Tests for casesLayout server action.
 *
 * 涵蓋：
 *  1. getCasesLayout()：未登入 / 無資料 / schema 驗證失敗 一律回傳 DEFAULT_CASES_LAYOUT
 *  2. getCasesLayout()：新 widget id 缺席時 union merge 補上（New Widget Migration for Existing Layouts）
 *  3. updateCasesLayout()：合法輸入寫入成功、非法輸入被 Zod 擋下不寫入、未登入拒絕
 */

const mockGetUser = jest.fn();
const mockFrom = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        auth: { getUser: mockGetUser },
        from: mockFrom,
    }),
}));

import { getCasesLayout, updateCasesLayout } from '../casesLayout';
import { DEFAULT_CASES_LAYOUT } from '@/domain/cases/layoutTypes';

function makeSelectBuilder(data: unknown, error: unknown = null) {
    const builder: Record<string, unknown> = {};
    ['select', 'eq'].forEach((m) => {
        builder[m] = jest.fn(() => builder);
    });
    builder.maybeSingle = jest.fn(() => Promise.resolve({ data, error }));
    return builder;
}

function makeUpsertBuilder(error: unknown = null) {
    return { upsert: jest.fn(() => Promise.resolve({ error })) };
}

describe('getCasesLayout', () => {
    beforeEach(() => jest.clearAllMocks());

    it('未登入時回傳 DEFAULT_CASES_LAYOUT', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const result = await getCasesLayout();
        expect(result).toEqual(DEFAULT_CASES_LAYOUT);
    });

    it('已登入但尚無 cases_layout 資料時回傳 DEFAULT_CASES_LAYOUT', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
        mockFrom.mockReturnValue(makeSelectBuilder({ cases_layout: null }));

        const result = await getCasesLayout();
        expect(result).toEqual(DEFAULT_CASES_LAYOUT);
    });

    it('儲存的 cases_layout 不符合 schema 時回傳 DEFAULT_CASES_LAYOUT', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
        mockFrom.mockReturnValue(makeSelectBuilder({ cases_layout: [{ id: 'rapid-input', visible: 'yes', order: 0 }] }));

        const result = await getCasesLayout();
        expect(result).toEqual(DEFAULT_CASES_LAYOUT);
    });

    it('儲存的版面缺少新 widget id 時，union merge 補上並接在最大 order 之後', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
        mockFrom.mockReturnValue(
            makeSelectBuilder({
                cases_layout: [
                    { id: 'export-buttons', visible: true, order: 0 },
                    { id: 'quick-navigator', visible: false, order: 1 },
                ],
            })
        );

        const result = await getCasesLayout();
        const ids = result.map((w) => w.id);
        expect(ids).toEqual(
            expect.arrayContaining([
                'export-buttons',
                'quick-navigator',
                'rapid-input',
                'pipeline-chart',
                'eisenhower-matrix',
            ])
        );
        // 既有項目維持原值
        const quickNav = result.find((w) => w.id === 'quick-navigator')!;
        expect(quickNav.visible).toBe(false);
        expect(quickNav.order).toBe(1);
        // 新補上的項目接在最大 order (1) 之後、皆為可見
        const missing = result.filter((w) => !['export-buttons', 'quick-navigator'].includes(w.id));
        expect(missing.every((w) => w.visible)).toBe(true);
        expect(missing.every((w) => w.order > 1)).toBe(true);
    });
});

describe('updateCasesLayout', () => {
    beforeEach(() => jest.clearAllMocks());

    it('未登入時拒絕寫入', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const result = await updateCasesLayout(DEFAULT_CASES_LAYOUT);
        expect(result).toEqual({ success: false, error: '未登入' });
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('非法輸入被 Zod 擋下，不呼叫資料庫', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

        const result = await updateCasesLayout([{ id: 'not-a-real-widget', visible: true, order: 0 }] as never);

        expect(result.success).toBe(false);
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('合法輸入寫入成功', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
        const upsertBuilder = makeUpsertBuilder(null);
        mockFrom.mockReturnValue(upsertBuilder);

        const result = await updateCasesLayout(DEFAULT_CASES_LAYOUT);
        expect(result).toEqual({ success: true });
        expect(upsertBuilder.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ user_id: 'u1', cases_layout: DEFAULT_CASES_LAYOUT }),
            expect.objectContaining({ onConflict: 'user_id' })
        );
    });

    it('資料庫寫入失敗時回傳錯誤訊息', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
        mockFrom.mockReturnValue(makeUpsertBuilder({ message: 'RLS denied' }));

        const result = await updateCasesLayout(DEFAULT_CASES_LAYOUT);
        expect(result).toEqual({ success: false, error: 'RLS denied' });
    });
});
