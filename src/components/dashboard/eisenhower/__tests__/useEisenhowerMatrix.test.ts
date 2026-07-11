import { renderHook, act, waitFor } from '@testing-library/react';
import { useEisenhowerMatrix } from '../useEisenhowerMatrix';
import { DEFAULT_ZONES, MAX_ZONES } from '../types';

const mockCases = [
    { id: 'A', case_number: 'C-A', buyer_name: '王小明', seller_name: '陳大文', status: 'Processing' },
    { id: 'E', case_number: 'C-E', buyer_name: '林美麗', seller_name: '', status: 'Processing' },
];

// thenable query builder：await 時解析為 { data, error }
function createQueryBuilder() {
    const builder = {
        select: jest.fn(),
        neq: jest.fn(),
        then: (resolve: (value: { data: typeof mockCases; error: null }) => unknown) =>
            resolve({ data: mockCases, error: null }),
    };
    builder.select.mockReturnValue(builder);
    builder.neq.mockReturnValue(builder);
    return builder;
}

jest.mock('@/lib/supabase/client', () => ({
    createClient: () => ({ from: () => createQueryBuilder() }),
}));

const mockGetMatrix = jest.fn();
const mockSaveMatrix = jest.fn();
jest.mock('@/app/actions/eisenhowerActions', () => ({
    getEisenhowerMatrix: (...args: unknown[]) => mockGetMatrix(...args),
    saveEisenhowerMatrix: (...args: unknown[]) => mockSaveMatrix(...args),
}));

const mockNotifyError = jest.fn();
jest.mock('@/hooks/useNotification', () => ({
    useNotification: () => ({ error: mockNotifyError, success: jest.fn() }),
}));

