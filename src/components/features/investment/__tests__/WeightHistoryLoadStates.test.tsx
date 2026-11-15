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
jest.mock('@/lib/supabase/client', () => ({
    createClient: () => ({
        from: () => {
            const b = { select: () => b, eq: () => b, gte: () => b, order: async () => ({ data: [], error: null }) };
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
