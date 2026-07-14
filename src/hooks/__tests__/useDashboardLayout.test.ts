import { renderHook, act, waitFor } from '@testing-library/react';
import { useDashboardLayout } from '../useDashboardLayout';
import { DEFAULT_DASHBOARD_LAYOUT } from '@/domain/dashboard/layoutTypes';

const mockGetLayout = jest.fn();
const mockUpdateLayout = jest.fn();
jest.mock('@/app/actions/dashboardLayout', () => ({
    getDashboardLayout: (...args: unknown[]) => mockGetLayout(...args),
    updateDashboardLayout: (...args: unknown[]) => mockUpdateLayout(...args),
}));

const mockNotifyError = jest.fn();
jest.mock('@/hooks/useNotification', () => ({
    useNotification: () => ({ error: mockNotifyError, success: jest.fn() }),
}));

describe('useDashboardLayout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetLayout.mockResolvedValue(DEFAULT_DASHBOARD_LAYOUT);
        mockUpdateLayout.mockResolvedValue({ success: true });
    });

    it('初次載入呼叫 getDashboardLayout 並回傳其結果', async () => {
        const { result } = renderHook(() => useDashboardLayout());

        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.layout).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    });

    it('hideWidget 樂觀地把該 widget 設為不可見並呼叫 updateDashboardLayout', async () => {
        const { result } = renderHook(() => useDashboardLayout());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.hideWidget('pipeline-view'));

        // 樂觀更新：立即反映
        expect(result.current.layout.find((w) => w.id === 'pipeline-view')?.visible).toBe(false);

        await waitFor(() => expect(mockUpdateLayout).toHaveBeenCalledTimes(1));
        const savedLayout = mockUpdateLayout.mock.calls[0][0];
        expect(savedLayout.find((w: { id: string }) => w.id === 'pipeline-view').visible).toBe(false);
    });

    it('showWidget 把 widget 設回可見並插入到目前最大 order 之後', async () => {
        mockGetLayout.mockResolvedValue([
            { id: 'welcome-header', visible: true, order: 0 },
            { id: 'pipeline-view', visible: false, order: 1 },
            { id: 'todo-container', visible: true, order: 2 },
        ]);

        const { result } = renderHook(() => useDashboardLayout());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.showWidget('pipeline-view'));

        const widget = result.current.layout.find((w) => w.id === 'pipeline-view')!;
        expect(widget.visible).toBe(true);
        expect(widget.order).toBe(3);
    });

    it('reorderWidgets 依傳入的新順序重新指派可見區塊的 order，隱藏區塊維持不變', async () => {
        mockGetLayout.mockResolvedValue([
            { id: 'welcome-header', visible: true, order: 0 },
            { id: 'pipeline-view', visible: true, order: 1 },
            { id: 'eisenhower-matrix', visible: true, order: 2 },
            { id: 'todo-container', visible: false, order: 3 },
        ]);

        const { result } = renderHook(() => useDashboardLayout());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() =>
            result.current.reorderWidgets(['eisenhower-matrix', 'welcome-header', 'pipeline-view'])
        );

        const visibleInOrder = result.current.layout
            .filter((w) => w.visible)
            .sort((a, b) => a.order - b.order)
            .map((w) => w.id);
        expect(visibleInOrder).toEqual(['eisenhower-matrix', 'welcome-header', 'pipeline-view']);

        const hidden = result.current.layout.find((w) => w.id === 'todo-container')!;
        expect(hidden.visible).toBe(false);
    });

    it('儲存失敗時回滾至上一狀態並顯示錯誤通知', async () => {
        mockUpdateLayout.mockResolvedValue({ success: false, error: 'RLS denied' });

        const { result } = renderHook(() => useDashboardLayout());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.hideWidget('pipeline-view'));

        await waitFor(() => expect(mockNotifyError).toHaveBeenCalled());
        expect(result.current.layout.find((w) => w.id === 'pipeline-view')?.visible).toBe(true);
    });
});