describe('useEisenhowerMatrix', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockGetMatrix.mockResolvedValue({ zones: DEFAULT_ZONES, placements: {} });
        mockSaveMatrix.mockResolvedValue({ success: true });
    });

    it('載入時清理失效 placements（案件 B 不存在、zone z999 不存在）', async () => {
        mockGetMatrix.mockResolvedValue({
            zones: DEFAULT_ZONES,
            placements: { A: ['q1', 'z999'], B: ['q4'] },
        });

        const { result } = renderHook(() => useEisenhowerMatrix());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.matrix.placements).toEqual({ A: ['q1'] });
        expect(result.current.chips.map((c) => c.key)).toEqual(['A', 'E']);
    });

    it('moveChip 搬家語意：q1+q3 拖 q1→q2 得 q2+q3（spec Scenario）並防抖保存', async () => {
        mockGetMatrix.mockResolvedValue({
            zones: DEFAULT_ZONES,
            placements: { A: ['q1', 'q3'] },
        });

        const { result } = renderHook(() => useEisenhowerMatrix());
        await waitFor(() => expect(result.current.loading).toBe(false));

        jest.useFakeTimers();
        act(() => result.current.moveChip('A', 'q1', 'q2'));

        // 樂觀更新：立即反映，未保存
        expect(result.current.matrix.placements['A']).toEqual(['q3', 'q2']);
        expect(mockSaveMatrix).not.toHaveBeenCalled();

        await act(async () => {
            jest.advanceTimersByTime(800);
        });
        jest.useRealTimers();

        await waitFor(() => expect(mockSaveMatrix).toHaveBeenCalledTimes(1));
        expect(mockSaveMatrix).toHaveBeenCalledWith(
            expect.objectContaining({ placements: expect.objectContaining({ A: ['q3', 'q2'] }) })
        );
    });

    it('拖回待分類僅移出來源格；最後一格移出即回待分類', async () => {
        mockGetMatrix.mockResolvedValue({
            zones: DEFAULT_ZONES,
            placements: { A: ['q1', 'q3'], E: ['q2'] },
        });

        const { result } = renderHook(() => useEisenhowerMatrix());
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => result.current.moveChip('A', 'q1', null));
        expect(result.current.matrix.placements['A']).toEqual(['q3']);
        expect(result.current.unclassifiedChips.map((c) => c.key)).toEqual([]);

        // spec Scenario: removing the last membership returns the chip to staging
        act(() => result.current.toggleZone('E', 'q2'));
        expect(result.current.matrix.placements['E']).toBeUndefined();
        expect(result.current.unclassifiedChips.map((c) => c.key)).toEqual(['E']);
    });

    it('toggleZone 多選：勾 q1/q2/q3 後同卡屬三格；clearZones 全部清空', async () => {
        const { result } = renderHook(() => useEisenhowerMatrix());
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.toggleZone('A', 'q1');
            result.current.toggleZone('A', 'q2');
            result.current.toggleZone('A', 'q3');
        });
        expect(result.current.matrix.placements['A']).toEqual(['q1', 'q2', 'q3']);
        expect(result.current.chipsInZone('q1').map((c) => c.key)).toEqual(['A']);
        expect(result.current.chipsInZone('q3').map((c) => c.key)).toEqual(['A']);

        act(() => result.current.clearZones('A'));
        expect(result.current.matrix.placements['A']).toBeUndefined();
    });

    it('保存失敗時名片停留原位並顯示錯誤通知', async () => {
        mockSaveMatrix.mockResolvedValue({ success: false, error: 'RLS denied' });

        const { result } = renderHook(() => useEisenhowerMatrix());
        await waitFor(() => expect(result.current.loading).toBe(false));

        jest.useFakeTimers();
        act(() => result.current.moveChip('A', null, 'q3'));
        await act(async () => {
            jest.advanceTimersByTime(800);
        });
        jest.useRealTimers();

        await waitFor(() => expect(mockNotifyError).toHaveBeenCalled());
        // 樂觀位置不回滾
        expect(result.current.matrix.placements['A']).toEqual(['q3']);
    });

    it('renameZone 空字串回 fallback 標題', async () => {
        mockGetMatrix.mockResolvedValue({
            zones: [{ id: 'q1', label: '今天必聯絡' }, ...DEFAULT_ZONES.slice(1)],
            placements: {},
        });

        const { result } = renderHook(() => useEisenhowerMatrix());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.matrix.zones[0].label).toBe('今天必聯絡');

        act(() => result.current.renameZone('q1', '   '));
        expect(result.current.matrix.zones[0].label).toBe('重要且緊急');
    });

    it('addZone 新增「新象限」且達 MAX_ZONES 後拒絕', async () => {
        const { result } = renderHook(() => useEisenhowerMatrix());
        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => result.current.addZone());
        expect(result.current.matrix.zones).toHaveLength(5);
        expect(result.current.matrix.zones[4].label).toBe('新象限');

        act(() => {
            for (let i = 0; i < 10; i += 1) result.current.addZone();
        });
        expect(result.current.matrix.zones).toHaveLength(MAX_ZONES);
    });

    it('removeZone 移除象限並讓該格名片退回待分類；剩 MIN_ZONES 時拒絕', async () => {
        mockGetMatrix.mockResolvedValue({
            zones: DEFAULT_ZONES,
            placements: { A: ['q4'] },
        });

        const { result } = renderHook(() => useEisenhowerMatrix());
        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.unclassifiedChips.map((c) => c.key)).toEqual(['E']);

        act(() => result.current.removeZone('q4'));
        expect(result.current.matrix.zones.map((z) => z.id)).toEqual(['q1', 'q2', 'q3']);
        expect(result.current.matrix.placements['A']).toBeUndefined();
        expect(result.current.unclassifiedChips.map((c) => c.key)).toEqual(['A', 'E']);

        act(() => {
            result.current.removeZone('q3');
            result.current.removeZone('q2'); // 此時剩 2 格，應被拒絕
        });
        expect(result.current.matrix.zones).toHaveLength(2);
    });
});
