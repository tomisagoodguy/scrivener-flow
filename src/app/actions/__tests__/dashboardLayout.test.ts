/**
 * Tests for dashboardLayout server action.
 *
 * 涵蓋：
 *  1. getDashboardLayout()：未登入 / 無資料 / schema 驗證失敗 一律回傳 DEFAULT_DASHBOARD_LAYOUT
 *  2. getDashboardLayout()：新 widget id 缺席時 union merge 補上（New Widget Migration for Existing Layouts）
 *  3. updateDashboardLayout()：合法輸入寫入成功、非法輸入被 Zod 擋下不寫入、未登入拒絕
 */

const mockGetUser = jest.fn();
const mockFrom = jest.fn();
jest.mock('@/lib/supabase/server', () => ({
    createClient: async () => ({
        auth: { getUser: mockGetUser },
        from: mockFrom,
    }),
}));

import { getDashboardLayout, updateDashboardLayout } from '../dashboardLayout';
import { DEFAULT_DASHBOARD_LAYOUT } from '@/domain/dashboard/layoutTypes';

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

describe('getDashboardLayout', () => {
    beforeEach(() => jest.clearAllMocks());

    it('未登入時回傳 DEFAULT_DASHBOARD_LAYOUT', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const result = await getDashboardLayout();
        expect(result).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    });

    it('已登入但尚無 dashboard_layout 資料時回傳 DEFAULT_DASHBOARD_LAYOUT', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
        mockFrom.mockReturnValue(makeSelectBuilder({ dashboard_layout: null }));

        const result = await getDashboardLayout();
        expect(result).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    });

    it('儲存的 dashboard_layout 不符合 schema 時回傳 DEFAULT_DASHBOARD_LAYOUT', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
        mockFrom.mockReturnValue(
            makeSelectBuilder({ dashboard_layout: [{ id: 'pipeline-view', visible: 'yes', order: 0 }] })
        );

        const result = await getDashboardLayout();
        expect(result).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    });

    it('儲存的版面缺少新 widget id 時，union merge 補上並接在最大 order 之後', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
        mockFrom.mockReturnValue(
            makeSelectBuilder({
                dashboard_layout: [
                    { id: 'welcome-header', visible: true, order: 0 },
                    { id: 'todo-container', visible: false, order: 1 },
                ],
            })
        );

        const result = await getDashboardLayout();
        const ids = result.map((w) => w.id);
        expect(ids).toEqual(
            expect.arrayContaining([
                'welcome-header',
                'todo-container',
                'ai-work-assistant',
                'urgent-alerts-tax-watch',
                'pipeline-view',
                'eisenhower-matrix',
            ])
        );
        // 既有項目維持原值
        const todo = result.find((w) => w.id === 'todo-container')!;
        expect(todo.visible).toBe(false);
        expect(todo.order).toBe(1);
        // 新補上的項目接在最大 order (1) 之後、皆為可見
        const missing = result.filter((w) => !['welcome-header', 'todo-container'].includes(w.id));
        expect(missing.every((w) => w.visible)).toBe(true);
        expect(missing.every((w) => w.order > 1)).toBe(true);
    });
});

describe('updateDashboardLayout', () => {
    beforeEach(() => jest.clearAllMocks());

    it('未登入時拒絕寫入', async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const result = await updateDashboardLayout(DEFAULT_DASHBOARD_LAYOUT);
        expect(result).toEqual({ success: false, error: '未登入' });
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('非法輸入被 Zod 擋下，不呼叫資料庫', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

        const result = await updateDashboardLayout([
            { id: 'not-a-real-widget', visible: true, order: 0 },
        ] as never);

        expect(result.success).toBe(false);
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it('合法輸入寫入成功', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
        const upsertBuilder = makeUpsertBuilder(null);
        mockFrom.mockReturnValue(upsertBuilder);

        const result = await updateDashboardLayout(DEFAULT_DASHBOARD_LAYOUT);
        expect(result).toEqual({ success: true });
        expect(upsertBuilder.upsert).toHaveBeenCalledWith(
            expect.objectContaining({ user_id: 'u1', dashboard_layout: DEFAULT_DASHBOARD_LAYOUT }),
            expect.objectContaining({ onConflict: 'user_id' })
        );
    });

    it('資料庫寫入失敗時回傳錯誤訊息', async () => {
        mockGetUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
        mockFrom.mockReturnValue(makeUpsertBuilder({ message: 'RLS denied' }));

        const result = await updateDashboardLayout(DEFAULT_DASHBOARD_LAYOUT);
        expect(result).toEqual({ success: false, error: 'RLS denied' });
    });
});
