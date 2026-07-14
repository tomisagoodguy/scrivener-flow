import { renderHook, act, waitFor } from '@testing-library/react';
import { useCasesLayout } from '../useCasesLayout';
import { DEFAULT_CASES_LAYOUT } from '@/domain/cases/layoutTypes';

const mockGetLayout = jest.fn();
const mockUpdateLayout = jest.fn();
jest.mock('@/app/actions/casesLayout', () => ({
    getCasesLayout: (...args: unknown[]) => mockGetLayout(...args),
    updateCasesLayout: (...args: unknown[]) => mockUpdateLayout(...args),
}));

const mockNotifyError = jest.fn();
jest.mock('@/hooks/useNotification', () => ({
    useNotification: () => ({ error: mockNotifyError, success: jest.fn() }),
}));

describe('useCasesLayout', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetLayout.mockResolvedValue(DEFAULT_CASES_LAYOUT);
        mockUpdateLayout.mockResolvedValue({ success: true });
    });

    it('初次載入呼叫 getCasesLayout 並回傳其結果', async () => {
        const { result } = renderHook(() => useCasesLayout());

        expect(result.current.isLoading).toBe(true);
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        expect(result.current.layout).toEqual(DEFAULT_CASES_LAYOUT);
    });

    it('hideWidget 樂觀地把該 widget 設為不可見並呼叫 updateCasesLayout', async () => {
        const { result } = renderHook(() => useCasesLayout());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.hideWidget('quick-navigator'));

        expect(result.current.layout.find((w) => w.id === 'quick-navigator')?.visible).toBe(false);

        await waitFor(() => expect(mockUpdateLayout).toHaveBeenCalledTimes(1));
        const savedLayout = mockUpdateLayout.mock.calls[0][0];
        expect(savedLayout.find((w: { id: string }) => w.id === 'quick-navigator').visible).toBe(false);
    });

    it('showWidget 把 widget 設回可見並插入到目前最大 order 之後', async () => {
        mockGetLayout.mockResolvedValue([
            { id: 'export-buttons', visible: true, order: 0 },
            { id: 'quick-navigator', visible: false, order: 1 },
            { id: 'eisenhower-matrix', visible: true, order: 2 },
        ]);

        const { result } = renderHook(() => useCasesLayout());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.showWidget('quick-navigator'));

        const widget = result.current.layout.find((w) => w.id === 'quick-navigator')!;
        expect(widget.visible).toBe(true);
        expect(widget.order).toBe(3);
    });

    it('reorderWidgets 依傳入的新順序重新指派可見區塊的 order，隱藏區塊維持不變', async () => {
        mockGetLayout.mockResolvedValue([
            { id: 'export-buttons', visible: true, order: 0 },
            { id: 'rapid-input', visible: true, order: 1 },
            { id: 'eisenhower-matrix', visible: true, order: 2 },
            { id: 'pipeline-chart', visible: false, order: 3 },
        ]);

        const { result } = renderHook(() => useCasesLayout());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.reorderWidgets(['eisenhower-matrix', 'export-buttons', 'rapid-input']));

        const visibleInOrder = result.current.layout
            .filter((w) => w.visible)
            .sort((a, b) => a.order - b.order)
            .map((w) => w.id);
        expect(visibleInOrder).toEqual(['eisenhower-matrix', 'export-buttons', 'rapid-input']);

        const hidden = result.current.layout.find((w) => w.id === 'pipeline-chart')!;
        expect(hidden.visible).toBe(false);
    });

    it('儲存失敗時回滾至上一狀態並顯示錯誤通知', async () => {
        mockUpdateLayout.mockResolvedValue({ success: false, error: 'RLS denied' });

        const { result } = renderHook(() => useCasesLayout());
        await waitFor(() => expect(result.current.isLoading).toBe(false));

        act(() => result.current.hideWidget('quick-navigator'));

        await waitFor(() => expect(mockNotifyError).toHaveBeenCalled());
        expect(result.current.layout.find((w) => w.id === 'quick-navigator')?.visible).toBe(true);
    });
});
