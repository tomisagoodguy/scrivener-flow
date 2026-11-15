import { act, renderHook } from '@testing-library/react';
import { useOnDemandWeightHistory } from '../useOnDemandWeightHistory';
import type { WeightHistoryRow } from '@/app/investment/history/page';

function row(code: string, date = '2026-11-13'): WeightHistoryRow {
    return { etf_code: code, stock_code: '2330', stock_name: '台積電', data_date: date, weight: 9, rank: 1 };
}

/** 可手動決定成功/失敗時機的 loader */
function controlledLoader() {
    const calls: Array<{ code: string; resolve: (r: WeightHistoryRow[]) => void; reject: (e: Error) => void }> = [];
    const loader = jest.fn(
        (code: string) =>
            new Promise<WeightHistoryRow[]>((resolve, reject) => {
                calls.push({ code, resolve, reject });
            }),
    );
    return { loader, calls };
}

describe('useOnDemandWeightHistory', () => {
    it('shows loading, then the loaded rows', async () => {
        const { loader, calls } = controlledLoader();
        const { result } = renderHook(() => useOnDemandWeightHistory(loader));

        act(() => result.current.select('00981A'));
        expect(result.current).toMatchObject({ code: '00981A', loading: true, error: null, rows: [] });

        await act(async () => calls[0].resolve([row('00981A')]));
        expect(result.current).toMatchObject({ code: '00981A', loading: false, error: null, rows: [row('00981A')] });
    });

    it('shows the error message when loading fails, and retries on reselect', async () => {
        const { loader, calls } = controlledLoader();
        const { result } = renderHook(() => useOnDemandWeightHistory(loader));

        act(() => result.current.select('00981A'));
        await act(async () => calls[0].reject(new Error('etf_weight_history: timeout')));
        expect(result.current).toMatchObject({ loading: false, rows: [], error: 'etf_weight_history: timeout' });

        act(() => result.current.select('00981A'));
        expect(loader).toHaveBeenCalledTimes(2);
        await act(async () => calls[1].resolve([row('00981A')]));
        expect(result.current).toMatchObject({ loading: false, error: null, rows: [row('00981A')] });
    });

    it('does not refetch a code that is already loaded', async () => {
        const { loader, calls } = controlledLoader();
        const { result } = renderHook(() => useOnDemandWeightHistory(loader));

        act(() => result.current.select('A'));
        await act(async () => calls[0].resolve([row('A')]));
        act(() => result.current.select('B'));
        await act(async () => calls[1].resolve([row('B')]));
        act(() => result.current.select('A'));

        expect(loader).toHaveBeenCalledTimes(2);
        expect(result.current).toMatchObject({ code: 'A', loading: false, rows: [row('A')] });
    });

    it('ignores a stale response for a code that is no longer selected', async () => {
        const { loader, calls } = controlledLoader();
        const { result } = renderHook(() => useOnDemandWeightHistory(loader));

        act(() => result.current.select('A'));
        act(() => result.current.select('B'));
        await act(async () => calls[0].resolve([row('A')]));
        expect(result.current).toMatchObject({ code: 'B', loading: true, rows: [] });

        await act(async () => calls[1].resolve([row('B')]));
        expect(result.current).toMatchObject({ code: 'B', loading: false, rows: [row('B')] });
    });

    it('A → B → A while A is in flight reuses the single A request (no error overriding success)', async () => {
        const { loader, calls } = controlledLoader();
        const { result } = renderHook(() => useOnDemandWeightHistory(loader));

        act(() => result.current.select('A'));
        act(() => result.current.select('B'));
        act(() => result.current.select('A'));
        expect(loader.mock.calls.map(c => c[0])).toEqual(['A', 'B']);

        await act(async () => calls[0].resolve([row('A')]));
        expect(result.current).toMatchObject({ code: 'A', loading: false, error: null, rows: [row('A')] });
    });
});
