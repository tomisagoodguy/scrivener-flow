/**
 * 持股比重歷史的載入失敗必須顯示錯誤訊息，不可呈現為空圖表（spec: Load failure is visible）。
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

jest.mock('recharts', () => {
    const Stub = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
    return {
        ResponsiveContainer: Stub, LineChart: Stub, Line: Stub, XAxis: Stub, YAxis: Stub,
        CartesianGrid: Stub, Tooltip: Stub, Legend: Stub,
    };
});
/** 股價查詢的呼叫紀錄與回應（jest.mock 工廠只能引用 mock 前綴變數） */
const mockPriceCalls: Array<[string, unknown]> = [];
const mockPrice: { response: { data: unknown[] | null; error: { message: string } | null } } = {
    response: { data: [], error: null },
};
jest.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: (table: string) => {
            mockPriceCalls.push(['from', table]);
            const b = {
                select: (cols: string) => (mockPriceCalls.push(['select', cols]), b),
                eq: (col: string) => (mockPriceCalls.push(['eq', col]), b),
                gte: (col: string) => (mockPriceCalls.push(['gte', col]), b),
                order: async (col: string) => (mockPriceCalls.push(['order', col]), mockPrice.response),
            };
            return b;
        },
    }),
}));
jest.mock('@/lib/investment/weightHistoryData', () => ({ fetchWeightHistory: jest.fn() }));

import { fetchWeightHistory } from '@/lib/investment/weightHistoryData';
import { HoldingsPriceOverlayChart } from '../HoldingsPriceOverlayChart';
import { EtfRankingHistoryChart } from '../EtfRankingHistoryChart';
import { StockWeightCrossEtfChart } from '../StockWeightCrossEtfChart';
import type { EtfRegistryEntry } from '@/lib/investment/etfRegistry';

const registry = [{ code: '00981A', shortCode: '00981', name: 'n', manager: 'm', issuer: 'i', color: '#8b5cf6' }] as EtfRegistryEntry[];

describe('HoldingsPriceOverlayChart', () => {
    beforeEach(() => {
        mockPriceCalls.length = 0;
        mockPrice.response = { data: [], error: null };
    });

    it('reads stock_prices_daily by data_date and draws one price point per row (spec Example)', async () => {
        (fetchWeightHistory as jest.Mock).mockResolvedValue([
            { etf_code: '00981A', data_date: '2026-11-12', weight: 9.1 },
            { etf_code: '00981A', data_date: '2026-11-13', weight: 9.5 },
        ]);
        mockPrice.response = {
            data: [
                { data_date: '2026-11-12', close: 1450 },
                { data_date: '2026-11-13', close: 1465 },
            ],
            error: null,
        };
        const { container } = render(<HoldingsPriceOverlayChart stockCode="2330" etfCodes={['00981A']} etfColors={{}} />);

        // 價格線：兩個日期 → x 0 與 600；1450 為最低（y=120）、1465 為最高（y=0）
        await waitFor(() =>
            expect(container.querySelector('path[stroke-dasharray="4 2"]')?.getAttribute('d')).toBe('M 0 120 L 600 0'),
        );
        expect(mockPriceCalls).toContainEqual(['from', 'stock_prices_daily']);
        const select = mockPriceCalls.find(c => c[0] === 'select')?.[1] as string;
        expect(select.split(',').map(s => s.trim())).toEqual(['data_date', 'close']);
        expect(mockPriceCalls).toContainEqual(['gte', 'data_date']);
        expect(mockPriceCalls).toContainEqual(['order', 'data_date']);
    });

    it('shows the price query error instead of a chart without the price line', async () => {
        (fetchWeightHistory as jest.Mock).mockResolvedValue([
            { etf_code: '00981A', data_date: '2026-11-13', weight: 9.5 },
        ]);
        mockPrice.response = { data: null, error: { message: 'column stock_prices_daily.date does not exist' } };
        const { container } = render(<HoldingsPriceOverlayChart stockCode="2330" etfCodes={['00981A']} etfColors={{}} />);

        await waitFor(() =>
            expect(screen.getByText(/column stock_prices_daily\.date does not exist/)).toBeInTheDocument(),
        );
        expect(container.querySelector('svg')).toBeNull();
    });

    it('shows the error message when the weight history read fails', async () => {
        (fetchWeightHistory as jest.Mock).mockRejectedValue(new Error('etf_weight_history: timeout'));
        render(<HoldingsPriceOverlayChart stockCode="2330" etfCodes={['00981A']} etfColors={{}} />);
        await waitFor(() => expect(screen.getByText(/比重歷史載入失敗：etf_weight_history: timeout/)).toBeInTheDocument());
        expect(screen.queryByText('暫無圖表資料')).not.toBeInTheDocument();
    });
});

describe.each([
    ['EtfRankingHistoryChart', (p: { loading: boolean; error: string | null; onSelectionChange: jest.Mock }) =>
        <EtfRankingHistoryChart weightHistory={[]} etfRegistry={registry} {...p} />, '00981A'],
    ['StockWeightCrossEtfChart', (p: { loading: boolean; error: string | null; onSelectionChange: jest.Mock }) =>
        <StockWeightCrossEtfChart weightHistory={[]} stockList={[{ code: '2330', name: '台積電' }]} etfRegistry={registry} {...p} />, '2330'],
])('%s', (_name, renderChart, initialCode) => {
    it('notifies the initial selection on mount', () => {
        const onSelectionChange = jest.fn();
        render(renderChart({ loading: false, error: null, onSelectionChange }));
        expect(onSelectionChange).toHaveBeenCalledWith(initialCode);
    });

    it('shows a loading state instead of "no data" while loading', () => {
        render(renderChart({ loading: true, error: null, onSelectionChange: jest.fn() }));
        expect(screen.getByText(new RegExp(`載入 ${initialCode} 歷史中`))).toBeInTheDocument();
        expect(screen.queryByText(/無歷史資料|尚無歷史資料/)).not.toBeInTheDocument();
    });

    it('shows the error message instead of an empty chart when loading fails', () => {
        render(renderChart({ loading: false, error: 'boom', onSelectionChange: jest.fn() }));
        expect(screen.getByText(new RegExp(`${initialCode} 歷史載入失敗：boom`))).toBeInTheDocument();
        expect(screen.queryByText(/無歷史資料|尚無歷史資料/)).not.toBeInTheDocument();
    });
});
